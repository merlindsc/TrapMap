// ============================================
// TRAPMAP - PUSH NOTIFICATION SERVICE
// Frontend Push Subscription Management
// ============================================

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Prüft ob Push Notifications unterstützt werden
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window;
}

/**
 * Aktueller Berechtigung-Status
 */
export function getPermissionStatus() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'granted', 'denied', 'default'
}

/**
 * Service Worker registrieren
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker nicht unterstützt');
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    console.log('[Push] Service Worker registriert:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[Push] Service Worker Registrierung fehlgeschlagen:', error);
    throw error;
  }
}

/**
 * Service Worker holen (oder registrieren wenn nicht vorhanden)
 */
export async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker nicht unterstützt');
  }
  
  let registration = await navigator.serviceWorker.getRegistration();
  
  if (!registration) {
    registration = await registerServiceWorker();
  }
  
  // Warten bis aktiv
  if (!registration.active) {
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (registration.active) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }
  
  return registration;
}

/**
 * VAPID Public Key vom Server holen
 */
async function getVapidKey() {
  try {
    const response = await fetch(`${API}/push/vapid-key`);
    if (!response.ok) throw new Error('Fehler beim Abrufen des VAPID Keys');
    const data = await response.json();
    return data.publicKey;
  } catch (error) {
    console.error('[Push] VAPID Key Fehler:', error);
    throw error;
  }
}

/**
 * Base64 URL zu Uint8Array konvertieren
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

/**
 * Push-Berechtigung anfragen
 */
export async function requestPermission() {
  if (!isPushSupported()) {
    throw new Error('Push Notifications werden nicht unterstützt');
  }
  
  const permission = await Notification.requestPermission();
  console.log('[Push] Permission:', permission);
  return permission;
}

/**
 * Push-Subscription erstellen und am Server registrieren
 */
export async function subscribeToPush(settings = {}) {
  const token = localStorage.getItem('trapmap_token');
  if (!token) {
    throw new Error('Nicht eingeloggt');
  }
  
  console.log('[Push] Aktuelle Permission:', Notification.permission);
  
  // 1. Berechtigung prüfen/anfragen
  if (Notification.permission === 'denied') {
    throw new Error('Push-Benachrichtigungen wurden blockiert. Bitte in den Browser-Einstellungen erlauben.');
  }
  
  // Nur anfragen wenn noch nicht granted
  if (Notification.permission !== 'granted') {
    console.log('[Push] Fordere Berechtigung an...');
    const permission = await requestPermission();
    console.log('[Push] Berechtigung erhalten:', permission);
    
    if (permission !== 'granted') {
      throw new Error('Push-Berechtigung nicht erteilt');
    }
  } else {
    console.log('[Push] Berechtigung bereits erteilt ✅');
  }
  
  // 2. Service Worker holen
  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    throw new Error('Service Worker nicht verfügbar');
  }
  
  // 3. Prüfe ob bereits eine Subscription existiert
  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) {
    console.log('[Push] Existing subscription gefunden, verwende diese');
    // Existierende Subscription am Server aktualisieren
    const response = await fetch(`${API}/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        subscription: existingSubscription.toJSON(),
        settings: {
          reminderEnabled: settings.reminderEnabled !== false,
          reminderDaysBefore: settings.reminderDaysBefore || 1,
          reminderTime: settings.reminderTime || '08:00'
        }
      })
    });
    
    if (!response.ok) {
      throw new Error('Fehler beim Aktualisieren der Subscription');
    }
    
    console.log('[Push] ✅ Subscription aktualisiert');
    return existingSubscription;
  }
  
  // 4. VAPID Key holen
  const vapidKey = await getVapidKey();
  
  // 5. Neue Subscription erstellen
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey)
  });
  
  console.log('[Push] Subscription erstellt:', subscription.endpoint.substring(0, 50));
  
  // 6. Am Server registrieren
  const response = await fetch(`${API}/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      settings: {
        reminderEnabled: settings.reminderEnabled !== false,
        reminderDaysBefore: settings.reminderDaysBefore || 1,
        reminderTime: settings.reminderTime || '08:00'
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Registrieren');
  }
  
  const result = await response.json();
  console.log('[Push] Am Server registriert:', result);
  
  return { subscription, ...result };
}

/**
 * Push-Subscription entfernen
 */
export async function unsubscribeFromPush() {
  const token = localStorage.getItem('trapmap_token');
  if (!token) {
    throw new Error('Nicht eingeloggt');
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return { success: true };
    
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return { success: true };
    
    // Am Server entfernen
    await fetch(`${API}/push/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    });
    
    // Lokal entfernen
    await subscription.unsubscribe();
    
    console.log('[Push] Subscription entfernt');
    return { success: true };
  } catch (error) {
    console.error('[Push] Unsubscribe Fehler:', error);
    throw error;
  }
}

/**
 * Prüft ob bereits subscribed
 */
export async function isSubscribed() {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;
    
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    console.error('[Push] Subscription Check Fehler:', error);
    return false;
  }
}

/**
 * Push-Einstellungen aktualisieren
 */
export async function updatePushSettings(settings) {
  const token = localStorage.getItem('trapmap_token');
  if (!token) {
    throw new Error('Nicht eingeloggt');
  }
  
  const response = await fetch(`${API}/push/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(settings)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Aktualisieren');
  }
  
  return await response.json();
}

/**
 * Push-Einstellungen abrufen
 */
export async function getPushSettings() {
  const token = localStorage.getItem('trapmap_token');
  if (!token) {
    throw new Error('Nicht eingeloggt');
  }
  
  const response = await fetch(`${API}/push/settings`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Abrufen');
  }
  
  return await response.json();
}

/**
 * Test-Benachrichtigung senden
 */
export async function sendTestNotification() {
  const token = localStorage.getItem('trapmap_token');
  if (!token) {
    throw new Error('Nicht eingeloggt');
  }
  
  const response = await fetch(`${API}/push/test`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Senden');
  }
  
  return await response.json();
}

/**
 * Listener für Notification-Clicks
 */
export function onNotificationClick(callback) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        callback(event.data);
      }
    });
  }
}
