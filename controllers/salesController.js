const Product = require("../models/products");
const Customer = require("../models/customers");
const Sale = require("../models/sales");

exports.newSale = async (req, res) => {
    try {
        // ดึงข้อมูลสินค้าทั้งหมดจาก Collection 'Product' เพื่อไปแสดงในหน้า POS
        const products = await Product.find();
        // ดึงข้อมูลสมาชิก (Member) ทั้งหมดเพื่อใช้สำหรับการเลือกชื่อสมาชิกและดูแต้มสะสม
        const members = await Customer.find();

        // ส่วนการวิเคราะห์หาสินค้าขายดี (Popular Menu) แบบ Real-time ด้วย Aggregation
        const popularResult = await Sale.aggregate([
            { $unwind: "$items" }, //จะกระจายรายการสินค้าในอาร์เรย์ (items) ออกมาเป็นแถวเดี่ยว
            { $group: { _id: "$items.product", count: { $sum: "$items.quantity" } } }, //ตามไอดีสินค้าและนับจำนวนหน่วย (quantity) ที่ขายได้รวมกัน
            { $sort: { count: -1 } }, //เรียงลำดับข้อมูลจากมากที่สุดไปหาน้อยที่สุด (-1)
            { $limit: 10 } //เอาเฉพาะ 10 รายการแรกเพื่อนำไปติดป้าย "ยอดนิยม" ในหน้าเว็บ
        ]);

        // แปลงผลลัพธ์ที่ได้จากการ Aggregate ให้เป็น Array ของ ID สินค้าในรูปแบบสตริง
        const popularIds = popularResult.map(item => item._id.toString());

        // ส่งข้อมูลทั้งหมดไปเรนเดอร์หน้า POS (newsale)
        res.render("sales/newsale", {
            productsLabel: products,
            products: products,
            members: members,
            popularIds: popularIds,
            user: req.session.user
        });

    } catch (err) {
        console.log(err);
        res.send("New Sale Error");
    }
};

exports.insertSale = async (req, res) => {
    try {
        // รับค่าข้อมูลจากการส่งฟอร์ม (req.body) ทั้งราคารวม, ส่วนลด, ช่องทางการชำระเงิน และไอดีสมาชิก
        const { items, totalPrice, discount, paymentMethod, member, usePoint } = req.body;
        // แปลงข้อมูลรายการสินค้า (items) จากรูปแบบ JSON String ให้กลายเป็น Javascript Object เพื่อประมวลผล
        const parsedItems = items ? JSON.parse(items) : [];
        const finalTotal = Number(totalPrice);
        const usedPoint = Number(usePoint) || 0;

        // 1. สร้างเอกสารการขายใหม่ (New Sale Instance)
        const sale = new Sale({
            items: parsedItems,
            totalPrice: finalTotal,
            discount,
            paymentMethod,
            member: member || null,
            employee: req.session.user ? req.session.user._id : null 
        });
        await sale.save(); // บันทึกข้อมูลใบเสร็จลงใน Database

        // 2. ระบบจัดการแต้มสมาชิก (Member Point Logic)
        if (member) {
            // กรณีใช้แต้มแลกส่วนลด: ใช้คำสั่ง $inc (Increment) ด้วยค่าติดลบเพื่อ "ลด" จำนวนแต้มในเครื่องสมาชิก
            if (usedPoint > 0) {
                await Customer.findByIdAndUpdate(member, {
                    $inc: { point: -usedPoint } 
                });
            }

            // กรณีการสะสมแต้มใหม่: ทุกๆ 20 บาทจะได้รับ 1 แต้ม (ใช้ Math.floor เพื่อปัดเศษลง)
            const earnPoint = Math.floor(alTotal / 20);fin
            await Customer.findByIdAndUpdate(member, {
                $inc: { point: earnPoint } // ใช้ $inc ด้วยค่าบวกเพื่อ "เพิ่ม" แต้มสะสม
            });
        }

        // เมื่อบันทึกเสร็จ ให้ส่งหน้าเว็บไปยังใบเสร็จ
        res.redirect("/sales/receipt/" + sale._id);

    } catch (err) {
        console.log(err);
        res.send("Insert Sale Error");
    }
};

exports.showSales = async (req, res) => {

    try {
        // รับค่าวันที่เริ่มต้น (startDate) และวันที่สิ้นสุด (endDate) จาก Query String สำหรับการทำระบบ Filter
        let { startDate, endDate } = req.query;
        let dateFilter = {};

        // หากมีการระบุวันที่ค้นหา: ทำการสร้างเงื่อนไขช่วงเวลา (Range Filter)
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0); // กำหนดเวลาเริ่มต้นที่ 00:00:00.000 เพื่อครอบคลุมทั้งวัน

            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // กำหนดเวลาสิ้นสุดที่ 23:59:59.999 เพื่อครอบคลุมทั้งวัน

            // ใช้เงื่อนไข $gte (Greater than or Equal) และ $lte (Less than or Equal) ในการค้นหาช่วงวันที่
            dateFilter = {
                date: { $gte: start, $lte: end }
            };
        } else {
            // หากไม่ระบุวันที่: ระบบจะ Default ให้แสดงเฉพาะยอดขายที่มีวันที่ตั้งแต่ต้น "วันนี้" เป็นต้นไป
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dateFilter = { date: { $gte: today } };
            
            // กำหนดค่าเริ่มต้นให้กับกล่องเลือกวันที่ในหน้า View
            startDate = startDate || today.toISOString().split('T')[0];
            endDate = endDate || new Date().toISOString().split('T')[0];
        }

        // ดึงข้อมูลการขาย พร้อมใช้ 'Populate' เพื่อนำชื่อสมาชิกและพนักงานไปโชว์ในตารางประวัติ
        const sales = await Sale
            .find(dateFilter)
            .populate("member")
            .populate("employee")
            .sort({ date: -1 }); // เรียงลำดับจากรายการล่าสุดก่อน (Latest First)

        // ใช้ Aggregation เพื่อสรุปยอดรายได้รวม (TotalPrice) และนับจำนวนรายการออเดอร์ตามเงื่อนไข Filter
        const summaryResults = await Sale.aggregate([
            { $match: dateFilter }, // กรองเฉพาะรายการที่ตรงตามเงื่อนไขวันที่
            { 
                $group: { 
                    _id: null, 
                    total: { $sum: "$totalPrice" }, // รวมผลรวมของฟิลด์ totalPrice
                    count: { $sum: 1 } // นับผลรวมรายการ (จำนวนบรรทัด)
                } 
            }
        ]);

        // เรนเดอร์หน้าประวัติการขาย (showsale)
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

exports.getReceipt = async (req, res) => {
    try {
       
        const sale = await Sale.findById(req.params.id).populate("member");
        if (!sale) return res.redirect("/sales/new");

        
        res.render("sales/receipt", {
            sale,
            user: req.session.user
        });
    } catch (err) {
        console.log(err);
        res.redirect("/sales/new");
    }
};