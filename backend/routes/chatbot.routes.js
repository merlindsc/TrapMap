/* ============================================================
   TRAPMAP CHATBOT ROUTES
   ============================================================ */

const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot.controller');
const { authenticate } = require('../middleware/auth');

// Alle Chat-Routes erfordern Authentifizierung
router.use(authenticate);

// POST /api/chat - Nachricht senden
router.post('/', chatbotController.sendMessage);

// GET /api/chat/history - Historie abrufen
router.get('/history', chatbotController.getHistory);

// DELETE /api/chat/history - Historie löschen
router.delete('/history', chatbotController.clearHistory);

// GET /api/chat/status - Status abrufen (Limit etc.)
router.get('/status', chatbotController.getStatus);

module.exports = router;
