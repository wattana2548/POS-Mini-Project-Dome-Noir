const Member = require('../models/members');
const bcrypt = require('bcryptjs');

// ================= SHOW PAGE =================
exports.showAddEmployee = (req, res) => {
    res.render('members/addEmployee', {
        title: 'Add Employee',
        error: null
    });
};

// ================= ADD EMPLOYEE =================
exports.addEmployee = async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        const exist = await Member.findOne({ email });
        if (exist) {
            return res.render('members/addEmployee', {
                title: 'Add Employee',
                error: 'Email นี้ถูกใช้งานแล้ว'
            });
        }

        const hash = await bcrypt.hash(password, 10);

        // allow only admin to assign admin
        const finalRole =
            req.session.user.role === 'admin'
                ? role
                : 'employee';

        await Member.create({
            name,
            email,
            phone,
            password: hash,
            role: finalRole
        });

        res.redirect('/members/manageMembers');

    } catch (err) {
        console.error(err);

        res.render('members/addEmployee', {
            title: 'Add Employee',
            error: 'เพิ่มพนักงานไม่สำเร็จ'
        });
    }
};

// ================= MANAGE MEMBERS =================
exports.manageMembers = async (req, res) => {

    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/');
    }

    const members = await Member.find();

    res.render('members/manageMembers', {
        title: 'Manage Members',
        members
    });
};

// ================= EDIT MEMBER =================
exports.showEditMember = async (req, res) => {

    const member = await Member.findById(req.params.id);

    res.render('editMember', {
        member,
        title: 'Edit Member'
    });
};

// ================= UPDATE MEMBER =================
exports.updateMember = async (req, res) => {

    const { id, name, email, phone } = req.body;

    await Member.findByIdAndUpdate(id, { name, email, phone });

    res.redirect('/members/manageMembers');
};

// ================= DELETE MEMBER =================
exports.deleteMember = async (req, res) => {

    await Member.findByIdAndDelete(req.params.id);

    res.redirect('/members/manageMembers');
};