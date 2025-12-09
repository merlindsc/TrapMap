const scansService = require("../services/scans.service");

exports.getHistory = async (req, res) => {
  const orgId = req.user.organisation_id;
  const { box_id, object_id } = req.query;

  if (box_id) {
    const result = await scansService.getHistoryForBox(box_id, orgId);
    if (!result.success) return res.status(500).json({ error: result.message });
    return res.json(result.data);
  }

  if (object_id) {
    const result = await scansService.getHistoryForObject(object_id, orgId);
    if (!result.success) return res.status(500).json({ error: result.message });
    return res.json(result.data);
  }

  return res.status(400).json({ error: "box_id or object_id required" });
};

exports.create = async (req, res) => {
  const orgId = req.user.organisation_id;
  
  // FormData oder JSON - beides unterstützen
  const data = {
    box_id: req.body.box_id,
    user_id: req.body.user_id || req.user.id,
    status: req.body.status,
    notes: req.body.notes || null,
    consumption: req.body.consumption || null,
    quantity: req.body.quantity || null,
    trap_state: req.body.trap_state || null
  };

  const result = await scansService.create(data, orgId, req.file);
  
  if (!result.success) return res.status(400).json({ error: result.message });
  return res.status(201).json(result.data);
};