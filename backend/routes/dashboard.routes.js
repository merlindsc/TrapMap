const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const { authenticate } = require("../middleware/auth");

// NEUER kombinierter Endpoint - EINE Request für alles!
router.get("/all", authenticate, dashboardController.getAll);

// Legacy Endpoints (für Kompatibilität)
router.get("/stats", authenticate, dashboardController.getStats);
router.get("/recent-scans", authenticate, dashboardController.getRecentScans);

module.exports = router;