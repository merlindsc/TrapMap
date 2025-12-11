// ============================================
// QR-ORDER ROUTES
// Für QR-Code Bestellungen (Super-Admin Bereich)
// ============================================

const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const qrOrderController = require("../controllers/qr-order.controller");

// Super-Admin Check Middleware mit DEBUG
const superAdminOnly = (req, res, next) => {
  const allowedEmails = [
    "admin@demo.trapmap.de",
    "merlin@trapmap.de",
    "hilfe@die-schaedlingsexperten.de"
  ];
  
  // DEBUG: Was ist im req.user?
  console.log("🔍 SuperAdmin Check:");
  console.log("   req.user:", JSON.stringify(req.user, null, 2));
  console.log("   email:", req.user?.email);
  console.log("   allowed:", allowedEmails.includes(req.user?.email));
  
  if (!req.user?.email || !allowedEmails.includes(req.user.email)) {
    console.log("   ❌ REJECTED - email not in allowedEmails");
    return res.status(403).json({ error: "Keine Berechtigung" });
  }
  
  console.log("   ✅ ALLOWED");
  next();
};

// Alle Routes brauchen Auth + SuperAdmin
router.use(authenticate);
router.use(superAdminOnly);

// ============================================
// PREIS BERECHNUNG
// ============================================
router.get("/price", qrOrderController.calculatePrice);

// ============================================
// STATISTIKEN
// ============================================
router.get("/stats", qrOrderController.getAllOrganisationsStats);
router.get("/stats/:organisationId", qrOrderController.getOrganisationStats);

// ============================================
// ORGANISATIONS-PRÄFIX
// ============================================
router.get("/prefix/:organisationId", qrOrderController.getOrganisationPrefix);
router.put("/prefix/:organisationId", qrOrderController.setOrganisationPrefix);

// ============================================
// BESTELLUNGEN
// ============================================
router.get("/orders", qrOrderController.getOrders);
router.post("/", qrOrderController.createOrder);
router.post("/generate/:orderId", qrOrderController.generateCodes);
router.get("/download/:orderId", qrOrderController.downloadPDF);
router.post("/send/:orderId", qrOrderController.sendByEmail);

// ============================================
// ⭐ KOMPLETTER WORKFLOW (Ein-Klick!)
// ============================================
router.post("/process", qrOrderController.processCompleteOrder);

module.exports = router;