const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');

// รับค่าจาก form
app.use(express.urlencoded({ extended: false }));

// ================= DATABASE =================
const connectDB = require('./config/db');
connectDB();

// ================= ROUTES =================
const router = require('./routes/myrouter');
const memberRoutes = require('./routes/memberRoutes');
const customerRoutes = require('./routes/customerRoutes');
const salesRoutes = require('./routes/salesRoutes');

// ================= SETTINGS =================
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ================= MIDDLEWARE =================



// session login
app.use(session({
    secret: 'cafe-pos-secret',
    resave: false,
    saveUninitialized: false
}));

// ส่ง user ไปทุก view
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.request = req;
    next();
});

// static files
app.use(express.static(path.join(__dirname, 'public')));


// ================= ROUTE USE =================

// members routes
app.use('/members', memberRoutes);

// customers routes  ⭐ ต้องอยู่หลัง session
app.use('/customers', customerRoutes);

// sales routes  ⭐ ต้องอยู่หลัง session
app.use('/sales', salesRoutes);

// main routes
app.use('/', router);


// ================= SERVER =================
app.listen(8080, () => {
    console.log('🚀 Server running at http://localhost:8080');
});