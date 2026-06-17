// routes/wishlist.js
const express  = require("express");
const Wishlist = require("../models/Wishlist");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// GET /api/wishlist — get my wishlist with product details
router.get("/", authMiddleware, async (req, res) => {
  try {
    const items = await Wishlist.find({ user: req.user.id })
      .populate("product")
      .sort({ createdAt: -1 });

    const wishlist = items
      .filter(w => w.product && w.product.isActive)
      .map(w => w.product);

    res.json({ wishlist });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// POST /api/wishlist/:productId — toggle (add or remove)
router.post("/:productId", authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;
    const existing = await Wishlist.findOne({ user: req.user.id, product: productId });
    if (existing) {
      await Wishlist.deleteOne({ _id: existing._id });
      res.json({ action: "removed" });
    } else {
      await Wishlist.create({ user: req.user.id, product: productId });
      res.json({ action: "added" });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
