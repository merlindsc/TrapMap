// ============================================
// PHOTOS CONTROLLER
// Endpoints für Foto-Upload und -Verwaltung
// ============================================

const photosService = require("../services/photos.service");

// POST /api/photos/upload
exports.upload = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const userId = req.user.id;
    
    // Datei prüfen
    if (!req.file) {
      return res.status(400).json({ error: "Keine Datei hochgeladen" });
    }

    // Parameter aus Body
    const { object_id, photo_type, description } = req.body;

    if (!object_id) {
      return res.status(400).json({ error: "object_id erforderlich" });
    }

    // Upload durchführen
    const result = await photosService.uploadPhoto(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      object_id,
      photo_type,
      description,
      orgId,
      userId
    );

    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }

    return res.status(201).json(result.data);
  } catch (err) {
    console.error("📷 Upload Controller Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/photos/object/:objectId
exports.getForObject = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { objectId } = req.params;

    const result = await photosService.getPhotosForObject(objectId, orgId);

    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }

    return res.json(result.data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/photos
exports.getAll = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { photo_type, limit } = req.query;

    const result = await photosService.getAllPhotos(orgId, {
      photoType: photo_type,
      limit: limit ? parseInt(limit) : undefined
    });

    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }

    return res.json(result.data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/photos/:id
exports.delete = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { id } = req.params;

    const result = await photosService.deletePhoto(id, orgId);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json({ message: "Foto gelöscht" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};