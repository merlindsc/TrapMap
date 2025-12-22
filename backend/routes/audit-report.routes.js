/* ============================================================
   TRAPMAP – AUDIT REPORT ROUTES
   API-Endpoints für PDF-Report Generierung
   Reports werden pro Objekt in Unterordnern gespeichert
   ============================================================ */

const express = require("express");
const router = express.Router();
const auditReportController = require("../controllers/audit-report.controller");
const { authenticate } = require("../middleware/auth");

// Alle Routen erfordern Authentifizierung
router.use(authenticate);

// GET /api/audit-reports/:objectId
// Generiert PDF-Report für ein Objekt und speichert ihn
router.get("/:objectId", auditReportController.generateReport);

// GET /api/audit-reports/:objectId/list
// Listet alle gespeicherten Reports für ein Objekt
router.get("/:objectId/list", auditReportController.listReports);

// GET /api/audit-reports/:objectId/download/:filename
// Lädt einen gespeicherten Report herunter
router.get("/:objectId/download/:filename", auditReportController.downloadReport);

// GET /api/audit-reports/:objectId/preview
// Lädt Preview-Daten für den Report
router.get("/:objectId/preview", auditReportController.getPreviewData);

module.exports = router;