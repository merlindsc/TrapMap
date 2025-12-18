/* ============================================================
   TRAPMAP — SYNC SERVICE
   Automatische Synchronisation bei Netzwerkverfügbarkeit
   ============================================================ */

import {
  getUnsyncedScans,
  getUnsyncedBoxes,
  markScanAsSynced,
  markBoxAsSynced,
  deletePendingScan,
  deletePendingBox,
  getOfflineStats
} from './offlineDB';

const API = import.meta.env.VITE_API_URL;

// Sync-Status
let isSyncing = false;
let syncListeners = [];

/**
 * Event-Listener für Sync-Status registrieren
 */
export const addSyncListener = (callback) => {
  syncListeners.push(callback);
  return () => {
    syncListeners = syncListeners.filter(cb => cb !== callback);
  };
};

/**
 * Benachrichtigt alle Listener
 */
const notifyListeners = (event) => {
  syncListeners.forEach(cb => cb(event));
};

/**
 * Prüft ob das Gerät online ist
 */
export const isOnline = () => {
  return navigator.onLine;
};

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
 * Synchronisiert einen einzelnen Scan
 */
const syncScan = async (scan) => {
  const token = getToken();
  if (!token) throw new Error('Nicht authentifiziert');

  const formData = new FormData();
  formData.append('box_id', scan.box_id);
  formData.append('status', scan.status);
  formData.append('notes', scan.notes || '');
  
  // Optionale Felder
  if (scan.consumption !== undefined) formData.append('consumption', scan.consumption);
  if (scan.trap_state !== undefined) formData.append('trap_state', scan.trap_state);
  if (scan.quantity !== undefined) formData.append('quantity', scan.quantity);
  if (scan.offline_created_at) formData.append('offline_created_at', scan.offline_created_at);
  
  // Photo als Base64 wenn vorhanden
  if (scan.photo_base64) {
    // Convert Base64 to Blob
    const byteCharacters = atob(scan.photo_base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });
    formData.append('photo', blob, 'offline_photo.jpg');
  }

  const response = await fetch(`${API}/scans`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Sync fehlgeschlagen: ${response.status}`);
  }

  return await response.json();
};

/**
 * Synchronisiert eine einzelne Box
 */
const syncBox = async (box) => {
  const token = getToken();
  if (!token) throw new Error('Nicht authentifiziert');

  const response = await fetch(`${API}/boxes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      qr_code: box.qr_code,
      box_name: box.box_name,
      box_type_id: box.box_type_id,
      object_id: box.object_id,
      zone_id: box.zone_id,
      lat: box.lat,
      lng: box.lng,
      notes: box.notes,
      offline_created_at: box.created_at // Original-Erstellungszeit
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Box-Sync fehlgeschlagen: ${response.status}`);
  }

  return await response.json();
};

/**
 * Führt die komplette Synchronisation durch
 */
export const syncAll = async () => {
  if (isSyncing) {
    console.log('⏳ Sync bereits aktiv');
    return { skipped: true };
  }

  if (!isOnline()) {
    console.log('📴 Offline - Sync übersprungen');
    return { offline: true };
  }

  isSyncing = true;
  notifyListeners({ type: 'start' });

  const results = {
    scans: { success: 0, failed: 0 },
    boxes: { success: 0, failed: 0 },
    errors: []
  };

  try {
    // 1. Boxen synchronisieren (müssen zuerst erstellt werden für Scans)
    const pendingBoxes = await getUnsyncedBoxes();
    console.log(`📦 ${pendingBoxes.length} Boxen zu synchronisieren`);

    for (const box of pendingBoxes) {
      try {
        const serverBox = await syncBox(box);
        await markBoxAsSynced(box.localId, serverBox.id);
        results.boxes.success++;
        notifyListeners({ type: 'box_synced', box: serverBox });
      } catch (error) {
        console.error('❌ Box-Sync Fehler:', error);
        results.boxes.failed++;
        results.errors.push({ type: 'box', localId: box.localId, error: error.message });
      }
    }

    // 2. Scans synchronisieren
    const pendingScans = await getUnsyncedScans();
    console.log(`📝 ${pendingScans.length} Scans zu synchronisieren`);

    for (const scan of pendingScans) {
      try {
        const serverScan = await syncScan(scan);
        await deletePendingScan(scan.localId); // Scan nach erfolgreichem Sync löschen
        results.scans.success++;
        notifyListeners({ type: 'scan_synced', scan: serverScan });
      } catch (error) {
        console.error('❌ Scan-Sync Fehler:', error);
        results.scans.failed++;
        results.errors.push({ type: 'scan', localId: scan.localId, error: error.message });
      }
    }

    console.log('✅ Sync abgeschlossen:', results);
    notifyListeners({ type: 'complete', results });

  } catch (error) {
    console.error('❌ Sync-Fehler:', error);
    notifyListeners({ type: 'error', error });
  } finally {
    isSyncing = false;
  }

  return results;
};

/**
 * Startet die automatische Synchronisation
 */
export const startAutoSync = (intervalMs = 30000) => {
  // Event Listener für Online-Status
  window.addEventListener('online', () => {
    console.log('🌐 Online - Starte Sync...');
    setTimeout(syncAll, 1000); // Kurze Verzögerung
  });

  window.addEventListener('offline', () => {
    console.log('📴 Offline');
    notifyListeners({ type: 'offline' });
  });

  // Periodische Synchronisation
  const intervalId = setInterval(async () => {
    if (isOnline()) {
      const stats = await getOfflineStats();
      if (stats.totalPending > 0) {
        console.log(`🔄 Auto-Sync: ${stats.totalPending} ausstehende Einträge`);
        syncAll();
      }
    }
  }, intervalMs);

  console.log('🔄 Auto-Sync gestartet');

  return () => {
    clearInterval(intervalId);
    console.log('⏹️ Auto-Sync gestoppt');
  };
};

/**
 * Gibt den aktuellen Sync-Status zurück
 */
export const getSyncStatus = async () => {
  const stats = await getOfflineStats();
  return {
    isOnline: isOnline(),
    isSyncing,
    ...stats
  };
};
