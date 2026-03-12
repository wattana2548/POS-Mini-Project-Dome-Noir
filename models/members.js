const mongoose = require('mongoose')
const bcrypt = require("bcryptjs")

const MemberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
     role: {
        type: String,
        enum: ['admin', 'employee'],
        default: 'employee'
    },
    password: { type: String, required: true }
});


MemberSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("Member", MemberSchema);