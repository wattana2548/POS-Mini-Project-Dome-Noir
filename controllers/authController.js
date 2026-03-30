const Member = require('../models/members');

// ================= LOGIN PAGE =================
exports.loginPage = (req, res) => {
    res.render('login', {
        title: 'Login',
        message: null
    });
};

// ================= LOGIN =================
exports.login = async (req, res) => {

    const { username, password } = req.body;

    try {

        const user = await Member.findOne({ username, password });

        if (!user) {
            return res.render('login', {
                title: 'Login',
                message: 'Username หรือ Password ไม่ถูกต้อง'
            });
        }

        // สร้าง session
        req.session.user = user;

        res.redirect('/dashboard');

    } catch (err) {
        console.log(err);
        res.send("Login Error");
    }
};


// ================= LOGOUT =================
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
};