/* ============================================================
   TRAPMAP — OFFLINE API WRAPPER
   Ermöglicht Offline-Funktionalität für Scans, Boxen & Kontrollen
   ============================================================ */

import { 
  addPendingScan, 
  addPendingBox, 
  getCachedBoxByQR,
  getCachedBoxes,
  getCachedObjects,
  cacheBoxes,
  cacheObjects,
  getPendingBoxByQR,
  getUnsyncedScans,
  getUnsyncedBoxes
} from './offlineDB';
import { isOnline, syncAll } from './syncService';

const API = import.meta.env.VITE_API_URL;

/**
 * Holt den Auth-Token
 */
const getToken = () => {
  try {
    return localStorage.getItem('trapmap_token');
  } catch {
    return null;
  }
};

/**
 * Konvertiert ein File/Blob zu Base64
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

// ============================================
// SCANS (Kontrolle)
// ============================================

/**
 * Erstellt einen Scan - Online oder Offline
 */
export const createScanOffline = async (scanData, photo = null) => {
  const token = getToken();
  
  // Offline-Daten vorbereiten
  const offlineScan = {
    box_id: scanData.box_id,
    status: scanData.status,
    notes: scanData.notes || '',
    consumption: scanData.consumption,
    trap_state: scanData.trap_state,
    quantity: scanData.quantity,
    offline_created_at: new Date().toISOString()
  };

  // Photo zu Base64 konvertieren wenn vorhanden
  if (photo) {
    try {
      offlineScan.photo_base64 = await fileToBase64(photo);
    } catch (e) {
      console.warn('⚠️ Photo konnte nicht konvertiert werden:', e);
    }
  }

  // Wenn online, versuche direkten Upload
  if (isOnline() && token) {
    try {
      const formData = new FormData();
      formData.append('box_id', scanData.box_id);
      formData.append('status', scanData.status);
      formData.append('notes', scanData.notes || '');
      
      if (scanData.consumption !== undefined) formData.append('consumption', scanData.consumption);
      if (scanData.trap_state !== undefined) formData.append('trap_state', scanData.trap_state);
      if (scanData.quantity !== undefined) formData.append('quantity', scanData.quantity);
      if (photo) formData.append('photo', photo);

      const response = await fetch(`${API}/scans`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Scan online gespeichert:', result);
        return { success: true, online: true, data: result };
      }
      
      // Bei Server-Fehler offline speichern
      console.warn('⚠️ Server-Fehler, speichere offline');
    } catch (error) {
      console.warn('⚠️ Netzwerk-Fehler, speichere offline:', error);
    }
  }

  // Offline speichern
  const localId = await addPendingScan(offlineScan);
  console.log('📝 Scan offline gespeichert:', localId);
  
  return { 
    success: true, 
    online: false, 
    localId,
    message: 'Kontrolle wurde offline gespeichert und wird bei Verbindung synchronisiert.'
  };
};

// ============================================
// BOXEN (Ersteinrichtung)
// ============================================

/**
 * Erstellt eine neue Box - Online oder Offline
 */
export const createBoxOffline = async (boxData) => {
  const token = getToken();

  // Wenn online, versuche direkten Upload
  if (isOnline() && token) {
    try {
      const response = await fetch(`${API}/boxes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(boxData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Box online erstellt:', result);
        return { success: true, online: true, data: result };
      }
      
      console.warn('⚠️ Server-Fehler, speichere offline');
    } catch (error) {
      console.warn('⚠️ Netzwerk-Fehler, speichere offline:', error);
    }
  }

  // Offline speichern
  const { localId, tempId } = await addPendingBox(boxData);
  console.log('📦 Box offline gespeichert:', localId, tempId);
  
  return { 
    success: true, 
    online: false, 
    localId,
    tempId,
    message: 'Box wurde offline gespeichert und wird bei Verbindung synchronisiert.'
  };
};

/**
 * Sucht eine Box per QR-Code - Online und Offline
 */
export const findBoxByQR = async (qrCode) => {
  const token = getToken();

  // Zuerst in Offline-Pending-Boxen suchen
  const pendingBox = await getPendingBoxByQR(qrCode);
  if (pendingBox) {
    return { 
      success: true, 
      offline: true, 
      pending: true,
      data: pendingBox,
      message: 'Diese Box wurde offline erstellt und wartet auf Synchronisation.'
    };
  }

  // Dann im Cache suchen
  const cachedBox = await getCachedBoxByQR(qrCode);
  
  // Wenn online, Server abfragen
  if (isOnline() && token) {
    try {
      const response = await fetch(`${API}/qr/${qrCode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, online: true, data: result };
      }
      
      if (response.status === 404) {
        // Box existiert nicht - kann neu erstellt werden
        return { success: false, notFound: true };
      }
    } catch (error) {
      console.warn('⚠️ Netzwerk-Fehler, verwende Cache');
    }
  }

  // Fallback auf Cache
  if (cachedBox) {
    return { 
      success: true, 
      offline: true, 
      cached: true,
      data: cachedBox,
      message: 'Offline-Modus: Daten aus dem Cache'
    };
  }

  return { 
    success: false, 
    offline: !isOnline(),
    notFound: true,
    message: isOnline() ? 'Box nicht gefunden' : 'Offline - Box nicht im Cache'
  };
};

// ============================================
// CACHE MANAGEMENT
// ============================================

/**
 * Lädt alle Boxen und speichert sie im Cache
 */
export const refreshBoxCache = async () => {
  const token = getToken();
  
  if (!isOnline() || !token) {
    console.log('📴 Offline oder nicht authentifiziert - Cache-Refresh übersprungen');
    return false;
  }

  try {
    const response = await fetch(`${API}/boxes`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const boxes = await response.json();
      await cacheBoxes(boxes);
      console.log(`✅ ${boxes.length} Boxen im Cache aktualisiert`);
      return true;
    }
  } catch (error) {
    console.error('❌ Cache-Refresh fehlgeschlagen:', error);
  }

  return false;
};

/**
 * Lädt alle Objekte und speichert sie im Cache
 */
export const refreshObjectCache = async () => {
  const token = getToken();
  
  if (!isOnline() || !token) {
    console.log('📴 Offline oder nicht authentifiziert - Cache-Refresh übersprungen');
    return false;
  }

  try {
    const response = await fetch(`${API}/objects`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const objects = await response.json();
      await cacheObjects(objects);
      console.log(`✅ ${objects.length} Objekte im Cache aktualisiert`);
      return true;
    }
  } catch (error) {
    console.error('❌ Object-Cache-Refresh fehlgeschlagen:', error);
  }

  return false;
};

/**
 * Vollständiger Cache-Refresh
 */
export const refreshAllCaches = async () => {
  const results = await Promise.all([
    refreshBoxCache(),
    refreshObjectCache()
  ]);
  
  return results.every(r => r);
};

// ============================================
// OFFLINE STATUS & INFO
// ============================================

/**
 * Gibt Offline-Statistiken zurück
 */
export const getOfflineInfo = async () => {
  const pendingScans = await getUnsyncedScans();
  const pendingBoxes = await getUnsyncedBoxes();
  const cachedBoxes = await getCachedBoxes();
  const cachedObjects = await getCachedObjects();

  return {
    isOnline: isOnline(),
    pending: {
      scans: pendingScans.length,
      boxes: pendingBoxes.length,
      total: pendingScans.length + pendingBoxes.length
    },
    cached: {
      boxes: cachedBoxes.length,
      objects: cachedObjects.length
    }
  };
};

/**
 * Manueller Sync-Trigger
 */
export const triggerSync = async () => {
  if (!isOnline()) {
    return { success: false, message: 'Keine Internetverbindung' };
  }

  const results = await syncAll();
  return { success: true, results };
};
