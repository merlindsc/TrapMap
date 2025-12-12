// ============================================
// AUDIT ROUTES
// API-Endpoints für Audit-Abfragen & Export
// ============================================

const express = require("express");
const router = express.Router();
const { authenticate, requireAdmin, requireEditor } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const auditController = require("../controllers/audit.controller");

// ============================================
// AUDIT LOGS ABFRAGEN
// ============================================

// Alle Audit-Logs (mit Filtern)
router.get(
  "/logs",
  authenticate,
  requireEditor,
  asyncHandler(auditController.getLogs)
);

// Audit-Statistiken
router.get(
  "/stats",
  authenticate,
  requireEditor,
  asyncHandler(auditController.getStats)
);

// ============================================
// BOX HISTORY
// ============================================

// Vollständige Box-Historie
router.get(
  "/box/:boxId/history",
  authenticate,
  asyncHandler(auditController.getBoxHistory)
);

// Location-Historie einer Box
router.get(
  "/box/:boxId/locations",
  authenticate,
  asyncHandler(auditController.getBoxLocationHistory)
);

// Assignment-Historie einer Box
router.get(
  "/box/:boxId/assignments",
  authenticate,
  asyncHandler(auditController.getBoxAssignmentHistory)
);

// ============================================
// USER ACTIVITY
// ============================================

// User-Aktivitäten
router.get(
  "/user-activity",
  authenticate,
  requireAdmin,
  asyncHandler(auditController.getUserActivity)
);

// Aktivitäten eines bestimmten Users
router.get(
  "/user-activity/:userId",
  authenticate,
  requireAdmin,
  asyncHandler(auditController.getUserActivityById)
);

// ============================================
// EXPORT
// ============================================

// Audit als CSV exportieren
router.post(
  "/export/csv",
  authenticate,
  requireEditor,
  asyncHandler(auditController.exportCSV)
);

// Audit als JSON exportieren
router.post(
  "/export/json",
  authenticate,
  requireEditor,
  asyncHandler(auditController.exportJSON)
);

// Export-History
router.get(
  "/exports",
  authenticate,
  requireEditor,
  asyncHandler(auditController.getExportHistory)
);

// ============================================
// SETTINGS (Admin only)
// ============================================

// Retention-Einstellungen abrufen
router.get(
  "/settings",
  authenticate,
  requireAdmin,
  asyncHandler(auditController.getSettings)
);

// Retention-Einstellungen ändern
router.put(
  "/settings",
  authenticate,
  requireAdmin,
  asyncHandler(auditController.updateSettings)
);

// Verfügbare Retention-Optionen
router.get(
  "/retention-options",
  authenticate,
  asyncHandler(auditController.getRetentionOptions)
);

// ============================================
// COMPLIANCE
// ============================================

// Compliance-Report generieren
router.post(
  "/compliance-report",
  authenticate,
  requireEditor,
  asyncHandler(auditController.generateComplianceReport)
);

module.exports = router;