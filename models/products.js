const mongoose = require('mongoose');

// ================= SCHEMA =================
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    price: {
        type: Number,
        required: true
    },

    image: {
        type: String,
        default: "noimage.jpg"
    },

    description: {
        type: String,
        default: "-"
    },

    // ⭐ เพิ่มเพื่อ Cafe POS
    category: {
        type: String,
        enum: ["กาแฟ", "ชา", "ช็อกโกแลตและนม", "โซดา", "เมนูปั่น", "เบเกอรี่", "เมนูยอดนิยม", "อื่นๆ"],
        default: "กาแฟ"
    },

    stock: {
        type: Number,
        default: 0
    },

    status: {
        type: String,
        enum: ["พร้อมขาย", "หมด"],
        default: "พร้อมขาย"
    }

}, {
    timestamps: true // ⭐ สำคัญมากสำหรับ REPORT
});

// ================= MODEL =================
const Product = mongoose.model("Product", productSchema);

module.exports = Product;