// ===============================
// ตรวจสอบ LOGIN
// ===============================
exports.isLogin = (req, res, next) => {

    if (req.session && req.session.user) {

        // ส่ง user ไปทุก view
        res.locals.user = req.session.user;

        return next();
    }

    return res.redirect("/login");
};



// ===============================
// ADMIN ONLY
// ===============================
exports.isAdmin = (req, res, next) => {

    if (!req.session || !req.session.user) {
        return res.redirect("/login");
    }

    if (req.session.user.role === "admin") {
        res.locals.user = req.session.user;
        return next();
    }

    return res.send("❌ ไม่มีสิทธิ์เข้าถึง (Admin Only)");
};



// ===============================
// EMPLOYEE + ADMIN
// ===============================
exports.isEmployee = (req, res, next) => {

    if (!req.session || !req.session.user) {
        return res.redirect("/login");
    }

    if (["admin", "employee"].includes(req.session.user.role)) {
        res.locals.user = req.session.user;
        return next();
    }

    return res.send("❌ ไม่มีสิทธิ์เข้าถึง");
};