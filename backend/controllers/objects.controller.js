// ============================================
// OBJECTS CONTROLLER (GPS ENABLED)
// ============================================

const objectsService = require("../services/objects.service");

// GET all objects (nur aktive, optional mit include_archived=true)
exports.getAll = async (req, res) => {
  const organisationId = req.user.organisation_id;
  const includeArchived = req.query.include_archived === 'true';

  const result = await objectsService.getAll(organisationId, includeArchived);
  if (!result.success) return res.status(500).json({ error: result.message });

  return res.json(result.data);
};

// GET nur archivierte Objekte
exports.getArchived = async (req, res) => {
  const organisationId = req.user.organisation_id;

  const result = await objectsService.getArchived(organisationId);
  if (!result.success) return res.status(500).json({ error: result.message });

  return res.json(result.data);
};

// GET ONE OBJECT
exports.getOne = async (req, res) => {
  const { id } = req.params;
  const organisationId = req.user.organisation_id;

  const result = await objectsService.getOne(id, organisationId);
  if (!result.success) return res.status(404).json({ error: result.message });

  return res.json(result.data);
};

// CREATE
exports.create = async (req, res) => {
  const organisationId = req.user.organisation_id;
  const objectData = req.body;

  const result = await objectsService.create(organisationId, objectData);
  if (!result.success) return res.status(500).json({ error: result.message });

  return res.status(201).json(result.data);
};

// UPDATE OBJECT
exports.update = async (req, res) => {
  const { id } = req.params;
  const organisationId = req.user.organisation_id;

  const result = await objectsService.update(id, organisationId, req.body);
  if (!result.success) return res.status(500).json({ error: result.message });

  return res.json(result.data);
};

// DELETE
exports.remove = async (req, res) => {
  const { id } = req.params;
  const organisationId = req.user.organisation_id;

  const result = await objectsService.remove(id, organisationId);
  if (!result.success) return res.status(500).json({ error: result.message });

  return res.json({ success: true });
};

// ============================================
// ARCHIVE OBJECT
// ============================================
exports.archive = async (req, res) => {
  const { id } = req.params;
  const organisationId = req.user.organisation_id;
  const userId = req.user.id;
  const { reason } = req.body;

  const result = await objectsService.archive(id, organisationId, userId, reason);
  if (!result.success) return res.status(500).json({ error: result.message });

  return res.json({ 
    success: true, 
    message: 'Objekt archiviert', 
    boxesReturned: result.boxesReturned
  });
};

// ============================================
// GENERATE ARCHIVE PDF REPORT
// Verwendet den gleichen Report-Generator wie Audit-Reports
// ============================================
exports.generateArchiveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const organisationId = req.user.organisation_id;
    
    console.log(`📄 Generating Archive Report for Object ${id}`);
    
    // Verwende den professionellen Audit-Report-Generator
    const auditReportService = require("../services/audit-report-generator.service");
    const { supabase } = require('../config/supabase');
    
    // Prüfe ob Objekt archiviert ist
    const { data: object, error: objectError } = await supabase
      .from("objects")
      .select("*")
      .eq("id", id)
      .eq("organisation_id", organisationId)
      .single();
      
    if (objectError || !object || !object.archived_at) {
      return res.status(404).json({ error: 'Archiviertes Objekt nicht gefunden' });
    }
    
    // PDF mit dem gleichen Generator wie Audit-Reports erstellen
    const pdfBuffer = await auditReportService.generateAuditReport(
      parseInt(id),
      organisationId,
      {
        dateFrom: null,
        dateTo: null,
        maxScans: 1000, // Alle Scans für Archiv
        includeInactive: true
      }
    );
    
    // Dateiname
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `Archiv-${object.name.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.pdf`;
    
    console.log(`✅ Archive Report generated: ${filename} (${pdfBuffer.length} bytes)`);
    
    // PDF als Download senden
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    
    return res.send(pdfBuffer);
    
  } catch (error) {
    console.error('❌ Error generating archive report:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Fehler beim Erstellen des Berichts', details: error.message });
    }
  }
};

// ============================================
// RESTORE ARCHIVED OBJECT
// ============================================
exports.restore = async (req, res) => {
  const { id } = req.params;
  const organisationId = req.user.organisation_id;
  const userId = req.user.id;

  const result = await objectsService.restore(id, organisationId, userId);
  if (!result.success) return res.status(500).json({ error: result.message });

  return res.json({ success: true, message: 'Objekt wiederhergestellt' });
};

// ============================================
// RELEASE UNPLACED BOXES
// ============================================
exports.releaseUnplacedBoxes = async (req, res) => {
  const { id } = req.params;
  const organisationId = req.user.organisation_id;

  const result = await objectsService.releaseUnplacedBoxes(id, organisationId);
  if (!result.success) return res.status(500).json({ error: result.message });

  return res.json({ 
    success: true, 
    message: `${result.count} unplatzierte Boxen freigegeben`,
    count: result.count 
  });
};

// ============================================
// GPS EDIT TOGGLE
// ============================================
exports.toggleGPSEdit = async (req, res) => {
  const organisationId = req.user.organisation_id;
  const { id } = req.params;
  const { enabled } = req.body;

  const result = await objectsService.setGPSEditEnabled(id, organisationId, enabled);

  if (!result.success) return res.status(400).json({ error: result.message });

  return res.json({ success: true, gps_edit_enabled: enabled });
};

// ============================================
// UPDATE OBJECT LOCATION (Admin Only)
// ============================================
exports.updateLocation = async (req, res) => {
  const organisationId = req.user.organisation_id;
  const { id } = req.params;
  const { lat, lng } = req.body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "lat and lng must be numbers" });
  }

  const result = await objectsService.updateLocation(id, organisationId, lat, lng);

  if (!result.success) return res.status(400).json({ error: result.message });

  return res.json({
    success: true,
    lat,
    lng
  });
};
