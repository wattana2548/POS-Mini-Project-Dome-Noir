const express = require('express');
const router = express.Router();
const auth = require('../config/auth');

const salesController = require('../controllers/salesController');

router.get('/new', auth.isEmployee, salesController.newSale);
router.post('/insert', auth.isEmployee, salesController.insertSale);

// ⭐ เพิ่มบรรทัดนี้
router.get('/all', auth.isEmployee, salesController.showSales);
router.get('/receipt/:id', auth.isEmployee, salesController.getReceipt);

module.exports = router;