/* ============================================================
   TRAPMAP – AUDIT REPORT CONTROLLER
   API Endpoints für PDF-Report Generierung
   Reports werden pro Objekt in Unterordnern gespeichert
   ============================================================ */

const auditReportService = require("../services/audit-report-generator.service");
const path = require("path");
const fs = require("fs");

// Reports-Basisordner
const REPORTS_DIR = path.join(__dirname, "../reports");

// Sicherstellen dass der Reports-Ordner existiert
function ensureReportsDir(objectId, objectName) {
  // Ordnername bereinigen (keine Sonderzeichen)
  const safeName = (objectName || `Objekt-${objectId}`)
    .replace(/[^a-zA-Z0-9äöüÄÖÜß\-_\s]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 50);
  
  const objectDir = path.join(REPORTS_DIR, `${objectId}_${safeName}`);
  
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(objectDir)) {
    fs.mkdirSync(objectDir, { recursive: true });
  }
  
  return objectDir;
}

// ============================================
// GET /api/audit-reports/:objectId
// PDF Report generieren, speichern und downloaden
// ============================================
exports.generateReport = async (req, res) => {
  try {
    const { objectId } = req.params;
    const organisationId = req.user.organisation_id;

    if (!objectId) {
      return res.status(400).json({ error: "objectId ist erforderlich" });
    }

    console.log(`📄 Generating Audit Report for Object ${objectId}`);

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

    // Objekt-Name für Ordner holen
    const reportData = await auditReportService.loadReportData(
      parseInt(objectId),
      organisationId,
      options
    );
    const objectName = reportData.object?.name || `Objekt-${objectId}`;

    // Dateiname mit Timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T");
    const dateStr = timestamp[0];
    const timeStr = timestamp[1].substring(0, 8);
    const filename = `Audit-Report_${dateStr}_${timeStr}.pdf`;

    // In Objekt-Ordner speichern
    const objectDir = ensureReportsDir(objectId, objectName);
    const filePath = path.join(objectDir, filename);
    
    fs.writeFileSync(filePath, pdfBuffer);
    console.log(`💾 Report saved: ${filePath}`);

    console.log(`✅ Audit Report generated: ${filename} (${pdfBuffer.length} bytes)`);

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
// GET /api/audit-reports/:objectId/list
// Alle gespeicherten Reports für ein Objekt auflisten
// ============================================
exports.listReports = async (req, res) => {
  try {
    const { objectId } = req.params;
    
    // Alle Unterordner durchsuchen die mit objectId beginnen
    if (!fs.existsSync(REPORTS_DIR)) {
      return res.json({ success: true, reports: [] });
    }
    
    const dirs = fs.readdirSync(REPORTS_DIR);
    const objectDir = dirs.find(d => d.startsWith(`${objectId}_`));
    
    if (!objectDir) {
      return res.json({ success: true, reports: [] });
    }
    
    const fullPath = path.join(REPORTS_DIR, objectDir);
    const files = fs.readdirSync(fullPath)
      .filter(f => f.endsWith(".pdf"))
      .map(f => {
        const stats = fs.statSync(path.join(fullPath, f));
        return {
          filename: f,
          created_at: stats.birthtime,
          size_kb: Math.round(stats.size / 1024),
          download_url: `/api/audit-reports/${objectId}/download/${f}`
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return res.json({ 
      success: true, 
      object_id: objectId,
      folder: objectDir,
      reports: files 
    });
    
  } catch (err) {
    console.error("❌ List Reports Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// ============================================
// GET /api/audit-reports/:objectId/download/:filename
// Gespeicherten Report herunterladen
// ============================================
exports.downloadReport = async (req, res) => {
  try {
    const { objectId, filename } = req.params;
    
    // Sicherheitscheck: Kein Path Traversal
    if (filename.includes("..") || filename.includes("/")) {
      return res.status(400).json({ error: "Ungültiger Dateiname" });
    }
    
    const dirs = fs.readdirSync(REPORTS_DIR);
    const objectDir = dirs.find(d => d.startsWith(`${objectId}_`));
    
    if (!objectDir) {
      return res.status(404).json({ error: "Objekt-Ordner nicht gefunden" });
    }
    
    const filePath = path.join(REPORTS_DIR, objectDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Report nicht gefunden" });
    }
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    
    return res.sendFile(filePath);
    
  } catch (err) {
    console.error("❌ Download Report Error:", err);
    return res.status(500).json({ error: err.message });
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