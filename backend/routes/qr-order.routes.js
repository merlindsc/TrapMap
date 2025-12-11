/* ============================================================
   TRAPMAP – QR-ORDER ROUTES
   Super-Admin Endpunkte für QR-Code Bestellungen
   ============================================================ */

const express = require('express');
const router = express.Router();
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const qrOrder = require('../controllers/qr-order.controller');

// Alle Routes erfordern Super-Admin
router.use(authenticate);
router.use(requireSuperAdmin);

// Preis berechnen (Vorschau)
router.get('/price', qrOrder.calculatePrice);

// Organisations-Präfix verwalten
router.get('/organisation/:organisationId/prefix', qrOrder.getOrganisationPrefix);
router.put('/organisation/:organisationId/prefix', qrOrder.setOrganisationPrefix);

// Statistiken
router.get('/stats', qrOrder.getAllOrganisationsStats);
router.get('/stats/:organisationId', qrOrder.getOrganisationStats);

// Bestellungen
router.get('/orders', qrOrder.getOrders);
router.post('/orders', qrOrder.createOrder);

// Einzelne Bestellung verarbeiten
router.post('/orders/:orderId/generate', qrOrder.generateCodes);
router.get('/orders/:orderId/pdf', qrOrder.downloadPDF);
router.post('/orders/:orderId/send', qrOrder.sendByEmail);

// ⭐ EIN-KLICK WORKFLOW: Erstellen + Generieren + Versenden
router.post('/process', qrOrder.processCompleteOrder);

module.exports = router;