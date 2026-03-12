const express = require('express');
const router = express.Router();

const customerController = require('../controllers/customerController');
const auth = require('../config/auth');

/* ======================
   CUSTOMER MANAGEMENT
====================== */
router.get('/manageCustomers', auth.isEmployee, customerController.manageCustomers);

router.get('/addCustomer', auth.isEmployee, customerController.showAddCustomer);

router.post('/addCustomer', auth.isEmployee, customerController.addCustomer);

router.get('/editCustomer/:id', auth.isEmployee, customerController.showEditCustomer);

router.post('/updateCustomer', auth.isEmployee, customerController.updateCustomer);

router.get('/deleteCustomer/:id', auth.isEmployee, customerController.deleteCustomer);

module.exports = router;