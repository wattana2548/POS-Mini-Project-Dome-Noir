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
   Upload Image (การตั้งค่าการอัปโหลดรูปภาพ)
   [ใช้ multer เพื่อเก็บรูปภาพสินค้าลงในโฟลเดอร์ public/images/products]
====================== */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/images/products');
    },
    filename: (req, file, cb) => {
        // ตั้งชื่อไฟล์รูปภาพด้วย Timestamp เพื่อไม่ให้ชื่อซ้ำกัน
        cb(null, Date.now() + ".jpg");
    }
});
const upload = multer({ storage });

/* ======================
   HOME (หน้าแรกของร้าน - POS)
   [อธิบาย: ดึงสินค้าทั้งหมดมาแสดง และคำนวณหาสินค้าขายดีชั่วคราวเพื่อแสดง Badge]
====================== */
router.get("/", auth.isLogin, async (req, res) => {
    // ดึงรายการเครื่องดื่มทั้งหมด
    const products = await Product.find();

    // คำนวณหาสินค้ายอดนิยม (Dynamic Popular Menu) เพื่อติดป้าย "ยอดนิยม"
    const popularProducts = await Sale.aggregate([
        { $unwind: "$items" },
        { $group: { _id: "$items.product", count: { $sum: "$items.quantity" } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);
    const popularIds = popularProducts.map(p => p._id ? p._id.toString() : "");

    // เรนเดอร์หน้า index (หน้าสั่งซื้อ)
    res.render("index", { products, popularIds, title });
});

/* ======================
   PRODUCT MANAGEMENT (ระบบจัดการสินค้า - CRUD)
   [เฉพาะ Admin เท่านั้นที่เข้าถึงส่วนนี้ได้]
====================== */

// 1. หน้าฟอร์มเพิ่มสินค้า
router.get('/addForm', auth.isAdmin, (req, res) => {
    res.render('form', { title: "เพิ่มเมนูเครื่องดื่ม" });
});

// 2. หน้าตารางจัดการสินค้า (แก้ไข/ลบ)
router.get('/manage', auth.isAdmin, async (req, res) => {
    const products = await Product.find();
    res.render("manage", { products, title: "จัดการเมนู" });
});

// 3. บันทึกสินค้าใหม่ (Insert)
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

// 4. ลบสินค้า (Delete)
router.get('/delete/:id', auth.isAdmin, async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/manage');
});

// 5. หน้าฟอร์มแก้ไขสินค้า (Get Edit Form)
router.post('/edit', auth.isAdmin, async (req, res) => {
    const product = await Product.findById(req.body.id);
    res.render('formedit', { product, title: "แก้ไขเมนู" });
});

// 6. อัปเดตข้อมูลสินค้า (Update)
router.post('/update', auth.isAdmin, upload.single("image"), async (req, res) => {
    const data = {
        name: req.body.name,
        price: req.body.price,
        category: req.body.category,
        status: req.body.status
    };

    // ถ้ามีการอัปโหลดรูปภาพใหม่ ให้เปลี่ยนชื่อไฟล์รูปใน Database
    if (req.file) data.image = req.file.filename;

    await Product.findByIdAndUpdate(req.body.id, data);
    res.redirect('/manage');
});

/* ======================
   PRODUCT DETAIL (หน้ารายละเอียดสินค้า)
====================== */
router.get('/product/:id', async (req, res) => {
    const product = await Product.findById(req.params.id);
    res.render("product", { product, title: "รายละเอียดเมนู" });
});

/* ======================
   SALES (POS)
====================== */

/* ======================
   REGISTER SYSTEM (ระบบลงทะเบียนพนักงานใหม่)
====================== */

// โชว์หน้าสมัครสมาชิก
router.get("/register", auth.isAdmin, (req, res) => {
    res.render("register/regisindex");
});

// จัดการการส่งฟอร์มสมัครสมาชิก
router.post("/register", auth.isAdmin, async (req, res) => {

    const { name, email, phone, password, confirmPassword } = req.body;

    // เช็คความถูกต้องของ Password
    if (password !== confirmPassword)
        return res.render("register/regisindex", { error: "Password ไม่ตรงกัน" });

    // เช็ค Email ซ้ำ
    if (await Member.findOne({ email }))
        return res.render("register/regisindex", { error: "Email ถูกใช้งานแล้ว" });

    // เข้ารหัส Password ด้วย bcrypt ก่อนบันทึก
    const hashedPassword = await bcrypt.hash(password, 10);

    await new Member({
        name,
        email,
        phone,
        password: hashedPassword,
        role: "employee" // กำหนด Role พื้นฐานเป็นพนักงาน
    }).save();

    res.redirect("/login");
});

/* ======================
   LOGIN SYSTEM (ระบบเข้าสู่ระบบ)
====================== */

router.get("/login", (req, res) => {
    res.render("login", { message: req.session.message || null });
    req.session.message = null;
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await Member.findOne({ email });

    // ตรวจสอบ User และ Password (เปรียบเทียบ Hash)
    if (!user || !(await bcrypt.compare(password, user.password))) {
        req.session.message = "Email หรือ Password ไม่ถูกต้อง";
        return res.redirect("/login");
    }

    // เก็บข้อมูล User ลงใน Session เพื่อตรวจสอบใน Middleware ถัดไป
    req.session.user = user;
    res.redirect("/");
});

/* ======================
   DASHBOARD LOGIC (ระบบวิเคราะห์ข้อมูลหลังบ้าน)
   ["ส่วนประมวลผลกลาง" สำหรับใช้แสดงสถิติต่างๆ ในหน้า Dashboard]
====================== */
router.get("/dashboard", auth.isAdmin, async (req, res) => {
    try {
        // --- 1. RANGE SELECTOR (การจัดการช่วงเวลา) ---
        // รับค่าจำนวนวันย้อนหลังจาก URL (Query String) เช่น ?range=30
        const range = parseInt(req.query.range) || 7; // ถ้าไม่มีค่าส่งมา ให้ตั้งค่าเริ่มต้นที่ 7 วัน
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); // ตั้งเวลาเป็น 00:00:00 เพื่อให้นับข้อมูลเริ่มจากต้นวัน

        // คำนวณหาวันเริ่มต้นของช่วงเวลา (เช่น วันนี้ลบไปอีก 6 วัน เพื่อให้ครบ 7 วันรวมวันนี้)
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - (range - 1));
        pastDate.setHours(0, 0, 0, 0);

        // --- 2. SUMMARY TODAY (สรุปยอดขายรายวัน) ---
        // ใช้ MongoDB Aggregate เพื่อประมวลผลข้อมูลหลายอย่างในคำสั่งเดียว
        const todaySales = await Sale.aggregate([
            { $match: { date: { $gte: today } } }, // ดึงเฉพาะออเดอร์ที่มีวันที่ ตั้งแต่ต้นวันนี้เป็นต้นไป
            { 
                $group: {
                    _id: null,
                    total: { $sum: "$totalPrice" }, // รวมยอดเงินทั้งหมดจากทุกออเดอร์ของวันนี้
                    count: { $sum: 1 },             // นับจำนวนออเดอร์ที่เกิดขึ้นในวันนี้
                    customers: { $addToSet: "$member" } // เก็บ ID ลูกค้าแบบไม่ซ้ำ เพื่อดูว่ามีมาซื้อกี่คน
                }
            }
        ]);

        // จัดเตรียมข้อมูลสรุปให้อยู่ในรูปแบบที่เอาไปใช้งานง่ายๆ ที่หน้า EJS
        const summary = {
            total: todaySales.length > 0 ? todaySales[0].total : 0,
            count: todaySales.length > 0 ? todaySales[0].count : 0,
            distinctCustomers: todaySales.length > 0 ? (todaySales[0].customers.filter(c => c !== null).length) : 0
        };

        // --- 3. SALES GRAPH DATA (การคำนวณข้อมูลสำหรับกราฟ) ---
        // ใช้ Aggregate เพื่อจัดกลุ่มยอดขายแยกเป็นรายวัน (Group by Date)
        const chartData = await Sale.aggregate([
            { $match: { date: { $gte: pastDate } } }, // ดึงข้อมูลเฉพาะช่วงวันที่กำหนด (เช่น 7 วันล่าสุด)
            {
                $group: {
                    _id: {
                        // แปลง Date ใน DB ให้เป็น String รูปแบบ YYYY-MM-DD เพื่อใช้เปรียบเทียบ
                        $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: "+07:00" }
                    },
                    total: { $sum: "$totalPrice" } // รวมยอดเงินในแต่ละกลุ่มวันที่
                }
            },
            { $sort: { "_id": 1 } } // เรียงข้อมูลจากวันก่อนหน้าไปหาปัจจุบัน
        ]);

        // ขั้นตอน "Fill missing dates": เผื่อบางวันไม่มีการขาย ค่าจะเป็น 0 (แทนที่จะเป็นค่าหายไป)
        let labels = [];
        let dataIndex = [];
        for(let i=(range-1); i>=0; i--) {
            let d = new Date();
            d.setDate(d.getDate() - i);
            let dateStr = d.toISOString().split('T')[0]; // แปลงวันปัจจุบันใน Loop เป็น "YYYY-MM-DD"
            labels.push(dateStr); // เก็บไว้เป็นแกน X ของกราฟ
            
            // ค้นหาว่าใน DB มีข้อมูลของวันนี้ไหม ถ้ามีให้เอาค่ามาใส่ ถ้าไม่มีให้ใส่ 0
            let found = chartData.find(x => x._id === dateStr);
            dataIndex.push(found ? found.total : 0); // เก็บไว้เป็นข้อมูลแกน Y ของกราฟ
        }

        // --- 4. RECENT SALES (ดึงประวัติการขายล่าสุด) ---
        const recentSales = await Sale.find()
            .populate("member") // นำ ID สมาชิกไปดึงชื่อจริงๆ มาแสดง
            .sort({ date: -1 }) // เรียงจากล่าสุดไปหาเก่าที่สุด
            .limit(5);          // เอาเฉพาะ 5 รายการล่าสุด

        // --- 5. TOP 5 BEST SELLERS (วิเคราะห์สินค้าขายดี) ---
        // อธิบาย: สินค้าถูกเก็บเป็น Array ใน Database จึงต้องกระจายออกก่อนประมวลผล
        const topProducts = await Sale.aggregate([
            { $unwind: "$items" }, // กระจาย Array สินค้า (แตกออเดอร์เดียวที่มี 3 ชิ้น ให้กลายเป็น 3 รายการแยกกัน)
            {
                $group: {
                    _id: "$items.productName", // จัดกลุ่มตามชื่อสินค้า
                    qty: { $sum: "$items.quantity" }, // รวมจำนวนหน่วยที่ขายได้
                    revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } // คำนวณรายได้รวมของสินค้านั้นๆ
                }
            },
            { $sort: { qty: -1 } }, // เรียงตามจำนวนที่ขายได้มากที่สุด
            { $limit: 5 }          // เอาแค่ 5 อันดับแรก
        ]);

        // ส่งข้อมูลทั้งหมดที่คำนวณได้ไปเรนเดอร์หน้า Dashboard
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

/* ======================
   LOGOUT SYSTEM (การออกจากระบบ)
====================== */
router.get("/logout", (req, res) => {
    // ลบข้อมูล Session ทั้งหมด
    req.session.destroy(() => res.redirect("/login"));
});


module.exports = router;