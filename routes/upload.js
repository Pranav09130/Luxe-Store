const express = require("express");
const multer = require("multer");
const { adminMiddleware } = require("../middleware/auth");
const { uploadImage } = require("../config/cloudinary");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
  },
});

// POST /api/upload/image — Upload product image to Cloudinary
router.post("/image", adminMiddleware, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image file provided." });

    const result = await uploadImage(req.file.buffer, "luxe-store/products");
    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to upload image." });
  }
});

// DELETE /api/upload/image/:publicId — Delete image from Cloudinary
router.delete("/image/:publicId", adminMiddleware, async (req, res) => {
  try {
    const { deleteImage } = require("../config/cloudinary");
    await deleteImage(req.params.publicId);
    res.json({ message: "Image deleted successfully." });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete image." });
  }
});

module.exports = router;