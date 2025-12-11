const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const qr = require("../controllers/qr.controller");

// QR-Codes generieren (Admin)
router.post("/generate", authenticate, qr.generate);

// QR-Code prüfen (existiert? zugewiesen?)
router.get("/check/:code", authenticate, qr.check);

// QR-Code einer Box zuweisen
router.post("/assign", authenticate, qr.assign);

// QR-Code von Box trennen
router.delete("/unassign/:box_id", authenticate, qr.unassign);

// QR-Code für eine Box abfragen
router.get("/box/:box_id", authenticate, qr.getByBox);

module.exports = router;