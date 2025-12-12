// ============================================
// QR ROUTES - KOMPLETT
// ============================================

const express = require("express");
const router = express.Router();
const { authenticate, requireEditor } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const qrController = require("../controllers/qr.controller");

// ============================================
// READ ROUTES
// ============================================

// Alle Codes der Organisation (mit Box-Daten)
router.get("/codes", authenticate, asyncHandler(qrController.getAll));

// Freie Boxen im Pool
router.get("/codes/available", authenticate, asyncHandler(qrController.getAvailable));

// Code prüfen
router.get("/check/:code", authenticate, asyncHandler(qrController.check));

// ============================================
// WRITE ROUTES
// ============================================

// ENTFERNT: QR-Codes generieren - NUR über Super-Admin QR-Order System!
// router.post("/generate", authenticate, requireEditor, asyncHandler(qrController.generate));

// QR Code einer Box zuweisen (Legacy)
router.post("/assign", authenticate, requireEditor, asyncHandler(qrController.assign));

// Box einem Objekt zuweisen
router.post("/assign-object", authenticate, requireEditor, asyncHandler(qrController.assignToObject));

// Box zurück in Pool
router.post("/return-to-pool", authenticate, requireEditor, asyncHandler(qrController.returnToPool));

// Box zu anderem Objekt verschieben
router.post("/move", authenticate, requireEditor, asyncHandler(qrController.moveToObject));

module.exports = router;