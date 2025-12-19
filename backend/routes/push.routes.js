// ============================================
// TRAPMAP - PUSH NOTIFICATION ROUTES
// API Endpoints für Push-Subscriptions
// ============================================

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const pushService = require('../services/push.service');

/**
 * GET /api/push/vapid-key
 * VAPID Public Key für Frontend
 */
router.get('/vapid-key', (req, res) => {
  try {
    const publicKey = pushService.getPublicKey();
    res.json({ publicKey });
  } catch (error) {
    console.error('Error getting VAPID key:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen des Keys' });
  }
});

/**
 * POST /api/push/subscribe
 * Push-Subscription registrieren
 */
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { subscription, settings } = req.body;
    
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Ungültige Subscription-Daten' });
    }

    const result = await pushService.saveSubscription(
      req.user.id,
      req.user.partner_id,
      subscription,
      settings
    );

    res.json(result);
  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).json({ error: 'Fehler beim Registrieren der Push-Benachrichtigungen' });
  }
});

/**
 * POST /api/push/unsubscribe
 * Push-Subscription entfernen
 */
router.post('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint erforderlich' });
    }

    const result = await pushService.removeSubscription(endpoint);
    res.json(result);
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ error: 'Fehler beim Entfernen der Push-Benachrichtigungen' });
  }
});

/**
 * PUT /api/push/settings
 * Push-Einstellungen aktualisieren
 */
router.put('/settings', authMiddleware, async (req, res) => {
  try {
    const { reminderEnabled, reminderDaysBefore, reminderTime } = req.body;

    const result = await pushService.updateSettings(req.user.id, {
      reminderEnabled,
      reminderDaysBefore,
      reminderTime
    });

    res.json(result);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Einstellungen' });
  }
});

/**
 * GET /api/push/settings
 * Aktuelle Push-Einstellungen abrufen
 */
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const subscriptions = await pushService.getSubscription(req.user.id);
    
    if (subscriptions.length === 0) {
      return res.json({
        subscribed: false,
        settings: {
          reminderEnabled: true,
          reminderDaysBefore: 1,
          reminderTime: '08:00'
        }
      });
    }

    const sub = subscriptions[0];
    res.json({
      subscribed: true,
      subscriptionCount: subscriptions.length,
      settings: {
        reminderEnabled: sub.reminder_enabled,
        reminderDaysBefore: sub.reminder_days_before,
        reminderTime: sub.reminder_time
      }
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Einstellungen' });
  }
});

/**
 * POST /api/push/test
 * Test-Benachrichtigung senden
 */
router.post('/test', authMiddleware, async (req, res) => {
  try {
    const result = await pushService.sendPushToUser(req.user.id, {
      title: '🔔 TrapMap Test',
      body: 'Push-Benachrichtigungen funktionieren!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'test-notification',
      data: {
        type: 'test',
        url: '/settings'
      }
    });

    if (!result.success && result.reason === 'no_subscriptions') {
      return res.status(404).json({ 
        error: 'Keine Push-Subscription gefunden. Bitte erst aktivieren.' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Test-Benachrichtigung gesendet',
      ...result 
    });
  } catch (error) {
    console.error('Error sending test push:', error);
    res.status(500).json({ error: 'Fehler beim Senden der Test-Benachrichtigung' });
  }
});

module.exports = router;
