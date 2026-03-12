const connectDB = require("./config/db");
const bcrypt = require("bcryptjs");
const Member = require("./models/members");

async function createAdmin() {

    await connectDB(); // ⭐ รอ DB ก่อน

    const hash = await bcrypt.hash("123456", 10);

    await Member.deleteMany({ email: "admin@cafe.com" });

    await new Member({
        name: "Admin Cafe",
        email: "admin@cafe.com",
        phone: "0999999999",
        password: hash,
        role: "admin"
    }).save();

    console.log("✅ Admin created");

    process.exit();
}

createAdmin();