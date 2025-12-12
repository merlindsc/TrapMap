// ============================================
// REPORTS ROUTES
// Mit Multer für Foto-Upload
// ============================================

const express = require("express");
const router = express.Router();
const multer = require("multer");
const reportsController = require("../controllers/reports.controller");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

// Multer Setup
const storage = multer.memoryStorage();

// Für Logo (einzelnes Bild)
const uploadLogo = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Nur Bilder erlaubt'), false);
  }
});

// Für Report-Fotos (mehrere Bilder)
const uploadPhotos = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB pro Datei
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Nur Bilder erlaubt'), false);
  }
});

// Auth für alle Routes
router.use(authenticate);

// ============================================
// OBJECTS
// ============================================
router.get("/objects", asyncHandler(reportsController.getObjects));

// ============================================
// ORGANISATION
// ============================================
router.get("/organisation", asyncHandler(reportsController.getOrganisation));
router.put("/organisation", asyncHandler(reportsController.updateOrganisation));

// ============================================
// LOGO
// ============================================
router.get("/logo", asyncHandler(reportsController.getLogo));
router.post("/logo", uploadLogo.single('logo'), asyncHandler(reportsController.uploadLogo));

// ============================================
// AUDIT REPORTS
// ============================================

// Preview (JSON)
router.post("/audit/preview", asyncHandler(reportsController.getAuditPreview));

// Generate (FormData mit Fotos ODER JSON)
router.post(
  "/audit", 
  uploadPhotos.any(), // Akzeptiert beliebige Felder mit Dateien
  asyncHandler(reportsController.generateAuditReport)
);

// ============================================
// GEFAHRENANALYSE
// ============================================
router.post("/gefahrenanalyse", asyncHandler(reportsController.generateGefahrenanalyse));

module.exports = router;