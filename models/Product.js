// models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: ["bags", "accessories", "footwear", "apparel"] },
    image:    { type: String, required: true },
    price:    { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, default: null },
    rating:   { type: Number, default: 4.5, min: 0, max: 5 },
    reviews:  { type: Number, default: 0 },
    badge:    { type: String, enum: ["hot", "sale", "new", null], default: null },
    stock:    { type: Number, default: 100, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
