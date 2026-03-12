const mongoose = require("mongoose");

const SaleSchema = new mongoose.Schema({

  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      },

      productName: String,
      productImage: String,
      price: Number,
      quantity: Number,
      sweetness: { type: String, default: "100%" }
    }
  ],

  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    default: null
  },

  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Member"
  },

  paymentMethod: {
    type: String,
    enum: ["เงินสด", "โอน", "QR Code"],
    default: "เงินสด"
  },

  discount: {
    type: Number,
    default: 0
  },

  totalPrice: Number,

  date: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Sale", SaleSchema);