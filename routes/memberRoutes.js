const express = require('express');
const router = express.Router();

const memberController = require('../controllers/memberController');
const auth = require('../config/auth');

/* ======================
   MEMBER MANAGEMENT
====================== */

// /members/manageMembers
router.get('/manageMembers', auth.isAdmin, memberController.manageMembers);

// /members/addEmployee
router.get('/addEmployee', auth.isAdmin, memberController.showAddEmployee);
router.post('/addEmployee', auth.isAdmin, memberController.addEmployee);

// edit
router.get('/editMember/:id', auth.isAdmin, memberController.showEditMember);

// update
router.post('/updateMember', auth.isAdmin, memberController.updateMember);

// delete
router.get('/deleteMember/:id', auth.isAdmin, memberController.deleteMember);

module.exports = router;