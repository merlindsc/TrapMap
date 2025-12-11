/* ============================================================
   TRAPMAP – PARTNER CONTROLLER
   API Endpunkte für Partner-Verwaltung
   ============================================================ */

const partnerService = require('../services/partner.service');

// ============================================
// PARTNER LOGIN (öffentlich)
// ============================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
    }

    const result = await partnerService.loginPartner(email, password);
    res.json(result);
  } catch (err) {
    console.error('Partner login error:', err);
    res.status(401).json({ error: err.message });
  }
};

// ============================================
// PARTNER PASSWORT ÄNDERN
// ============================================
exports.changePassword = async (req, res) => {
  try {
    if (!req.partner) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Aktuelles und neues Passwort erforderlich' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Neues Passwort muss mindestens 6 Zeichen haben' });
    }

    await partnerService.changePartnerPassword(req.partner.id, currentPassword, newPassword);
    res.json({ success: true, message: 'Passwort erfolgreich geändert' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(400).json({ error: err.message });
  }
};

// ============================================
// PARTNER PROFIL (für eingeloggten Partner)
// ============================================
exports.getProfile = async (req, res) => {
  try {
    // req.partner wird von der Auth-Middleware gesetzt
    if (!req.partner) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    const objects = await partnerService.getPartnerObjects(req.partner.id);
    
    res.json({
      id: req.partner.id,
      email: req.partner.email,
      name: req.partner.name,
      company: req.partner.company,
      objects
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// PARTNER OBJEKTE ABRUFEN
// ============================================
exports.getObjects = async (req, res) => {
  try {
    if (!req.partner) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    const objects = await partnerService.getPartnerObjects(req.partner.id);
    res.json(objects);
  } catch (err) {
    console.error('Get objects error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// PARTNER BOXEN ABRUFEN
// ============================================
exports.getBoxes = async (req, res) => {
  try {
    if (!req.partner) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    const { object_id } = req.query;
    const boxes = await partnerService.getPartnerBoxes(req.partner.id, object_id);
    res.json(boxes);
  } catch (err) {
    console.error('Get boxes error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// SCAN ALS PARTNER DURCHFÜHREN
// ============================================
exports.recordScan = async (req, res) => {
  try {
    if (!req.partner) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    const { box_id, status, notes, findings } = req.body;

    if (!box_id) {
      return res.status(400).json({ error: 'Box-ID erforderlich' });
    }

    const scan = await partnerService.recordPartnerScan(req.partner.id, box_id, {
      status,
      notes,
      findings
    });

    res.json(scan);
  } catch (err) {
    console.error('Record scan error:', err);
    res.status(403).json({ error: err.message });
  }
};

// ============================================
// === ADMIN FUNKTIONEN (für Organisation) ===
// ============================================

// Alle Partner der Organisation
exports.getAllPartners = async (req, res) => {
  try {
    const organisationId = req.user.organisation_id;
    const partners = await partnerService.getPartnersByOrganisation(organisationId);
    res.json(partners);
  } catch (err) {
    console.error('Get all partners error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Partner erstellen
exports.createPartner = async (req, res) => {
  try {
    const organisationId = req.user.organisation_id;
    const { email, password, name, company, phone, objectIds } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'E-Mail, Passwort und Name erforderlich' });
    }

    const partner = await partnerService.createPartner(organisationId, {
      email,
      password,
      name,
      company,
      phone,
      objectIds
    });

    res.status(201).json(partner);
  } catch (err) {
    console.error('Create partner error:', err);
    res.status(400).json({ error: err.message });
  }
};

// Partner aktualisieren
exports.updatePartner = async (req, res) => {
  try {
    const organisationId = req.user.organisation_id;
    const { id } = req.params;

    const partner = await partnerService.updatePartner(id, organisationId, req.body);
    res.json(partner);
  } catch (err) {
    console.error('Update partner error:', err);
    res.status(400).json({ error: err.message });
  }
};

// Partner löschen
exports.deletePartner = async (req, res) => {
  try {
    const organisationId = req.user.organisation_id;
    const { id } = req.params;

    await partnerService.deletePartner(id, organisationId);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete partner error:', err);
    res.status(400).json({ error: err.message });
  }
};