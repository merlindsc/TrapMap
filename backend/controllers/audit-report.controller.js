/* ============================================================
   TRAPMAP – AUDIT REPORT CONTROLLER
   API Endpoints für PDF-Report Generierung
   ============================================================ */

const auditReportService = require("../services/audit-report-generator.service");

// ============================================
// GET /api/audit-reports/:objectId
// PDF Report generieren und downloaden
// ============================================
exports.generateReport = async (req, res) => {
  try {
    const { objectId } = req.params;
    const organisationId = req.user.organisation_id;

    if (!objectId) {
      return res.status(400).json({ error: "objectId ist erforderlich" });
    }

    // Optionen aus Query-Parametern
    const options = {
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      maxScans: parseInt(req.query.maxScans) || 100,
      includeInactive: req.query.includeInactive === "true"
    };

    // PDF generieren
    const pdfBuffer = await auditReportService.generateAuditReport(
      parseInt(objectId),
      organisationId,
      options
    );

    // Dateiname
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `Audit-Report-${objectId}-${timestamp}.pdf`;

    // PDF als Download senden
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    
    return res.send(pdfBuffer);

  } catch (err) {
    console.error("❌ Audit Report Error:", err);
    return res.status(500).json({
      error: "Report konnte nicht erstellt werden",
      details: err.message
    });
  }
};

// ============================================
// GET /api/audit-reports/:objectId/preview
// Report-Daten als JSON (für Vorschau)
// ============================================
exports.getPreviewData = async (req, res) => {
  try {
    const { objectId } = req.params;
    const organisationId = req.user.organisation_id;

    if (!objectId) {
      return res.status(400).json({ error: "objectId ist erforderlich" });
    }

    const options = {
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      maxScans: 50
    };

    // Daten laden
    const data = await auditReportService.loadReportData(
      parseInt(objectId),
      organisationId,
      options
    );

    // Statistiken berechnen
    const stats = {
      totalBoxes: data.boxes.length,
      totalScans: data.scans.length,
      statusDistribution: {
        green: data.boxes.filter((b) => b.current_status === "green").length,
        yellow: data.boxes.filter((b) => b.current_status === "yellow").length,
        orange: data.boxes.filter((b) => b.current_status === "orange").length,
        red: data.boxes.filter((b) => b.current_status === "red").length
      },
      technicians: data.technicians.length,
      boxTypes: [...new Set(data.boxes.map((b) => b.box_type_id).filter(Boolean))].length
    };

    return res.json({
      success: true,
      object: data.object,
      organisation: data.organisation,
      stats,
      generatedAt: data.generatedAt
    });

  } catch (err) {
    console.error("❌ Preview Error:", err);
    return res.status(500).json({ error: err.message });
  }
};