const Product = require("../models/products");
const Customer = require("../models/customers");
const Sale = require("../models/sales");


/* =========================
   OPEN POS PAGE (เปิดหน้าการขาย)
   [อธิบาย: โหลดข้อมูลสินค้าและสมาชิกเพื่อเตรียมขาย]
========================= */
exports.newSale = async (req, res) => {

    try {

        // ดึงข้อมูลสินค้าและสมาชิกทั้งหมดจากฐานข้อมูล
        const products = await Product.find();
        const members = await Customer.find();

        // คำนวณหาสินค้าที่เป็นที่นิยม (Top 10) โดยใช้ Aggregation
        const popularProducts = await Sale.aggregate([
            { $unwind: "$items" }, // กระจายอาร์เรย์สินค้า
            { $group: { _id: "$items.product", count: { $sum: "$items.quantity" } } }, // นับจำนวนที่ขายได้
            { $sort: { count: -1 } }, // เรียงลำดับจากมากไปน้อย
            { $limit: 10 } // เอาแค่ 10 อันแรก
        ]);
        const popularIds = popularProducts.map(p => p._id ? p._id.toString() : "");

        // เรนเดอร์หน้า newsale พร้อมส่งข้อมูลไปแสดงผล
        res.render("sales/newsale", {
            user: req.session.user,
            products,
            members,
            popularIds
        });

    } catch (err) {

        console.log(err);
        res.send("POS Error");

    }

};



/* =========================
   INSERT SALE (บันทึกการขาย) 
   [ส่วนนี้คือหัวใจของ POS ใช้บันทึกออเดอร์และจัดการแต้มสมาชิก]
========================= */
console.log("INSERT SALE WORKING");
exports.insertSale = async (req, res) => {

    try {
        // 1. รับข้อมูลจากหน้าบ้าน (Frontend)
        const {
            items,          // รายการสินค้า (JSON string)
            totalPrice,     // ราคารวม
            discount,       // ส่วนลด
            paymentMethod,  // วิธีชำระเงิน
            member,         // ID สมาชิก (ถ้ามี)
            usePoint        // จำนวนแต้มที่ใช้ลดราคา
        } = req.body;

        // แปลงข้อมูลสินค้าจาก String กลับเป็น Array Object
        const parsedItems = items ? JSON.parse(items) : [];

        const finalTotal = Number(totalPrice);
        const usedPoint = Number(usePoint) || 0;


        // 2. บันทึกข้อมูลการขายลง Collection 'Sale'
        const sale = new Sale({
            items: parsedItems,
            totalPrice: finalTotal,
            discount,
            paymentMethod,
            member: member || null,
            // เก็บ ID ของพนักงานที่ล็อกอินอยู่
            employee: req.session.user ? req.session.user._id : null
        });

        await sale.save(); // บันทึกลง Database


        // 3. ระบบจัดการแต้มสมาชิก (Point System)
        if (member) {

            // กรณีมีการใช้แต้ม (Redeem) -> ทำการลดแต้มใน Database
            if (usedPoint > 0) {
                await Customer.findByIdAndUpdate(member, {
                    $inc: { point: -usedPoint } // $inc ติดลบคือการลดค่า
                });
            }

            // กรณีได้แต้มใหม่ (Earn) -> ทุกๆ 20 บาท ได้ 1 แต้ม
            const earnPoint = Math.floor(finalTotal / 20);

            await Customer.findByIdAndUpdate(member, {
                $inc: { point: earnPoint } // $inc เป็นบวกคือการเพิ่มค่า
            });

        }

        // เมื่อบันทึกเสร็จ ให้ Redirect ไปยังหน้าใบเสร็จ
        res.redirect("/sales/receipt/" + sale._id);

    } catch (err) {

        console.log(err);
        res.send("Insert Sale Error");

    }

};


/* =========================
   SHOW SALES HISTORY (แสดงประวัติการขาย)
   [อธิบาย: ดึงรายชื่อการขายทั้งหมดมาแสดง และทำระบบ Filter ตามวันที่]
========================= */
exports.showSales = async (req, res) => {

    try {
        // รับค่าวันที่จาก Query String
        let { startDate, endDate } = req.query;
        let dateFilter = {};

        // ถ้ามีการระบุวันที่ ให้ทำการสร้าง Filter เพื่อไป Query ฐานข้อมูล
        if (startDate && endDate) {
            // ปรับเวลาให้ครอบคลุมทั้งวัน (00:00 - 23:59)
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);

            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            dateFilter = {
                date: {
                    $gte: start,
                    $lte: end
                }
            };
        } else {
            // ถ้าไม่ระบุ ให้ Default เป็นยอดขายของ "วันนี้"
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dateFilter = {
                date: { $gte: today }
            };
            
            // กำหนดค่าเริ่มต้นให้กับหน้าจอ Input วันที่
            startDate = startDate || today.toISOString().split('T')[0];
            endDate = endDate || new Date().toISOString().split('T')[0];
        }

        // ดึงข้อมูลการขาย พร้อม Populate (เติมข้อมูลอัตโนมัติ) ของสมาชิกและพนักงานที่ขาย
        const sales = await Sale
            .find(dateFilter)
            .populate("member")
            .populate("employee")
            .sort({ date: -1 });

        // คำนวณยอดเงินรวมและจำนวนออเดอร์ตามช่วงวันที่ Filter โดยใช้ Aggregate
        const summaryResults = await Sale.aggregate([
            {
                $match: dateFilter
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalPrice" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // เรนเดอร์หน้า showsale
        res.render("sales/showsale", {
            sales: sales,
            summary: summaryResults[0] || { total: 0, count: 0 },
            user: req.session.user,
            startDate,
            endDate
        });

    } catch (err) {

        console.log(err);
        res.send("Show Sales Error");

    }

};

/* =========================
   GET ORDER RECEIPT (พิมพ์ใบเสร็จ)
   [อธิบาย: ดึงข้อมูลการขายแต่ละออเดอร์มาแสดงในรูปแบบใบเสร็จ]
========================= */
exports.getReceipt = async (req, res) => {
    try {
        // ค้นหาการขายด้วย ID และดึงข้อมูลสมาชิกมาด้วย
        const sale = await Sale.findById(req.params.id).populate("member");
        if (!sale) return res.redirect("/sales/new");

        // เรนเดอร์หน้าใบเสร็จ
        res.render("sales/receipt", {
            sale,
            user: req.session.user
        });
    } catch (err) {
        console.log(err);
        res.redirect("/sales/new");
    }
};