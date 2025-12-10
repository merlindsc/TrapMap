// ============================================
// REPORTS CONTROLLER
// Audit + Gefahrenanalyse + Logo + Org Update
// ============================================

const reportsService = require("../services/reports.service");

exports.getObjects = async (req, res) => {
  const result = await reportsService.getObjects(req.user.organisation_id);
  if (!result.success) return res.status(400).json({ error: result.message });
  res.json(result.data);
};

exports.generateAuditReport = async (req, res) => {
  try {
    const { objectId, startDate, endDate } = req.body;
    if (!objectId || !startDate || !endDate) {
      return res.status(400).json({ error: "objectId, startDate und endDate erforderlich" });
    }

    console.log(`📄 Generating audit report for object ${objectId}`);
    
    const dataResult = await reportsService.getReportData(req.user.organisation_id, objectId, startDate, endDate);
    if (!dataResult.success) return res.status(400).json({ error: dataResult.message });

    const pdfBuffer = await reportsService.generatePDF(dataResult.data);
    const objectName = dataResult.data.object.name.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_");
    const filename = `Audit_${objectName}_${new Date().toISOString().split("T")[0]}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
    
    console.log(`✅ Audit report generated: ${filename}`);
  } catch (err) {
    console.error("generateAuditReport error:", err);
    res.status(500).json({ error: "Fehler beim Generieren" });
  }
};

exports.getAuditPreview = async (req, res) => {
  const { objectId, startDate, endDate } = req.body;
  if (!objectId || !startDate || !endDate) {
    return res.status(400).json({ error: "objectId, startDate und endDate erforderlich" });
  }

  const result = await reportsService.getReportData(req.user.organisation_id, objectId, startDate, endDate);
  if (!result.success) return res.status(400).json({ error: result.message });

  res.json({
    object: result.data.object,
    stats: result.data.stats,
    boxCount: result.data.boxes.length,
    period: result.data.period
  });
};

// ============================================
// GEFAHRENANALYSE
// ============================================
exports.generateGefahrenanalyse = async (req, res) => {
  try {
    const formData = req.body;
    
    console.log(`📄 Generating Gefahrenanalyse for org ${req.user.organisation_id}`);
    
    const orgResult = await reportsService.getOrganisation(req.user.organisation_id);
    const organisation = orgResult.success ? orgResult.data : null;

    const pdfBuffer = await reportsService.generateGefahrenanalyse(formData, organisation);
    
    const objektName = (formData.objekt?.firma || "Objekt").replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_");
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

// ============================================
// ORGANISATION
// ============================================
exports.getOrganisation = async (req, res) => {
  const result = await reportsService.getOrganisation(req.user.organisation_id);
  if (!result.success) return res.status(400).json({ error: result.message });
  res.json(result.data);
};

exports.updateOrganisation = async (req, res) => {
  const { name, address, zip, city, phone, email, contact_name } = req.body;
  
  const result = await reportsService.updateOrganisation(req.user.organisation_id, {
    name, address, zip, city, phone, email, contact_name
  });
  
  if (!result.success) return res.status(400).json({ error: result.message });
  res.json({ message: "Organisation aktualisiert", data: result.data });
};

// ============================================
// LOGO
// ============================================
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

exports.getLogo = async (req, res) => {
  const result = await reportsService.getOrganisationLogo(req.user.organisation_id);
  if (!result.success) return res.status(400).json({ error: result.message });
  res.json({ logoUrl: result.logoUrl });
};