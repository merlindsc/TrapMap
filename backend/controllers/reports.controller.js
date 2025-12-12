// ============================================
// REPORTS CONTROLLER
// Mit FormData Support für Foto-Upload
// ============================================

const reportsService = require("../services/reports.service");

// GET /api/reports/objects
exports.getObjects = async (req, res) => {
  const result = await reportsService.getObjects(req.user.organisation_id);
  if (!result.success) return res.status(400).json({ error: result.message });
  res.json(result.data);
};

// POST /api/reports/audit
exports.generateAuditReport = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    
    // Daten aus FormData oder JSON
    let objectId, startDate, endDate, options;
    
    if (req.is('multipart/form-data')) {
      // FormData
      objectId = req.body.objectId;
      startDate = req.body.startDate;
      endDate = req.body.endDate;
      options = req.body.options ? JSON.parse(req.body.options) : {};
    } else {
      // JSON
      objectId = req.body.objectId;
      startDate = req.body.startDate;
      endDate = req.body.endDate;
      options = req.body.options || {};
    }

    if (!objectId || !startDate || !endDate) {
      return res.status(400).json({ error: "objectId, startDate und endDate erforderlich" });
    }

    console.log(`📄 ====================================`);
    console.log(`📄 AUDIT REPORT GENERIERUNG`);
    console.log(`📄 Object ID: ${objectId}`);
    console.log(`📄 Zeitraum: ${startDate} bis ${endDate}`);
    console.log(`📄 Optionen:`, options);
    console.log(`📄 ====================================`);
    
    // Report-Daten laden
    const dataResult = await reportsService.getReportData(orgId, objectId, startDate, endDate);
    if (!dataResult.success) {
      return res.status(400).json({ error: dataResult.message });
    }

    // Custom Fotos aus Upload verarbeiten
    const customPhotos = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, i) => {
        const captionKey = `caption_${i}`;
        customPhotos.push({
          buffer: file.buffer,
          caption: req.body[captionKey] || ""
        });
      });
      options.customPhotos = customPhotos;
      options.includeCustomPhotos = true;
    }

    // PDF generieren
    const pdfBuffer = await reportsService.generatePDF(dataResult.data, options);
    
    // Filename
    const objectName = dataResult.data.object.name
      .replace(/[^a-zA-Z0-9äöüÄÖÜß\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 30);
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `Audit_${objectName}_${dateStr}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
    
    console.log(`✅ Audit report generated: ${filename}`);
  } catch (err) {
    console.error("generateAuditReport error:", err);
    res.status(500).json({ error: "Fehler beim Generieren: " + err.message });
  }
};

// POST /api/reports/audit/preview
exports.getAuditPreview = async (req, res) => {
  try {
    const { objectId, startDate, endDate } = req.body;
    
    if (!objectId || !startDate || !endDate) {
      return res.status(400).json({ error: "objectId, startDate und endDate erforderlich" });
    }

    const result = await reportsService.getReportData(
      req.user.organisation_id, 
      objectId, 
      startDate, 
      endDate
    );
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    // Foto-Anzahl holen
    const photoResult = await reportsService.getPhotosForReport(
      req.user.organisation_id,
      objectId,
      startDate,
      endDate,
      "count"
    );

    res.json({
      object: result.data.object,
      stats: result.data.stats,
      boxCount: result.data.boxes.length,
      scanCount: result.data.scans.length,
      photoCount: photoResult.count || 0,
      period: result.data.period
    });
  } catch (err) {
    console.error("getAuditPreview error:", err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/reports/gefahrenanalyse
exports.generateGefahrenanalyse = async (req, res) => {
  try {
    const formData = req.body;
    
    console.log(`📄 Generating Gefahrenanalyse`);
    
    const orgResult = await reportsService.getOrganisation(req.user.organisation_id);
    const organisation = orgResult.success ? orgResult.data : null;

    const pdfBuffer = await reportsService.generateGefahrenanalyse(formData, organisation);
    
    const objektName = (formData.objekt?.firma || "Objekt")
      .replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_");
    const filename = `Gefahrenanalyse_${objektName}_${new Date().toISOString().split("T")[0]}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
    
    console.log(`✅ Gefahrenanalyse generated: ${filename}`);
  } catch (err) {
    console.error("generateGefahrenanalyse error:", err);
    res.status(500).json({ error: "Fehler beim Generieren" });
  }
};

// GET /api/reports/organisation
exports.getOrganisation = async (req, res) => {
  const result = await reportsService.getOrganisation(req.user.organisation_id);
  if (!result.success) return res.status(400).json({ error: result.message });
  res.json(result.data);
};

// PUT /api/reports/organisation
exports.updateOrganisation = async (req, res) => {
  const { name, address, zip, city, phone, email, contact_name } = req.body;
  
  const result = await reportsService.updateOrganisation(req.user.organisation_id, {
    name, address, zip, city, phone, email, contact_name
  });
  
  if (!result.success) return res.status(400).json({ error: result.message });
  res.json({ message: "Organisation aktualisiert", data: result.data });
};

// POST /api/reports/logo
exports.uploadLogo = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Keine Datei" });
  
  const result = await reportsService.uploadLogo(
    req.user.organisation_id,
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype
  );
  
  if (!result.success) return res.status(400).json({ error: result.message });
  res.json({ message: "Logo hochgeladen", logoUrl: result.logoUrl });
};

// GET /api/reports/logo
exports.getLogo = async (req, res) => {
  const result = await reportsService.getOrganisationLogo(req.user.organisation_id);
  if (!result.success) return res.status(400).json({ error: result.message });
  res.json({ logoUrl: result.logoUrl });
};