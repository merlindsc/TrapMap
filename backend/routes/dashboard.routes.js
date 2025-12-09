const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const { authenticate } = require("../middleware/auth");

// LIVE KPIs
router.get("/stats", authenticate, dashboardController.getStats);

// LAST 10 SCANS
router.get("/recent-scans", authenticate, dashboardController.getRecentScans);

module.exports = router;
