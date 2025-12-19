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

  return res.json({ success: true, message: 'Objekt archiviert', boxesReturned: result.boxesReturned });
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
