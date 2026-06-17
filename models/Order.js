// models/Order.js
const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId:   { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  productImg:  { type: String },
  price:       { type: Number, required: true },
  qty:         { type: Number, required: true, min: 1 },
});

const orderSchema = new mongoose.Schema(
  {
    user:          { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderNumber:   { type: String, required: true, unique: true },
    status:        {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
      default: "confirmed",
    },
    paymentMethod: { type: String, default: "card" },
    items:         [orderItemSchema],
    subtotal:      { type: Number, required: true },
    shipping:      { type: Number, default: 0 },
    total:         { type: Number, required: true },
    shippingName:  { type: String, default: null },
    shippingAddr:  { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
