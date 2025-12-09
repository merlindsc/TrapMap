// ============================================
// REPORTS ROUTES - KOMPLETT
// Audit Reports + PDF Generierung
// ============================================

const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reports.controller");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

// Alle Routes brauchen Auth
router.use(authenticate);

// ============================================
// AUDIT REPORT ROUTES
// ============================================

// Objekte für Dropdown
router.get("/objects", asyncHandler(reportsController.getObjects));

// Audit Report generieren (PDF)
router.post("/audit", asyncHandler(reportsController.generateAuditReport));

// Audit Vorschau (Statistiken)
router.post("/audit/preview", asyncHandler(reportsController.getAuditPreview));

module.exports = router;