// ============================================
// REPORTS CONTROLLER - KOMPLETT
// Audit Reports + PDF Generierung
// ============================================

const reportsService = require("../services/reports.service");

// ============================================
// GET OBJECTS (für Dropdown)
// ============================================
exports.getObjects = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const result = await reportsService.getObjects(orgId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    res.json(result.data);
  } catch (err) {
    console.error("getObjects error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// AUDIT REPORT GENERIEREN (PDF)
// ============================================
exports.generateAuditReport = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { objectId, startDate, endDate } = req.body;

    if (!objectId || !startDate || !endDate) {
      return res.status(400).json({ error: "objectId, startDate und endDate erforderlich" });
    }

    console.log(`📄 Generating audit report for object ${objectId}, ${startDate} - ${endDate}`);

    // Daten sammeln
    const dataResult = await reportsService.getReportData(orgId, objectId, startDate, endDate);
    
    if (!dataResult.success) {
      return res.status(400).json({ error: dataResult.message });
    }

    // PDF generieren
    const pdfBuffer = await reportsService.generatePDF(dataResult.data);

    // Dateiname
    const objectName = dataResult.data.object.name.replace(/[^a-zA-Z0-9]/g, "_");
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `Audit_${objectName}_${dateStr}.pdf`;

    // Response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    
    res.send(pdfBuffer);

    console.log(`✅ Audit report generated: ${filename}`);
  } catch (err) {
    console.error("generateAuditReport error:", err);
    res.status(500).json({ error: "Fehler beim Generieren des Reports" });
  }
};

// ============================================
// AUDIT PREVIEW (Statistiken)
// ============================================
exports.getAuditPreview = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { objectId, startDate, endDate } = req.body;

    if (!objectId || !startDate || !endDate) {
      return res.status(400).json({ error: "objectId, startDate und endDate erforderlich" });
    }

    const result = await reportsService.getReportData(orgId, objectId, startDate, endDate);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      object: result.data.object,
      stats: result.data.stats,
      boxCount: result.data.boxes.length,
      period: result.data.period
    });
  } catch (err) {
    console.error("getAuditPreview error:", err);
    res.status(500).json({ error: "Server error" });
  }
};