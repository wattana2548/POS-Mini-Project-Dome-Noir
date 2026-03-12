const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema({

    name:{
        type:String,
        required:true
    },

    phone:{
        type:String,
        required:true,
        unique:true
    },

    point:{
        type:Number,
        default:0
    }

});

module.exports = mongoose.model("Customer",CustomerSchema);