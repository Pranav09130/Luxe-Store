const express = require("express");
const PDFDocument = require("pdfkit");
const Order = require("../models/Order");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

const router = express.Router();

// GET /api/invoice/:orderId — Generate PDF invoice for an order
router.get("/:orderId", authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate("user", "firstName lastName email");
    if (!order) return res.status(404).json({ error: "Order not found." });

    // Only owner or admin can download invoice
    if (order.user._id.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: "Access denied." });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ error: "Cannot generate invoice for cancelled order." });
    }

    // Generate PDF
    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${order.orderNumber}.pdf"`);

    doc.pipe(res);

    // Header
    doc.fontSize(28).font("Helvetica-Bold").fillColor("#1a1a1a").text("LUXE.", 50, 50);
    doc.fontSize(10).font("Helvetica").fillColor("#666").text("Premium E-Commerce", 50, 80);

    // Invoice title
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#1a1a1a").text("INVOICE", 50, 120);

    // Invoice details
    const startY = 160;
    doc.fontSize(10).font("Helvetica").fillColor("#333");
    doc.text(`Invoice #: ${order.orderNumber}`, 50, startY);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, 50, startY + 18);
    doc.text(`Status: ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}`, 50, startY + 36);
    doc.text(`Payment: ${order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}`, 50, startY + 54);

    // Bill to
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#1a1a1a").text("Bill To:", 50, startY + 90);
    doc.fontSize(10).font("Helvetica").fillColor("#333");
    doc.text(`${order.user.firstName} ${order.user.lastName}`, 50, startY + 108);
    doc.text(order.user.email, 50, startY + 126);
    if (order.shippingAddr) {
      doc.text(order.shippingAddr, 50, startY + 144);
      if (order.shippingName) doc.text(order.shippingName, 50, startY + 162);
    }

    // Table header
    const tableTop = startY + 200;
    const col1 = 50, col2 = 200, col3 = 350, col4 = 420, col5 = 500;

    doc.fontSize(10).font("Helvetica-Bold").fillColor("#fff");
    doc.rect(col1, tableTop, 500, 25).fill("#1a1a1a");
    doc.fillColor("#fff").text("Item", col1 + 5, tableTop + 8);
    doc.text("Price", col2 + 5, tableTop + 8);
    doc.text("Qty", col3 + 5, tableTop + 8);
    doc.text("Total", col4 + 5, tableTop + 8);

    // Table rows
    let y = tableTop + 25;
    order.items.forEach((item, i) => {
      const rowHeight = 30;
      if (i % 2 === 0) {
        doc.rect(col1, y, 500, rowHeight).fill("#f9f9f9");
      }
      doc.fontSize(9).font("Helvetica").fillColor("#333");
      doc.text(item.productName, col1 + 5, y + 8, { width: 140 });
      doc.text(`₹${item.price.toLocaleString("en-IN")}`, col2 + 5, y + 8);
      doc.text(item.qty.toString(), col3 + 5, y + 8);
      doc.text(`₹${(item.price * item.qty).toLocaleString("en-IN")}`, col4 + 5, y + 8);
      y += rowHeight;
    });

    // Totals
    y += 20;
    doc.fontSize(10).font("Helvetica").fillColor("#333");
    doc.text("Subtotal:", col3, y);
    doc.text(`₹${order.subtotal.toLocaleString("en-IN")}`, col4 + 5, y);

    y += 22;
    doc.text("Shipping:", col3, y);
    doc.text("FREE", col4 + 5, y);

    y += 22;
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a1a1a");
    doc.text("Total:", col3, y);
    doc.text(`₹${order.total.toLocaleString("en-IN")}`, col4 + 5, y);

    // Footer
    y += 60;
    doc.fontSize(9).font("Helvetica").fillColor("#888");
    doc.text("Thank you for shopping at Luxe Store!", 50, y, { align: "center", width: 500 });
    doc.text("For support, contact us at support@luxe.in", 50, y + 16, { align: "center", width: 500 });

    doc.end();
  } catch (err) {
    console.error("Invoice generation error:", err);
    res.status(500).json({ error: "Failed to generate invoice." });
  }
});

module.exports = router;