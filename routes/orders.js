// routes/orders.js
const express  = require("express");
const Order    = require("../models/Order");
const Product  = require("../models/Product");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const { cacheMiddleware, invalidateCache } = require("../middleware/cache");

const router = express.Router();

// Helper — bust all order + stats caches when order data changes
async function bustOrderCaches(userId) {
  await invalidateCache(
    `cache:/api/orders`,                    // that user's order list (keyed by session)
    "cache:/api/orders/admin/all",          // admin order table
    "cache:/api/users/admin/stats",         // dashboard totals changed
    "cache:/api/users"                      // user spend totals changed
  );
  // Also bust per-user order cache if user id is known
  if (userId) await invalidateCache(`cache:/api/orders?user=${userId}`);
}

// POST /api/orders — place an order
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { items, paymentMethod, shippingName, shippingAddr } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: "Cart is empty." });

    // Validate stock for each item
    for (const item of items) {
      const product = await Product.findById(item.id);
      if (!product || !product.isActive)
        return res.status(400).json({ error: `Product "${item.name}" is not available.` });
      if (product.stock < item.qty)
        return res.status(400).json({ error: `"${product.name}" is out of stock.` });
    }

    const subtotal    = items.reduce((s, i) => s + i.price * i.qty, 0);
    const orderNumber = "LX" + Date.now().toString().slice(-9).toUpperCase();

    const orderItems = items.map(i => ({
      productId:   i.id,
      productName: i.name,
      productImg:  i.image,
      price:       i.price,
      qty:         i.qty,
    }));

    const order = await Order.create({
      user:          req.user.id,
      orderNumber,
      status:        "confirmed",
      paymentMethod: paymentMethod || "card",
      items:         orderItems,
      subtotal,
      total:         subtotal,
      shippingName:  shippingName || null,
      shippingAddr:  shippingAddr || null,
    });

    // Decrement stock + bust product cache (stock changed)
    for (const item of items) {
      await Product.findByIdAndUpdate(item.id, { $inc: { stock: -item.qty } });
    }
    await invalidateCache("cache:/api/products*");  // stock values changed
    await bustOrderCaches(req.user.id);             // order/stats caches stale

    res.status(201).json({ order, message: "Order placed successfully!" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Failed to place order." });
  }
});

// GET /api/orders — my orders (cache 30s — short so new orders appear fast)
router.get("/", authMiddleware, cacheMiddleware(30), async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// GET /api/orders/admin/all — all orders with user info (MUST be before /:id)
router.get("/admin/all", adminMiddleware, cacheMiddleware(30), async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 });

    const result = orders.map(o => ({
      ...o.toObject(),
      userName:  o.user ? `${o.user.firstName} ${o.user.lastName}` : "Deleted User",
      userEmail: o.user?.email || "",
    }));
    res.json({ orders: result });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// PUT /api/orders/admin/:id/status — update status + bust caches
router.put("/admin/:id/status", adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status." });

    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: "Order not found." });

    // Bust order + stats caches — status change affects dashboard
    await bustOrderCaches(order.user?.toString());

    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// GET /api/orders/:id — single order
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "firstName lastName email");
    if (!order) return res.status(404).json({ error: "Order not found." });
    if (order.user._id.toString() !== req.user.id && !req.user.isAdmin)
      return res.status(403).json({ error: "Access denied." });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
