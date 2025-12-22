// ============================================
// TRAPMAP - REMINDER JOB
// Prüft fällige Kontrollen und sendet Push-Erinnerungen
// ============================================

const { supabase } = require('../config/supabase');
const pushService = require('../services/push.service');

// Intervall-Einstellungen (in Millisekunden)
const CHECK_INTERVAL = 60 * 60 * 1000; // Stündlich prüfen
const REMINDER_THRESHOLDS = [1, 1.5, 0.5]; // Tage vor Fälligkeit

/**
 * Berechnet fällige Boxen pro Objekt für eine Organisation
 */
async function getUpcomingControls(organisationId, daysAhead = 2) {
  try {
    const now = new Date();

    // Alle Boxen mit letztem Scan und Kontrollintervall holen
    const { data: boxes, error } = await supabase
      .from('boxes')
      .select(`
        id,
        qr_code,
        display_number,
        last_scan,
        control_interval_days,
        object_id,
        objects (
          id,
          name
        )
      `)
      .eq('organisation_id', organisationId)
      .eq('active', true)
      .not('object_id', 'is', null);

    if (error) throw error;
    if (!boxes || boxes.length === 0) return [];

    // Boxen nach Fälligkeit gruppieren
    const upcomingByObject = {};

    for (const box of boxes) {
      // Kontrollintervall: Box > Default 30 Tage
      const intervalDays = box.control_interval_days || 30;

      // Nächste Kontrolle berechnen
      const lastScan = box.last_scan ? new Date(box.last_scan) : null;
      let nextDue;
      
      if (!lastScan) {
        // Nie kontrolliert = sofort fällig
        nextDue = new Date(0);
      } else {
        nextDue = new Date(lastScan.getTime() + intervalDays * 24 * 60 * 60 * 1000);
      }

      // Tage bis fällig
      const daysUntilDue = (nextDue.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);

      // Nur Boxen die in daysAhead fällig sind
      if (daysUntilDue <= daysAhead) {
        const objectId = box.object_id;
        const objectName = box.objects?.name || 'Unbekanntes Objekt';

        if (!upcomingByObject[objectId]) {
          upcomingByObject[objectId] = {
            objectId,
            objectName,
            boxes: [],
            urgentCount: 0, // Überfällig
            soonCount: 0    // Bald fällig
          };
        }

        upcomingByObject[objectId].boxes.push({
          id: box.id,
          qrCode: box.qr_code,
          displayNumber: box.display_number,
          daysUntilDue: Math.round(daysUntilDue * 10) / 10,
          lastScan: box.last_scan
        });

        if (daysUntilDue <= 0) {
          upcomingByObject[objectId].urgentCount++;
        } else {
          upcomingByObject[objectId].soonCount++;
        }
      }
    }

    return Object.values(upcomingByObject);
  } catch (error) {
    console.error('❌ Error getting upcoming controls:', error);
    throw error;
  }
}

/**
 * Generiert Benachrichtigungstext
 */
function generateReminderMessage(upcomingControls) {
  if (upcomingControls.length === 0) return null;

  const totalUrgent = upcomingControls.reduce((sum, obj) => sum + obj.urgentCount, 0);
  const totalSoon = upcomingControls.reduce((sum, obj) => sum + obj.soonCount, 0);
  const totalBoxes = totalUrgent + totalSoon;

  let title, body;

  if (totalUrgent > 0) {
    title = `⚠️ ${totalUrgent} überfällige Kontrollen`;
    body = upcomingControls
      .filter(obj => obj.urgentCount > 0)
      .map(obj => `${obj.objectName}: ${obj.urgentCount} Box${obj.urgentCount > 1 ? 'en' : ''}`)
      .join(', ');
  } else {
    title = `📋 ${totalSoon} Kontrollen bald fällig`;
    
    if (upcomingControls.length === 1) {
      const obj = upcomingControls[0];
      body = `In ${obj.objectName} müssen ${obj.soonCount} Boxen kontrolliert werden`;
    } else {
      body = upcomingControls
        .slice(0, 3)
        .map(obj => `${obj.objectName}: ${obj.boxes.length}`)
        .join(', ');
      
      if (upcomingControls.length > 3) {
        body += ` +${upcomingControls.length - 3} weitere`;
      }
    }
  }

  return { title, body, totalBoxes, totalUrgent, totalSoon };
}

/**
 * Detaillierte Erinnerung pro Objekt
 */
function generateDetailedReminder(objectData) {
  const { objectName, boxes, urgentCount, soonCount } = objectData;
  
  let title, body;
  const totalBoxes = boxes.length;

  if (urgentCount > 0) {
    title = `⚠️ ${objectName}: ${urgentCount} überfällig`;
    const overdueDays = Math.abs(Math.min(...boxes.map(b => b.daysUntilDue)));
    body = `${urgentCount} Box${urgentCount > 1 ? 'en' : ''} seit ${Math.ceil(overdueDays)} Tag${overdueDays >= 2 ? 'en' : ''} überfällig`;
  } else {
    const minDays = Math.min(...boxes.map(b => b.daysUntilDue));
    title = `📋 ${objectName}`;
    
    if (minDays <= 0.5) {
      body = `${totalBoxes} Box${totalBoxes > 1 ? 'en' : ''} heute noch kontrollieren!`;
    } else if (minDays <= 1) {
      body = `Morgen: ${totalBoxes} Box${totalBoxes > 1 ? 'en' : ''} kontrollieren`;
    } else {
      body = `In ${Math.ceil(minDays)} Tagen: ${totalBoxes} Box${totalBoxes > 1 ? 'en' : ''} kontrollieren`;
    }
  }

  return { title, body, objectId: objectData.objectId };
}

/**
 * Prüft ob für diesen User heute schon eine Erinnerung gesendet wurde
 */
async function wasReminderSentToday(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('push_reminder_log')
      .select('id')
      .eq('user_id', userId)
      .gte('sent_at', today)
      .limit(1);

    if (error) {
      // Tabelle existiert evtl. noch nicht
      if (error.code === '42P01') return false;
      throw error;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking reminder log:', error);
    return false; // Im Zweifel senden
  }
}

/**
 * Reminder-Log eintragen
 */
async function logReminderSent(userId, organisationId, boxCount) {
  try {
    await supabase
      .from('push_reminder_log')
      .insert({
        user_id: userId,
        organisation_id: organisationId,
        boxes_count: boxCount,
        sent_at: new Date().toISOString()
      });
  } catch (error) {
    // Ignorieren wenn Tabelle nicht existiert
    if (error.code !== '42P01') {
      console.error('Error logging reminder:', error);
    }
  }
}

/**
 * Sendet Erinnerungen an alle berechtigten User
 */
async function sendReminders() {
  console.log('🔔 Running reminder check...');
  
  try {
    // Alle aktiven Subscriptions mit aktivierten Reminders holen
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('reminder_enabled', true);

    if (error) {
      // Tabelle existiert noch nicht
      if (error.code === '42P01') {
        console.log('⚠️ push_subscriptions table not found');
        return;
      }
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('📭 No active reminder subscriptions');
      return;
    }

    console.log(`📬 Found ${subscriptions.length} active subscriptions`);

    // Nach User gruppieren
    const userSubscriptions = {};
    for (const sub of subscriptions) {
      const userId = sub.user_id;
      if (!userSubscriptions[userId]) {
        userSubscriptions[userId] = {
          userId,
          organisationId: sub.organisation_id,
          reminderDaysBefore: sub.reminder_days_before || 1,
          subscriptions: []
        };
      }
      userSubscriptions[userId].subscriptions.push(sub);
    }

    // Für jeden User prüfen
    for (const userData of Object.values(userSubscriptions)) {
      try {
        // Prüfen ob heute schon gesendet
        const alreadySent = await wasReminderSentToday(userData.userId);
        if (alreadySent) {
          continue;
        }

        // Fällige Kontrollen für diese Organisation holen
        const upcomingControls = await getUpcomingControls(
          userData.organisationId, 
          userData.reminderDaysBefore
        );

        if (upcomingControls.length === 0) {
          continue;
        }

        // Nachricht generieren
        const message = generateReminderMessage(upcomingControls);
        if (!message) continue;

        // Push an alle Devices dieses Users senden
        const payload = {
          title: message.title,
          body: message.body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'control-reminder',
          renotify: true,
          requireInteraction: message.totalUrgent > 0,
          data: {
            type: 'reminder',
            url: '/maps',
            totalBoxes: message.totalBoxes,
            urgentCount: message.totalUrgent,
            objects: upcomingControls.map(o => ({
              id: o.objectId,
              name: o.objectName,
              count: o.boxes.length
            }))
          }
        };

        const results = await Promise.allSettled(
          userData.subscriptions.map(sub => pushService.sendPush(sub, payload))
        );

        const sent = results.filter(r => r.status === 'fulfilled').length;
        if (sent > 0) {
          console.log(`✅ Sent reminder to user ${userData.userId}: ${message.totalBoxes} boxes`);
          await logReminderSent(userData.userId, userData.organisationId, message.totalBoxes);
        }
      } catch (userError) {
        console.error(`Error sending reminder to user ${userData.userId}:`, userError);
      }
    }

    console.log('✅ Reminder check complete');
  } catch (error) {
    console.error('❌ Error in sendReminders:', error);
  }
}

/**
 * Startet den Reminder-Job
 */
function startReminderJob() {
  console.log('🔔 Starting reminder job (interval: 1 hour)');
  
  // Initial nach 5 Sekunden ausführen
  setTimeout(() => {
    sendReminders().catch(console.error);
  }, 5000);

  // Dann stündlich
  setInterval(() => {
    sendReminders().catch(console.error);
  }, CHECK_INTERVAL);
}

/**
 * Manuelle Erinnerung für einen User triggern
 */
async function triggerReminderForUser(userId, organisationId) {
  try {
    const upcomingControls = await getUpcomingControls(organisationId, 2);
    
    if (upcomingControls.length === 0) {
      return { success: true, message: 'Keine fälligen Kontrollen' };
    }

    const message = generateReminderMessage(upcomingControls);
    
    const result = await pushService.sendPushToUser(userId, {
      title: message.title,
      body: message.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'control-reminder-manual',
      data: {
        type: 'reminder',
        url: '/maps',
        manual: true
      }
    });

    return { success: true, ...message, ...result };
  } catch (error) {
    console.error('Error triggering reminder:', error);
    throw error;
  }
}

module.exports = {
  getUpcomingControls,
  generateReminderMessage,
  generateDetailedReminder,
  sendReminders,
  startReminderJob,
  triggerReminderForUser
};