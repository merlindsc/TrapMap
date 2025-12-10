const express = require("express");
const router = express.Router();
const multer = require("multer");
const { authenticate } = require("../middleware/auth");
const scansController = require("../controllers/scans.controller");

// Multer Setup - Memory Storage für Supabase Upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(file.originalname.toLowerCase().split('.').pop());
    const mime = allowed.test(file.mimetype);
    if (ext || mime) {
      cb(null, true);
    } else {
      cb(new Error("Nur Bilder erlaubt (JPG, PNG, GIF, WEBP)"));
    }
  }
});

// GET /api/scans - History abrufen
router.get("/", authenticate, scansController.getHistory);

// GET /api/scans/box/:boxId - History für eine Box
router.get("/box/:boxId", authenticate, scansController.getBoxHistory);

// POST /api/scans - Neuen Scan erstellen (mit optionalem Foto)
router.post("/", authenticate, upload.single("photo"), scansController.create);

module.exports = router;