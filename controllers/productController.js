const Product = require('../models/products');

// แสดงสินค้า
exports.index = async (req, res) => {
    try {
        const products = await Product.find();
        res.render("index", {
            products,
            title: "CafePOS",
            user: req.session.user
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// หน้าเพิ่มสินค้า
exports.addForm = (req, res) => {
    res.render("form", {
        title: "Add Product"
    });
};

// จัดการสินค้า
exports.manage = async (req, res) => {
    const products = await Product.find();
    res.render("manage", {
        products,
        title: "Manage Product",
        user: req.session.user
    });
};