const qrService = require("../services/qr.service");

// Generate QR codes
exports.generate = async (req, res) => {
  try {
    const { count } = req.body;
    const org = req.user.organisation_id;

    if (!count || count < 1 || count > 100) {
      return res.status(400).json({ error: "Count muss zwischen 1 und 100 liegen" });
    }

    const codes = await qrService.generateCodes(org, count);
    res.json({ codes });
  } catch (err) {
    console.error("QR generate error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Check if QR exists + assigned
exports.check = async (req, res) => {
  try {
    const code = req.params.code;

    if (!code) {
      return res.status(400).json({ error: "Code fehlt" });
    }

    const result = await qrService.checkCode(code);

    // Immer 200 zurückgeben, auch wenn Code nicht existiert
    // Das Frontend entscheidet basierend auf `exists` und `assigned`
    res.json(result);
  } catch (err) {
    console.error("QR check error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Assign QR to box
exports.assign = async (req, res) => {
  try {
    const { qr_code, box_id } = req.body;
    const organisation_id = req.user.organisation_id;

    if (!qr_code || !box_id) {
      return res.status(400).json({ error: "qr_code und box_id erforderlich" });
    }

    await qrService.assignCode(qr_code, box_id, organisation_id);
    res.json({ message: "QR-Code erfolgreich verknüpft" });
  } catch (err) {
    console.error("QR assign error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Unassign QR from box
exports.unassign = async (req, res) => {
  try {
    const { box_id } = req.params;

    if (!box_id) {
      return res.status(400).json({ error: "box_id erforderlich" });
    }

    await qrService.unassignCode(box_id);
    res.json({ message: "QR-Code erfolgreich getrennt" });
  } catch (err) {
    console.error("QR unassign error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get QR code for a box
exports.getByBox = async (req, res) => {
  try {
    const { box_id } = req.params;

    const result = await qrService.getCodeByBox(box_id);
    res.json(result || { assigned: false });
  } catch (err) {
    console.error("QR getByBox error:", err);
    res.status(500).json({ error: err.message });
  }
};