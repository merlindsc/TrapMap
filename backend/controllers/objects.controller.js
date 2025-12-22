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
  const { reason, generate_pdf } = req.body;

  const result = await objectsService.archive(id, organisationId, userId, reason, generate_pdf);
  if (!result.success) return res.status(500).json({ error: result.message });

  // Speichere Archiv-Daten temporär für PDF-Generierung (optional)
  if (generate_pdf && result.archiveData) {
    // Speichere in temporärem Store oder Cache
    global.archiveDataCache = global.archiveDataCache || new Map();
    global.archiveDataCache.set(id, result.archiveData);
    
    // Automatisch nach 10 Minuten löschen
    setTimeout(() => {
      if (global.archiveDataCache) {
        global.archiveDataCache.delete(id);
      }
    }, 10 * 60 * 1000);
  }

  return res.json({ 
    success: true, 
    message: 'Objekt archiviert', 
    boxesReturned: result.boxesReturned,
    reportGenerated: result.reportGenerated,
    pdfUrl: generate_pdf ? `/api/objects/${id}/archive-report` : null
  });
};

// ============================================
// GENERATE ARCHIVE PDF REPORT
// ============================================
exports.generateArchiveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const organisationId = req.user.organisation_id;
    
    // Hole Archiv-Daten aus Cache oder direkt aus DB
    let archiveData = global.archiveDataCache?.get(id);
    
    if (!archiveData) {
      // Fallback: Hole Daten aus DB
      const { supabase } = require('../config/supabase');
      
      const { data: object } = await supabase
        .from("objects")
        .select("*")
        .eq("id", id)
        .eq("organisation_id", organisationId)
        .single();
        
      if (!object || !object.archived_at) {
        return res.status(404).json({ error: 'Archiviertes Objekt nicht gefunden' });
      }
      
      archiveData = {
        object,
        boxes: [],
        scans: [],
        reason: object.archive_reason,
        archived_at: object.archived_at,
        boxes_returned: 0
      };
    }
    
    // PDF generieren
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    
    // Stream setup
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Archiv_${archiveData.object.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    
    doc.pipe(res);
    
    // PDF Inhalt
    doc.fontSize(20).text('ARCHIV-BERICHT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(archiveData.object.name, { align: 'center' });
    doc.moveDown(2);
    
    // Archivierungs-Info
    doc.fontSize(12).text('Archivierungsdatum:', { continued: true })
       .fontSize(10).text(` ${new Date(archiveData.archived_at).toLocaleString('de-DE')}`);
    
    if (archiveData.reason) {
      doc.fontSize(12).text('Grund:', { continued: true })
         .fontSize(10).text(` ${archiveData.reason}`);
    }
    
    doc.moveDown();
    doc.fontSize(12).text(`Boxen ins Lager zurückgelegt: ${archiveData.boxes_returned}`);
    doc.moveDown(2);
    
    // Objekt-Details
    doc.fontSize(14).text('OBJEKT-DETAILS', { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    
    if (archiveData.object.address) {
      doc.text(`Adresse: ${archiveData.object.address}`);
    }
    if (archiveData.object.contact_name) {
      doc.text(`Kontakt: ${archiveData.object.contact_name}`);
    }
    if (archiveData.object.contact_phone) {
      doc.text(`Telefon: ${archiveData.object.contact_phone}`);
    }
    if (archiveData.object.contact_email) {
      doc.text(`E-Mail: ${archiveData.object.contact_email}`);
    }
    if (archiveData.object.notes) {
      doc.moveDown();
      doc.text('Notizen:');
      doc.text(archiveData.object.notes, { indent: 20 });
    }
    
    doc.moveDown(2);
    
    // Boxen-Übersicht
    if (archiveData.boxes && archiveData.boxes.length > 0) {
      doc.fontSize(14).text('BOXEN-ÜBERSICHT', { underline: true });
      doc.moveDown();
      doc.fontSize(10);
      
      archiveData.boxes.forEach((box, idx) => {
        doc.text(`${idx + 1}. ${box.qr_code || 'Box #' + box.id} - ${box.box_type?.name || 'Kein Typ'}`);
      });
      
      doc.moveDown(2);
    }
    
    // Scan-Statistiken
    if (archiveData.scans && archiveData.scans.length > 0) {
      doc.fontSize(14).text('SCAN-AKTIVITÄTEN', { underline: true });
      doc.moveDown();
      doc.fontSize(10);
      doc.text(`Gesamt-Scans: ${archiveData.scans.length}`);
      doc.text(`Erster Scan: ${new Date(archiveData.scans[archiveData.scans.length - 1]?.scanned_at).toLocaleDateString('de-DE')}`);
      doc.text(`Letzter Scan: ${new Date(archiveData.scans[0]?.scanned_at).toLocaleDateString('de-DE')}`);
    }
    
    // Footer
    doc.moveDown(3);
    doc.fontSize(8).fillColor('#666')
       .text(`Erstellt am ${new Date().toLocaleString('de-DE')} mit TrapMap`, { align: 'center' });
    
    doc.end();
    
  } catch (error) {
    console.error('Error generating archive report:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Fehler beim Erstellen des Berichts' });
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
