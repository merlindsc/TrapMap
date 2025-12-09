// ============================================
// LAYOUTS CONTROLLER (Optimiert)
// ============================================

const layoutsService = require("../services/layouts.service");

/**
 * GET /api/layouts?object_id=X
 * Liest alle Lagepläne eines Objekts (max. 10)
 */
const getAll = async (req, res) => {
  const { object_id } = req.query;
  const { organisation_id } = req.user;

  if (!object_id) {
    return res.status(400).json({
      error: "Bad Request",
      message: "object_id query parameter is required",
    });
  }

  const result = await layoutsService.getAll(object_id, organisation_id);

  if (!result.success) {
    return res.status(result.statusCode || 500).json({
      error: result.error || "Internal Server Error",
      message: result.message,
    });
  }

  return res.json(result.data); // <-- direktes Objekt-Array zurückgeben
};

/**
 * GET /api/layouts/:id
 * Einzelnen Lageplan lesen
 */
const getOne = async (req, res) => {
  const { id } = req.params;
  const { organisation_id } = req.user;

  const result = await layoutsService.getOne(id, organisation_id);

  if (!result.success) {
    return res.status(result.statusCode || 404).json({
      error: result.error || "Not Found",
      message: result.message,
    });
  }

  return res.json(result.data); // <-- direkt Layout zurückgeben
};

/**
 * POST /api/layouts
 * Lageplan erstellen
 */
const create = async (req, res) => {
  const { organisation_id } = req.user;
  const layoutData = req.body;

  // Pflichtfelder prüfen
  const required = ["object_id", "name", "image_url", "width", "height"];
  const missing = required.filter((f) => !layoutData[f]);

  if (missing.length > 0) {
    return res.status(400).json({
      error: "Bad Request",
      message: `Missing required fields: ${missing.join(", ")}`,
    });
  }

  const result = await layoutsService.create(layoutData, organisation_id);

  if (!result.success) {
    return res.status(result.statusCode || 500).json({
      error: result.error || "Internal Server Error",
      message: result.message,
    });
  }

  return res.status(201).json(result.data); // <-- direkt neues Layout zurückgeben
};

/**
 * PUT /api/layouts/:id
 */
const update = async (req, res) => {
  const { id } = req.params;
  const { organisation_id } = req.user;
  const updates = req.body;

  const result = await layoutsService.update(id, organisation_id, updates);

  if (!result.success) {
    return res.status(result.statusCode || 500).json({
      error: result.error || "Internal Server Error",
      message: result.message,
    });
  }

  return res.json(result.data);
};

/**
 * DELETE /api/layouts/:id
 */
const remove = async (req, res) => {
  const { id } = req.params;
  const { organisation_id } = req.user;

  const result = await layoutsService.remove(id, organisation_id);

  if (!result.success) {
    return res.status(result.statusCode || 500).json({
      error: result.error || "Internal Server Error",
      message: result.message,
    });
  }

  return res.json({
    success: true,
    deleted_id: id,
  });
};

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
};
