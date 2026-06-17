// routes/auth.js
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authMiddleware, JWT_SECRET } = require("../middleware/auth");
const { verifyGoogleToken } = require("../config/google");

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ error: "All fields are required." });
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters." });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: "Email already registered." });

    const user = await User.create({ firstName, lastName, email, password });
    const token = jwt.sign({ id: user._id, email: user.email, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during registration." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required." });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: "Invalid email or password." });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ error: "Invalid email or password." });

    const token = jwt.sign({ id: user._id, email: user.email, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login." });
  }
});

// POST /api/auth/google — Google OAuth login
router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "Google ID token required." });

    const payload = await verifyGoogleToken(idToken);
    const { email, given_name, family_name, picture, email_verified } = payload;

    if (!email_verified) return res.status(400).json({ error: "Google email not verified." });

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      user = await User.create({
        firstName: given_name || "User",
        lastName: family_name || "",
        email: email.toLowerCase(),
        password: Math.random().toString(36).slice(-12),
        avatar: picture,
      });
    }

    const token = jwt.sign({ id: user._id, email: user.email, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(401).json({ error: "Invalid Google token." });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// PUT /api/auth/profile
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, phone, address, city, pincode } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, phone: phone || null, address: address || null, city: city || null, pincode: pincode || null },
      { new: true, runValidators: true }
    );
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// PUT /api/auth/change-password
router.put("/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    const valid = await user.comparePassword(currentPassword);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect." });
    if (newPassword.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters." });
    user.password = newPassword;
    await user.save();
    res.json({ message: "Password changed successfully." });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;