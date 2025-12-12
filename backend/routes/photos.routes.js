// ============================================
// PHOTOS ROUTES
// /api/photos
// ============================================

const express = require("express");
const router = express.Router();
const multer = require("multer");

const { authenticate, requireEditor } = require("../middleware/auth");
const photosController = require("../controllers/photos.controller");

// Multer Setup - Memory Storage für Supabase
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

// ============================================
// ROUTES
// ============================================

// GET /api/photos - Alle Fotos
router.get("/", authenticate, photosController.getAll);

// GET /api/photos/object/:objectId - Fotos für ein Objekt
router.get("/object/:objectId", authenticate, photosController.getForObject);

// POST /api/photos/upload - Foto hochladen
router.post(
  "/upload", 
  authenticate, 
  requireEditor, 
  upload.single("photo"), 
  photosController.upload
);

// DELETE /api/photos/:id - Foto löschen
router.delete("/:id", authenticate, requireEditor, photosController.delete);

module.exports = router;