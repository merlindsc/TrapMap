// ============================================
// TRAPMAP - SERVICE WORKER
// Push Notifications + Offline Caching
// ============================================

const CACHE_NAME = 'trapmap-v1';
const API_CACHE_NAME = 'trapmap-api-v1';

// Assets die gecacht werden sollen
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// ============================================
// INSTALL EVENT
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.log('[SW] Some assets failed to cache:', err);
      });
    })
  );
  
  // Sofort aktivieren
  self.skipWaiting();
});

// ============================================
// ACTIVATE EVENT
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  // Alle Clients übernehmen
  self.clients.claim();
});

// ============================================
// PUSH EVENT - Benachrichtigungen empfangen
// ============================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let payload = {
    title: 'TrapMap',
    body: 'Neue Benachrichtigung',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'trapmap-notification',
    data: {}
  };
  
  try {
    if (event.data) {
      const data = event.data.json();
      payload = { ...payload, ...data };
    }
  } catch (e) {
    console.log('[SW] Error parsing push data:', e);
    if (event.data) {
      payload.body = event.data.text();
    }
  }
  
  const options = {
    body: payload.body,
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'trapmap-notification',
    renotify: payload.renotify || false,
    requireInteraction: payload.requireInteraction || false,
    vibrate: [200, 100, 200],
    data: payload.data || {},
    actions: []
  };
  
  // Aktionen basierend auf Typ
  if (payload.data?.type === 'reminder') {
    options.actions = [
      { action: 'open', title: '📋 Öffnen' },
      { action: 'dismiss', title: '✕ Später' }
    ];
  }
  
  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// ============================================
// NOTIFICATION CLICK - Benachrichtigung angeklickt
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  // Bei "dismiss" nichts tun
  if (event.action === 'dismiss') {
    return;
  }
  
  // URL aus Data oder Default
  const targetUrl = event.notification.data?.url || '/maps';
  const fullUrl = new URL(targetUrl, self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Prüfen ob App schon offen
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Zur richtigen Seite navigieren
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: targetUrl,
              data: event.notification.data
            });
            return client.focus();
          }
        }
        
        // Neues Fenster öffnen
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
  );
});

// ============================================
// NOTIFICATION CLOSE - Benachrichtigung geschlossen
// ============================================
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
  
  // Optional: Tracking senden
  // fetch('/api/push/track', { method: 'POST', body: JSON.stringify({ action: 'close', tag: event.notification.tag }) });
});

// ============================================
// FETCH EVENT - Offline-Unterstützung
// ============================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // API-Anfragen nicht cachen (IndexedDB übernimmt das)
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Für andere Anfragen: Cache-First Strategie
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).then((response) => {
        // Nur gültige Responses cachen
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Klonen und cachen
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      }).catch(() => {
        // Offline Fallback für HTML
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// ============================================
// MESSAGE EVENT - Nachrichten von der App
// ============================================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[SW] Cache cleared');
      event.ports[0]?.postMessage({ success: true });
    });
  }
});

console.log('[SW] Service Worker loaded');
