// routes/users.js
const express  = require("express");
const User     = require("../models/User");
const Order    = require("../models/Order");
const { adminMiddleware }              = require("../middleware/auth");
const { cacheMiddleware, invalidateCache } = require("../middleware/cache");

const router = express.Router();

// GET /api/users/admin/stats — dashboard numbers
// Cached 60s — recalculates every minute (totals change after orders placed)
// MUST be before /:id
router.get("/admin/stats", adminMiddleware, cacheMiddleware(60), async (req, res) => {
  try {
    const totalUsers    = await User.countDocuments({ isAdmin: false });
    const totalOrders   = await Order.countDocuments();
    const totalProducts = await require("../models/Product").countDocuments({ isActive: true });

    const revenueAgg = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    const recentOrders = await Order.find()
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      stats: { totalUsers, totalOrders, totalRevenue, totalProducts },
      recentOrders: recentOrders.map(o => ({
        orderNumber: o.orderNumber,
        status:      o.status,
        total:       o.total,
        createdAt:   o.createdAt,
        firstName:   o.user?.firstName,
        lastName:    o.user?.lastName,
        email:       o.user?.email,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

// GET /api/users — all users with order stats
// Cached 120s — changes when new users register or orders placed
router.get("/", adminMiddleware, cacheMiddleware(120), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    const result = await Promise.all(
      users.map(async (u) => {
        const agg = await Order.aggregate([
          { $match: { user: u._id } },
          { $group: { _id: null, count: { $sum: 1 }, spent: { $sum: "$total" } } },
        ]);
        return {
          ...u.toSafeObject(),
          totalOrders: agg[0]?.count || 0,
          totalSpent:  agg[0]?.spent || 0,
        };
      })
    );
    res.json({ users: result });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// GET /api/users/:id/orders — one user's order history (not cached, admin views per-user)
router.get("/:id/orders", adminMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.id }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
