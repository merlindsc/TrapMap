// ============================================
// PARTNER ROUTES
// Für Partner-Login und Partner-Aktionen
// ============================================

const express = require("express");
const router = express.Router();
const { authenticate, authenticatePartner } = require("../middleware/auth");
const partnerController = require("../controllers/partner.controller");

// ============================================
// ÖFFENTLICHE ROUTES (kein Auth nötig)
// ============================================

// Partner Login
router.post("/login", partnerController.login);

// ============================================
// PARTNER ROUTES (Partner-Token erforderlich)
// ============================================

// Partner Profil
router.get("/me", authenticatePartner, partnerController.getProfile);

// Partner Passwort ändern
router.post("/change-password", authenticatePartner, partnerController.changePassword);

// Partner Objekte
router.get("/my-objects", authenticatePartner, partnerController.getObjects);

// Partner Boxen
router.get("/my-boxes", authenticatePartner, partnerController.getBoxes);

// Scan durchführen
router.post("/scan", authenticatePartner, partnerController.recordScan);

// ============================================
// ADMIN ROUTES (für Organisation - normaler User-Token)
// ============================================

// Alle Partner auflisten
router.get("/", authenticate, partnerController.getAllPartners);

// Partner erstellen
router.post("/", authenticate, partnerController.createPartner);

// Partner aktualisieren
router.put("/:id", authenticate, partnerController.updatePartner);

// Partner löschen
router.delete("/:id", authenticate, partnerController.deletePartner);

module.exports = router;