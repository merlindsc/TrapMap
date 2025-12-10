// ============================================
// REPORTS ROUTES
// Audit + Gefahrenanalyse + Logo + Org
// ============================================

const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reports.controller");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Nur Bilder erlaubt'), false);
  }
});

router.use(authenticate);

// Objects für Report-Auswahl
router.get("/objects", asyncHandler(reportsController.getObjects));

// Organisation
router.get("/organisation", asyncHandler(reportsController.getOrganisation));
router.put("/organisation", asyncHandler(reportsController.updateOrganisation));

// Audit Reports
router.post("/audit", asyncHandler(reportsController.generateAuditReport));
router.post("/audit/preview", asyncHandler(reportsController.getAuditPreview));

// Gefahrenanalyse
router.post("/gefahrenanalyse", asyncHandler(reportsController.generateGefahrenanalyse));

// Logo
router.post("/logo", upload.single('logo'), asyncHandler(reportsController.uploadLogo));
router.get("/logo", asyncHandler(reportsController.getLogo));

module.exports = router;