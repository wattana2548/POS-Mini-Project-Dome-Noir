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


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/images/products');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + ".jpg");
    }
});
const upload = multer({ storage });

router.get("/", auth.isLogin, async (req, res) => {
   
    const products = await Product.find();

    const popularProducts = await Sale.aggregate([
        { $unwind: "$items" },
        { $group: { _id: "$items.product", count: { $sum: "$items.quantity" } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);
    const popularIds = popularProducts.map(p => p._id ? p._id.toString() : "");

    
    res.render("index", { products, popularIds, title });
});

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
        status: req.body.status || "พร้อมขาย",
        image: req.file ? req.file.filename : "default.jpg" // ถ้าไม่มีรูปให้ใช้ default
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
        category: req.body.category,
        status: req.body.status
    };

    
    if (req.file) data.image = req.file.filename;

    await Product.findByIdAndUpdate(req.body.id, data);
    res.redirect('/manage');
});


router.get('/product/:id', async (req, res) => {
    const product = await Product.findById(req.params.id);
    res.render("product", { product, title: "รายละเอียดเมนู" });
});


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



router.get("/login", (req, res) => {
    res.render("login", { message: req.session.message || null });
    req.session.message = null;
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await Member.findOne({ email });

    // ตรวจสอบความถูกต้องของ User และ Password (เปรียบเทียบ Hash)
    if (!user || !(await bcrypt.compare(password, user.password))) {
        req.session.message = "Email หรือ Password ไม่ถูกต้อง";
        return res.redirect("/login");
    }

    // เก็บข้อมูล User ลงใน Session เพื่อใช้ใน Middleware
    req.session.user = user;
    res.redirect("/");
});


router.get("/dashboard", auth.isAdmin, async (req, res) => {
    try {
        // 1. ส่วนการจัดการช่วงเวลา (Range Selector): รับค่าจำนวนวันย้อนหลังจาก URL (Query String)
        const range = parseInt(req.query.range) || 7; 
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); // ตั้งเวลาเป็นต้นวัน (00:00:00) เพื่อเริ่มนับข้อมูลของวันนี้

        const pastDate = new Date();
        pastDate.setDate(today.getDate() - (range - 1));
        pastDate.setHours(0, 0, 0, 0);

        // 2. สรุปยอดขายเฉพาะของ "วันนี้" (Summary Today): ใช้ Aggregate เพื่อคำนวณค่าหลายอย่างพร้อมกัน
        const todaySales = await Sale.aggregate([
            { $match: { date: { $gte: today } } }, // กรองเฉพาะออเดอร์ที่มีพ้นที่ตั้งแต่ต้นวันเป็นต้นไป
            { 
                $group: {
                    _id: null,
                    total: { $sum: "$totalPrice" }, // รวมผลรวมรายได้ทั้งหมดของวันนี้
                    count: { $sum: 1 }, // นับจำนวนรายการออเดอร์ที่เกิดขึ้น
                    customers: { $addToSet: "$member" } // เก็บไอดีลูกค้าแบบไม่ซ้ำ (Unique) เพื่อดูจำนวนลูกค้าที่มาใช้บริการ
                }
            }
        ]);

        const summary = {
            total: todaySales.length > 0 ? todaySales[0].total : 0,
            count: todaySales.length > 0 ? todaySales[0].count : 0,
            distinctCustomers: todaySales.length > 0 ? (todaySales[0].customers.filter(c => c !== null).length) : 0
        };

        // 3. เตรียมข้อมูลสำหรับวาด "กราฟยอดขาย": มีการจัดกลุ่มยอดขายแยกเป็นรายวัน (Group by Date)
        const chartData = await Sale.aggregate([
            { $match: { date: { $gte: pastDate } } }, // กรองข้อมูลตามช่วงเวลาที่กำหนด (เช่น 7 วันล่าสุด)
            {
                $group: {
                    _id: {
                        // แปลงฟิลด์ Date ให้เป็นสตริงรูปแบบ YYYY-MM-DD เพื่อใช้ในการจัดกลุ่มวันที่
                        $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: "+07:00" }
                    },
                    total: { $sum: "$totalPrice" } // รวมยอดขายของแต่ละวัน
                }
            },
            { $sort: { "_id": 1 } } // เรียงข้อมูลวันที่จากอดีตไปหาปัจจุบัน
        ]);

        // ขั้นตอน "Fill missing dates": จัดการให้ข้อมูลครบทุกวัน (หากวันไหนไม่มีขายให้มีค่าเป็น 0 แทนข้อมูลที่หายไป)
        let labels = [];
        let dataIndex = [];
        for(let i=(range-1); i>=0; i--) {
            let d = new Date();
            d.setDate(d.getDate() - i);
            let dateStr = d.toISOString().split('T')[0]; // แปลงวันที่ใน Loop เป็นรูปแบบ "YYYY-MM-DD"
            labels.push(dateStr); 
            
            let found = chartData.find(x => x._id === dateStr);
            dataIndex.push(found ? found.total : 0); 
        }

        // 4. ดึงข้อมูล "รายการขายล่าสุด": เพื่อนำไปโชว์ในตารางประวัติหน้า Dashboard
        const recentSales = await Sale.find()
            .populate("member") // นำไอดีสมาชิกไปดึงชื่อจริงจาก Collection Member
            .sort({ date: -1 }) // เรียงจากล่าสุดไปหาเก่าที่สุด
            .limit(5); // ดึงข้อมูลมาแค่ 5 รายการล่าสุด

        // 5. วิเคราะห์ "สินค้าขายดี 5 อันดับแรก" (Top Best Sellers)
        const topProducts = await Sale.aggregate([
            { $unwind: "$items" }, // 'Unwind' รายการสินค้าออกมาจากอาร์เรย์เพื่อให้ Aggregate คำนวณเป็นรายชิ้นได้
            {
                $group: {
                    _id: "$items.productName", // จัดกลุ่มตามชื่อสินค้า
                    qty: { $sum: "$items.quantity" }, // รวมจำนวนหน่วยที่ขายได้
                    revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } // คำนวณรายได้โดยใช้สูตร ราคา x จำนวน
                }
            },
            { $sort: { qty: -1 } }, // เรียงลำดับจากจำนวนที่ขายได้มากที่สุด
            { $limit: 5 } // เลือกเฉพาะ 5 อันดับแรก
        ]);

        // ส่งข้อมูลที่ประมวลผลเสร็จแล้วทั้งหมดไปยังหน้า EJS (Dashboard)
        res.render("dashboard", {
            title: "Dashboard ร้านกาแฟ",
            user: req.session.user,
            summary,
            chartLabels: JSON.stringify(labels),
            chartData: JSON.stringify(dataIndex),
            recentSales,
            topProducts,
            range
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