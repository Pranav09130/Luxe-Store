// server.js — Luxe Store Backend
// Features: MongoDB + Redis caching, JWT auth, Google OAuth,
//           Cloudinary uploads, PDF invoices, Docker-ready
require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const path     = require("path");

const connectMongo        = require("./db/db");
const { connectRedis, isConnected: redisConnected } = require("./db/redis");
const seed                = require("./db/seed");

const authRoutes     = require("./routes/auth");
const productRoutes  = require("./routes/products");
const orderRoutes    = require("./routes/orders");
const userRoutes     = require("./routes/users");
const wishlistRoutes = require("./routes/wishlist");
const invoiceRoutes  = require("./routes/invoice");
const uploadRoutes   = require("./routes/upload");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL || "*",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static frontend ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// ── API routes ───────────────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders",   orderRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/invoice",  invoiceRoutes);
app.use("/api/upload",   uploadRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({
  status:  "OK",
  db:      "MongoDB ✅",
  cache:   redisConnected() ? "Redis ✅" : "Redis ⚠️ (disabled — fallback to MongoDB)",
  time:    new Date(),
}));

// ── SPA catch-all ────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ error: "Route not found" });
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Boot sequence ────────────────────────────────────────────────────────────
(async () => {
  await connectMongo();    // 1. MongoDB (required)
  await connectRedis();    // 2. Redis   (optional — app works without it)
  await seed();            // 3. Seed products + admin if collections empty
  app.listen(PORT, () => {
    console.log(`\n🚀  Luxe Store running at http://localhost:${PORT}`);
    console.log(`   Admin:  admin@luxe.in / Admin@123`);
    console.log(`   Cache:  ${redisConnected() ? "Redis enabled ⚡" : "Redis disabled (install Redis to enable)"}\n`);
  });
})();

module.exports = app;
