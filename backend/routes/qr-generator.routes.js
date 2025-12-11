/* ============================================================
   TRAPMAP – QR-GENERATOR ROUTES
   ============================================================ */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const qrGenerator = require('../controllers/qr-generator.controller');

// QR-Codes generieren
router.post('/generate', authenticate, qrGenerator.generateCodes);

// Fortlaufende Codes generieren
router.post('/generate/sequential', authenticate, qrGenerator.generateSequentialCodes);

// PDF herunterladen (aus existierenden Codes)
router.post('/download/pdf', authenticate, qrGenerator.downloadPDF);

// Etiketten-Sheet herunterladen (Avery-kompatibel)
router.post('/download/labels', authenticate, qrGenerator.downloadLabelSheet);

// Generieren + Download in einem Schritt
router.post('/generate-download', authenticate, qrGenerator.generateAndDownload);

// Nicht zugewiesene Codes abrufen
router.get('/unused', authenticate, qrGenerator.getUnusedCodes);

// Statistiken
router.get('/stats', authenticate, qrGenerator.getStats);

module.exports = router;