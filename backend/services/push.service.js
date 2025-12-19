// ============================================
// TRAPMAP - PUSH NOTIFICATION SERVICE
// Web Push mit VAPID für Browser-Benachrichtigungen
// ============================================

const webpush = require('web-push');
const { supabase } = require('../config/supabase');

// VAPID Keys aus Environment (in Production: eigene Keys generieren!)
// Generieren mit: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBmWTg9d4BvP4pMpREMPLxAB8';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'UUxI4O8-FbRouAevSmBQ6_zP4XQzGij3gR7wnlr6HnI';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:info@trap-map.de';

// WebPush konfigurieren
webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

/**
 * VAPID Public Key für Frontend
 */
function getPublicKey() {
  return VAPID_PUBLIC_KEY;
}

/**
 * Push-Subscription speichern
 */
async function saveSubscription(userId, partnerId, subscription, settings = {}) {
  try {
    // Prüfen ob bereits vorhanden (nach endpoint)
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', subscription.endpoint)
      .single();

    const subscriptionData = {
      user_id: userId,
      partner_id: partnerId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      // Einstellungen
      reminder_enabled: settings.reminderEnabled !== false,
      reminder_days_before: settings.reminderDaysBefore || 1,
      reminder_time: settings.reminderTime || '08:00',
      updated_at: new Date().toISOString()
    };

    if (existing) {
      // Update
      const { error } = await supabase
        .from('push_subscriptions')
        .update(subscriptionData)
        .eq('id', existing.id);

      if (error) throw error;
      return { success: true, updated: true };
    } else {
      // Insert
      subscriptionData.created_at = new Date().toISOString();
      const { error } = await supabase
        .from('push_subscriptions')
        .insert(subscriptionData);

      if (error) throw error;
      return { success: true, created: true };
    }
  } catch (error) {
    console.error('❌ Error saving push subscription:', error);
    throw error;
  }
}

/**
 * Push-Subscription entfernen
 */
async function removeSubscription(endpoint) {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('❌ Error removing push subscription:', error);
    throw error;
  }
}

/**
 * Einstellungen aktualisieren
 */
async function updateSettings(userId, settings) {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .update({
        reminder_enabled: settings.reminderEnabled,
        reminder_days_before: settings.reminderDaysBefore,
        reminder_time: settings.reminderTime,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating push settings:', error);
    throw error;
  }
}

/**
 * Push-Nachricht an einzelne Subscription senden
 */
async function sendPush(subscription, payload) {
  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };

    const options = {
      TTL: 86400, // 24 Stunden
      urgency: payload.urgency || 'normal',
      topic: payload.topic || 'trapmap-reminder'
    };

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
      options
    );

    return { success: true };
  } catch (error) {
    // Wenn Subscription ungültig (410 Gone), löschen
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log('🗑️ Removing invalid subscription:', subscription.endpoint.substring(0, 50));
      await removeSubscription(subscription.endpoint);
    }
    throw error;
  }
}

/**
 * Push an alle Subscriptions eines Users senden
 */
async function sendPushToUser(userId, payload) {
  try {
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return { success: false, reason: 'no_subscriptions' };
    }

    const results = await Promise.allSettled(
      subscriptions.map(sub => sendPush(sub, payload))
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return { success: true, sent, failed };
  } catch (error) {
    console.error('❌ Error sending push to user:', error);
    throw error;
  }
}

/**
 * Push an alle Subscriptions eines Partners senden
 */
async function sendPushToPartner(partnerId, payload) {
  try {
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('partner_id', partnerId)
      .eq('reminder_enabled', true);

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return { success: false, reason: 'no_subscriptions' };
    }

    const results = await Promise.allSettled(
      subscriptions.map(sub => sendPush(sub, payload))
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return { success: true, sent, failed, total: subscriptions.length };
  } catch (error) {
    console.error('❌ Error sending push to partner:', error);
    throw error;
  }
}

/**
 * Subscription für User abrufen
 */
async function getSubscription(userId) {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error getting subscription:', error);
    throw error;
  }
}

module.exports = {
  getPublicKey,
  saveSubscription,
  removeSubscription,
  updateSettings,
  sendPush,
  sendPushToUser,
  sendPushToPartner,
  getSubscription
};
