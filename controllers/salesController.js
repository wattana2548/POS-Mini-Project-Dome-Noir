const Product = require("../models/products");
const Customer = require("../models/customers");
const Sale = require("../models/sales");


/* =========================
   OPEN POS PAGE
========================= */

exports.newSale = async (req, res) => {

    try {

        const products = await Product.find();
        const members = await Customer.find();

        const popularProducts = await Sale.aggregate([
            { $unwind: "$items" },
            { $group: { _id: "$items.product", count: { $sum: "$items.quantity" } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        const popularIds = popularProducts.map(p => p._id ? p._id.toString() : "");

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
   INSERT SALE
========================= */
console.log("INSERT SALE WORKING");
exports.insertSale = async (req, res) => {

    try {

        const {
            items,
            totalPrice,
            discount,
            paymentMethod,
            member,
            usePoint
        } = req.body;

        const parsedItems = items ? JSON.parse(items) : [];

        const finalTotal = Number(totalPrice);
        const usedPoint = Number(usePoint) || 0;


        // ===== SAVE SALE =====
        const sale = new Sale({
            items: parsedItems,
            totalPrice: finalTotal,
            discount,
            paymentMethod,
            member: member || null
        });

        await sale.save();


        // ===== POINT SYSTEM =====
        if (member) {

            // ใช้ point
            if (usedPoint > 0) {
                await Customer.findByIdAndUpdate(member, {
                    $inc: { point: -usedPoint }
                });
            }

            // ได้ point
            const earnPoint = Math.floor(finalTotal / 20);

            await Customer.findByIdAndUpdate(member, {
                $inc: { point: earnPoint }
            });

        }

        res.redirect("/sales/receipt/" + sale._id);

    } catch (err) {

        console.log(err);
        res.send("Insert Sale Error");

    }

};


/* =========================
   SHOW SALES HISTORY
========================= */

exports.showSales = async (req, res) => {

    try {
        let { startDate, endDate } = req.query;
        let dateFilter = {};

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
            // Default: วันนี้
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dateFilter = {
                date: { $gte: today }
            };
            
            // กำหนดค่าเริ่มต้นให้กับ input (YYYY-MM-DD)
            startDate = startDate || today.toISOString().split('T')[0];
            endDate = endDate || new Date().toISOString().split('T')[0];
        }

        const sales = await Sale
            .find(dateFilter)
            .populate("member")
            .populate("employee")
            .sort({ date: -1 });

        // ✅ revenue summary based on filter
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
   GET ORDER RECEIPT
========================= */
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