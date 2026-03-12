const express = require('express');
const router = express.Router();

require("../config/db");
const auth = require('../config/auth');
const multer = require('multer');
const bcrypt = require("bcryptjs");
const Customer = require("../models/customers");

const Product = require('../models/products');
const Member = require('../models/members');
const Sale = require('../models/sales');
const memberController = require('../controllers/memberController');
const title = "Dome Noir POS";



/* ======================
   Upload Image
====================== */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/images/products');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + ".jpg");
    }
});
const upload = multer({ storage });

/* ======================
   HOME
====================== */
router.get("/", auth.isLogin, async (req, res) => {
    const products = await Product.find();

    // Calculate Dynamic Popular Menu (Top 10)
    const popularProducts = await Sale.aggregate([
        { $unwind: "$items" },
        { $group: { _id: "$items.product", count: { $sum: "$items.quantity" } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);
    const popularIds = popularProducts.map(p => p._id ? p._id.toString() : "");

    res.render("index", { products, popularIds, title });
});

/* ======================
   PRODUCT MANAGEMENT
====================== */

router.get('/addForm', auth.isAdmin, (req, res) => {
    res.render('form', { title: "เพิ่มเมนูเครื่องดื่ม" });
});

router.get('/manage', auth.isAdmin, async (req, res) => {
    const products = await Product.find();
    res.render("manage", { products, title: "จัดการเมนู" });
});

router.post('/insert', auth.isAdmin, upload.single("image"), async (req, res) => {

    const newProduct = new Product({
        name: req.body.name,
        price: req.body.price,
        category: req.body.category,
        image: req.file ? req.file.filename : "default.jpg"
    });

    await newProduct.save();
    res.redirect('/manage');
});

router.get('/delete/:id', auth.isAdmin, async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/manage');
});

router.post('/edit', auth.isAdmin, async (req, res) => {
    const product = await Product.findById(req.body.id);
    res.render('formedit', { product, title: "แก้ไขเมนู" });
});

router.post('/update', auth.isAdmin, upload.single("image"), async (req, res) => {

    const data = {
        name: req.body.name,
        price: req.body.price,
        category: req.body.category
    };

    if (req.file) data.image = req.file.filename;

    await Product.findByIdAndUpdate(req.body.id, data);
    res.redirect('/manage');
});

/* ======================
   PRODUCT DETAIL
====================== */
router.get('/product/:id', async (req, res) => {
    const product = await Product.findById(req.params.id);
    res.render("product", { product, title: "รายละเอียดเมนู" });
});

/* ======================
   SALES (POS)
====================== */

/* ======================
   REGISTER
====================== */

router.get("/register", auth.isAdmin, (req, res) => {
    res.render("register/regisindex");
});

router.post("/register", auth.isAdmin, async (req, res) => {

    const { name, email, phone, password, confirmPassword } = req.body;

    if (password !== confirmPassword)
        return res.render("register/regisindex", { error: "Password ไม่ตรงกัน" });

    if (await Member.findOne({ email }))
        return res.render("register/regisindex", { error: "Email ถูกใช้งานแล้ว" });

    const hashedPassword = await bcrypt.hash(password, 10);

    await new Member({
        name,
        email,
        phone,
        password: hashedPassword,
        role: "employee"
    }).save();

    res.redirect("/login");
});

/* ======================
   LOGIN
====================== */

router.get("/login", (req, res) => {
    res.render("login", { message: req.session.message || null });
    req.session.message = null;
});

router.post("/login", async (req, res) => {

    const { email, password } = req.body;

    const user = await Member.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        req.session.message = "Email หรือ Password ไม่ถูกต้อง";
        return res.redirect("/login");
    }

    req.session.user = user;
    res.redirect("/");
});

router.get("/dashboard", auth.isLogin, async (req, res) => {

    try {
        // วันนี้ (เริ่มเที่ยงคืน)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // วันนี้เมื่อ 7 วันก่อน
        const past7Days = new Date();
        past7Days.setDate(today.getDate() - 6);
        past7Days.setHours(0, 0, 0, 0);

        // 1) สรุปยอดขายวันนี้ & จำนวนออเดอร์ & จำนวนลูกค้า
        const todaySales = await Sale.aggregate([
            { $match: { date: { $gte: today } } },
            { 
                $group: {
                    _id: null,
                    total: { $sum: "$totalPrice" },
                    count: { $sum: 1 },
                    customers: { $addToSet: "$member" }
                }
            }
        ]);

        const summary = {
            total: todaySales.length > 0 ? todaySales[0].total : 0,
            count: todaySales.length > 0 ? todaySales[0].count : 0,
            distinctCustomers: todaySales.length > 0 ? (todaySales[0].customers.filter(c => c !== null).length) : 0
        };

        // 2) กราฟยอดขาย 7 วันล่าสุด (Sales Graph)
        const chartData = await Sale.aggregate([
            { $match: { date: { $gte: past7Days } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: "+07:00" }
                    },
                    total: { $sum: "$totalPrice" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // จัดการชุดข้อมูลให้ครบ 7 วัน (เผื่อบางวันขายไม่ได้เลย)
        let labels = [];
        let dataIndex = [];
        for(let i=6; i>=0; i--) {
            let d = new Date();
            d.setDate(d.getDate() - i);
            let dateStr = d.toISOString().split('T')[0];
            labels.push(dateStr);
            
            let found = chartData.find(x => x._id === dateStr);
            dataIndex.push(found ? found.total : 0);
        }

        // 3) รายการขายล่าสุด 5 รายการ
        const recentSales = await Sale.find()
            .populate("member")
            .sort({ date: -1 })
            .limit(5);

        // 4) สินค้าขายดี (Top 5 Products)
        const topProducts = await Sale.aggregate([
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productName",
                    qty: { $sum: "$items.quantity" },
                    revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
                }
            },
            { $sort: { qty: -1 } },
            { $limit: 5 }
        ]);

        res.render("dashboard", {
            title: "Dashboard ร้านกาแฟ",
            user: req.session.user,
            summary,
            chartLabels: JSON.stringify(labels),
            chartData: JSON.stringify(dataIndex),
            recentSales,
            topProducts
        });

    } catch (err) {
        console.error("Dashboard Error:", err);
        res.send("Dashboard Error");
    }

});

router.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
});


module.exports = router;