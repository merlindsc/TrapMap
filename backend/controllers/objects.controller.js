// ============================================
// OBJECTS CONTROLLER (GPS ENABLED)
// ============================================

const objectsService = require("../services/objects.service");

// GET all objects
exports.getAll = async (req, res) => {
  const organisationId = req.user.organisation_id;

  const result = await objectsService.getAll(organisationId);
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
