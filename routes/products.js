// routes/products.js
const express = require("express");
const Product = require("../models/Product");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const { cacheMiddleware, invalidateCache } = require("../middleware/cache");

const router = express.Router();

// GET /api/products?category=bags&search=tote
router.get("/", cacheMiddleware(300), async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { isActive: true };
    if (category && category !== "all") filter.category = category;
    if (search) filter.name = { $regex: search, $options: "i" };
    const products = await Product.find(filter).sort({ createdAt: 1 });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// GET /api/products/admin/all  — must be before /:id
router.get("/admin/all", adminMiddleware, cacheMiddleware(300), async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: 1 });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// GET /api/products/:id
router.get("/:id", cacheMiddleware(300), async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isActive: true });
    if (!product) return res.status(404).json({ error: "Product not found." });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// POST /api/products — admin: add product
router.post("/", adminMiddleware, async (req, res) => {
  try {
    const { name, category, image, price, oldPrice, badge, stock } = req.body;
    if (!name || !category || !image || !price)
      return res.status(400).json({ error: "name, category, image, price are required." });
    const product = await Product.create({ name, category, image, price, oldPrice: oldPrice || null, badge: badge || null, stock: stock || 100 });
    await invalidateCache("cache:/api/products*");
    res.status(201).json({ product });
  } catch (err) {
    res.status(500).json({ error: err.message || "Server error." });
  }
});

// PUT /api/products/:id — admin: update product
router.put("/:id", adminMiddleware, async (req, res) => {
  try {
    const { name, category, image, price, oldPrice, badge, stock, isActive } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, category, image, price, oldPrice: oldPrice || null, badge: badge || null, stock: stock ?? 100, isActive: isActive ?? true },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: "Product not found." });
    await invalidateCache("cache:/api/products*");
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: err.message || "Server error." });
  }
});

// DELETE /api/products/:id — admin: soft-hide
router.delete("/:id", adminMiddleware, async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    await invalidateCache("cache:/api/products*");
    res.json({ message: "Product hidden from store." });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;