/* ============================================================
   TRAPMAP - BOXTYPES ROUTES
   
   Pfad: backend/src/routes/boxtypes.routes.js
   ============================================================ */

const express = require("express");
const router = express.Router();
const controller = require("../controllers/boxtypes.controller");
const { authenticateToken } = require("../middleware/auth");

// Alle Routen erfordern Authentifizierung
router.use(authenticateToken);

// GET /api/boxtypes - Alle Box-Typen
router.get("/", controller.getAll);

// GET /api/boxtypes/:id - Einzelner Box-Typ
router.get("/:id", controller.getById);

module.exports = router;