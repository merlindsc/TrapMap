/* ============================================================
   TRAPMAP – AUDIT REPORT ROUTES
   API-Endpoints für PDF-Report Generierung
   ============================================================ */

const express = require("express");
const router = express.Router();
const auditReportController = require("../controllers/audit-report.controller");
const { authenticate } = require("../middleware/auth");

// Alle Routen erfordern Authentifizierung
router.use(authenticate);

// GET /api/audit-reports/:objectId
// Generiert PDF-Report für ein Objekt
router.get("/:objectId", auditReportController.generateReport);

// GET /api/audit-reports/:objectId/preview
// Lädt Preview-Daten für den Report
router.get("/:objectId/preview", auditReportController.getPreviewData);

module.exports = router;