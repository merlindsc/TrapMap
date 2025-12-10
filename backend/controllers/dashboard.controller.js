const dashboardService = require("../services/dashboard.service");

// Kombinierter Endpoint - EINE Request für alles
exports.getAll = async (req, res) => {
  try {
    const data = await dashboardService.getAll(req.user.organisation_id);
    res.json(data);
  } catch (err) {
    console.error("Dashboard All Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Legacy Endpoints (für Kompatibilität)
exports.getStats = async (req, res) => {
  try {
    const stats = await dashboardService.getStats(req.user.organisation_id);
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getRecentScans = async (req, res) => {
  try {
    const scans = await dashboardService.getRecentScans(req.user.organisation_id);
    res.json({ success: true, scans });
  } catch (err) {
    console.error("Recent Scans Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};