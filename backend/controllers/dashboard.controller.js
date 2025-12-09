// ============================================
// DASHBOARD CONTROLLER - KOMPLETT
// Stats + Recent Scans
// ============================================

const dashboardService = require("../services/dashboard.service");

// GET /api/dashboard/stats
exports.getStats = async (req, res) => {
  try {
    const stats = await dashboardService.getStats(req.user.organisation_id);
    // Direkt zurückgeben ohne Wrapper
    res.json(stats);
  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET /api/dashboard/recent-scans
exports.getRecentScans = async (req, res) => {
  try {
    const scans = await dashboardService.getRecentScans(req.user.organisation_id);
    res.json({ scans });
  } catch (err) {
    console.error("Recent Scans Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};