/* ============================================================
   TRAPMAP – SYNC SERVICE
   Automatische Synchronisation von Offline-Daten
   
   FEATURES:
   - Auto-Sync bei Verbindungswiederherstellung
   - Periodischer Sync im Hintergrund
   - Retry-Logik mit Backoff
   - Event-System für UI-Updates
   - Priorisierte Sync-Reihenfolge
   ============================================================ */

import {
  // Getters
  getUnsyncedScans,
  getUnsyncedBoxes,
  getUnsyncedPositionUpdates,
  getUnsyncedReturnToPool,
  
  // Markers
  markScanAsSynced,
  markBoxAsSynced,
  markPositionUpdateAsSynced,
  markReturnToPoolAsSynced,
  incrementScanAttempts,
  
  // Deleters
  deletePendingScan,
  deletePendingBox,
  
  // Sync Functions
  syncSingleScan,
  syncSingleBoxUpdate,
  syncSinglePositionUpdate,
  syncSingleReturnToPool,
  
  // Cache
  refreshAllCaches,
  addSyncLog,
  
  // Status
  isOnline
} from './offlineAPI';

// ============================================
// KONFIGURATION
// ============================================

const CONFIG = {
  AUTO_SYNC_INTERVAL: 30000,      // 30 Sekunden
  MAX_RETRY_ATTEMPTS: 5,          // Maximale Wiederholungen pro Item
  RETRY_DELAY_BASE: 1000,         // Basis-Verzögerung für Retry (1s)
  RETRY_DELAY_MAX: 30000,         // Maximale Retry-Verzögerung (30s)
  SYNC_BATCH_SIZE: 5,             // Items pro Batch
  CONNECTION_CHECK_INTERVAL: 5000 // Verbindungscheck alle 5s
};

// ============================================
// STATE
// ============================================

let autoSyncTimer = null;
let isSyncing = false;
let syncListeners = [];
let lastSyncTime = null;

// ============================================
// EVENT SYSTEM
// ============================================

/**
 * Listener für Sync-Events registrieren
 * @param {Function} callback - Wird mit { type, data } aufgerufen
 * @returns {Function} Unsubscribe-Funktion
 */
export const addSyncListener = (callback) => {
  syncListeners.push(callback);
  return () => {
    syncListeners = syncListeners.filter(l => l !== callback);
  };
};

/**
 * Event an alle Listener senden
 */
const emitSyncEvent = (type, data = {}) => {
  const event = { type, data, timestamp: new Date().toISOString() };
  syncListeners.forEach(listener => {
    try {
      listener(event);
    } catch (e) {
      console.error('Sync listener error:', e);
    }
  });
};

// Event Types:
// - 'start': Sync gestartet
// - 'complete': Sync abgeschlossen
// - 'error': Fehler aufgetreten
// - 'progress': Fortschritt (items synced)
// - 'scan_synced': Einzelner Scan synchronisiert
// - 'box_synced': Einzelne Box synchronisiert
// - 'position_synced': Position synchronisiert
// - 'return_synced': Return-to-Pool synchronisiert
// - 'offline': Offline gegangen
// - 'online': Online gegangen

// ============================================
// SYNC LOGIK
// ============================================

/**
 * Berechnet Retry-Delay mit exponentialem Backoff
 */
const getRetryDelay = (attempts) => {
  const delay = CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempts);
  return Math.min(delay, CONFIG.RETRY_DELAY_MAX);
};

/**
 * Synchronisiert alle ausstehenden Scans
 */
const syncScans = async () => {
  const scans = await getUnsyncedScans();
  const results = { success: 0, failed: 0, skipped: 0 };
  
  for (const scan of scans) {
    // Zu viele Versuche → überspringen
    if ((scan.attempts || 0) >= CONFIG.MAX_RETRY_ATTEMPTS) {
      results.skipped++;
      console.warn(`⏭️ Scan ${scan.localId} übersprungen (zu viele Versuche)`);
      continue;
    }
    
    try {
      const serverResult = await syncSingleScan(scan);
      // 🆕 Nach erfolgreichem Sync: Scan LÖSCHEN statt nur markieren
      await deletePendingScan(scan.localId);
      results.success++;
      
      emitSyncEvent('scan_synced', { 
        localId: scan.localId, 
        serverId: serverResult?.id,
        boxId: scan.box_id 
      });
      
      console.log(`✅ Scan ${scan.localId} synchronisiert & gelöscht`);
    } catch (error) {
      results.failed++;
      await incrementScanAttempts(scan.localId);
      console.error(`❌ Scan ${scan.localId} Sync fehlgeschlagen:`, error.message);
    }
  }
  
  return results;
};

/**
 * Synchronisiert alle ausstehenden Box-Updates
 */
const syncBoxUpdates = async () => {
  const boxes = await getUnsyncedBoxes();
  const results = { success: 0, failed: 0, skipped: 0 };
  
  for (const boxUpdate of boxes) {
    if ((boxUpdate.attempts || 0) >= CONFIG.MAX_RETRY_ATTEMPTS) {
      results.skipped++;
      continue;
    }
    
    try {
      const serverResult = await syncSingleBoxUpdate(boxUpdate);
      await markBoxAsSynced(boxUpdate.localId, serverResult?.id);
      results.success++;
      
      emitSyncEvent('box_synced', { 
        localId: boxUpdate.localId, 
        boxId: boxUpdate.box_id 
      });
      
      console.log(`✅ Box-Update ${boxUpdate.localId} synchronisiert`);
    } catch (error) {
      results.failed++;
      console.error(`❌ Box-Update ${boxUpdate.localId} Sync fehlgeschlagen:`, error.message);
    }
  }
  
  return results;
};

/**
 * Synchronisiert alle ausstehenden Position-Updates
 */
const syncPositionUpdates = async () => {
  const positions = await getUnsyncedPositionUpdates();
  const results = { success: 0, failed: 0, skipped: 0 };
  
  for (const pos of positions) {
    try {
      await syncSinglePositionUpdate(pos);
      await markPositionUpdateAsSynced(pos.localId);
      results.success++;
      
      emitSyncEvent('position_synced', { 
        localId: pos.localId, 
        boxId: pos.box_id 
      });
      
      console.log(`✅ Position ${pos.localId} synchronisiert`);
    } catch (error) {
      results.failed++;
      console.error(`❌ Position ${pos.localId} Sync fehlgeschlagen:`, error.message);
    }
  }
  
  return results;
};

/**
 * Synchronisiert alle ausstehenden Return-to-Pool Operationen
 */
const syncReturnToPool = async () => {
  const returns = await getUnsyncedReturnToPool();
  const results = { success: 0, failed: 0, skipped: 0 };
  
  for (const item of returns) {
    try {
      await syncSingleReturnToPool(item);
      await markReturnToPoolAsSynced(item.localId);
      results.success++;
      
      emitSyncEvent('return_synced', { 
        localId: item.localId, 
        boxId: item.box_id 
      });
      
      console.log(`✅ Return-to-Pool ${item.localId} synchronisiert`);
    } catch (error) {
      results.failed++;
      console.error(`❌ Return-to-Pool ${item.localId} Sync fehlgeschlagen:`, error.message);
    }
  }
  
  return results;
};

/**
 * Hauptsynchronisationsfunktion
 * Synchronisiert alle ausstehenden Daten in priorisierter Reihenfolge
 */
export const syncAll = async () => {
  // Verhindere parallele Syncs
  if (isSyncing) {
    console.log('⏳ Sync bereits aktiv, überspringe...');
    return null;
  }
  
  // Offline-Check
  if (!isOnline()) {
    console.log('🔴 Offline - Sync nicht möglich');
    emitSyncEvent('offline');
    return null;
  }
  
  isSyncing = true;
  emitSyncEvent('start');
  
  console.log('🔄 Starte Synchronisation...');
  
  const results = {
    scans: { success: 0, failed: 0, skipped: 0 },
    boxes: { success: 0, failed: 0, skipped: 0 },
    positions: { success: 0, failed: 0, skipped: 0 },
    returns: { success: 0, failed: 0, skipped: 0 },
    timestamp: new Date().toISOString()
  };
  
  try {
    // Sync-Reihenfolge:
    // 1. Return-to-Pool (wichtig für Box-Status)
    // 2. Position-Updates
    // 3. Box-Updates
    // 4. Scans (abhängig von Boxen)
    
    results.returns = await syncReturnToPool();
    emitSyncEvent('progress', { type: 'returns', ...results.returns });
    
    results.positions = await syncPositionUpdates();
    emitSyncEvent('progress', { type: 'positions', ...results.positions });
    
    results.boxes = await syncBoxUpdates();
    emitSyncEvent('progress', { type: 'boxes', ...results.boxes });
    
    results.scans = await syncScans();
    emitSyncEvent('progress', { type: 'scans', ...results.scans });
    
    // Cache nach erfolgreichem Sync aktualisieren
    const totalSuccess = results.scans.success + results.boxes.success + 
                         results.positions.success + results.returns.success;
    
    if (totalSuccess > 0) {
      console.log('🔄 Cache wird aktualisiert...');
      await refreshAllCaches();
    }
    
    // Sync-Log speichern
    const hasErrors = results.scans.failed + results.boxes.failed + 
                     results.positions.failed + results.returns.failed > 0;
    
    await addSyncLog(!hasErrors, {
      scans: results.scans,
      boxes: results.boxes,
      positions: results.positions,
      returns: results.returns
    });
    
    lastSyncTime = new Date();
    
    console.log('✅ Synchronisation abgeschlossen:', {
      scans: `${results.scans.success}/${results.scans.success + results.scans.failed}`,
      boxes: `${results.boxes.success}/${results.boxes.success + results.boxes.failed}`,
      positions: `${results.positions.success}/${results.positions.success + results.positions.failed}`,
      returns: `${results.returns.success}/${results.returns.success + results.returns.failed}`
    });
    
  } catch (error) {
    console.error('❌ Sync-Fehler:', error);
    emitSyncEvent('error', { error: error.message });
    
    await addSyncLog(false, { error: error.message });
  } finally {
    isSyncing = false;
    emitSyncEvent('complete', { results });
  }
  
  return results;
};

// ============================================
// AUTO-SYNC
// ============================================

/**
 * Startet automatische Synchronisation
 * @param {number} interval - Intervall in ms (default: 30s)
 * @returns {Function} Stop-Funktion
 */
export const startAutoSync = (interval = CONFIG.AUTO_SYNC_INTERVAL) => {
  // Bestehenden Timer stoppen
  stopAutoSync();
  
  console.log(`🔄 Auto-Sync gestartet (alle ${interval / 1000}s)`);
  
  // Initial sync
  setTimeout(() => {
    if (isOnline()) {
      syncAll().catch(console.error);
    }
  }, 2000);
  
  // Periodischer Sync
  autoSyncTimer = setInterval(() => {
    if (isOnline() && !isSyncing) {
      syncAll().catch(console.error);
    }
  }, interval);
  
  // Online/Offline Event Listeners
  const handleOnline = () => {
    console.log('🌐 Verbindung wiederhergestellt - starte Sync...');
    emitSyncEvent('online');
    
    // Kurze Verzögerung für stabile Verbindung
    setTimeout(() => {
      syncAll().catch(console.error);
    }, 1000);
  };
  
  const handleOffline = () => {
    console.log('🔴 Verbindung verloren');
    emitSyncEvent('offline');
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Visibility Change Handler (Sync wenn App wieder sichtbar wird)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && isOnline() && !isSyncing) {
      console.log('👁️ App wieder sichtbar - prüfe Sync...');
      syncAll().catch(console.error);
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Cleanup-Funktion
  return () => {
    stopAutoSync();
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};

/**
 * Stoppt automatische Synchronisation
 */
export const stopAutoSync = () => {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
    console.log('⏹️ Auto-Sync gestoppt');
  }
};

// ============================================
// STATUS & INFO
// ============================================

/**
 * Prüft ob gerade synchronisiert wird
 */
export const getIsSyncing = () => isSyncing;

/**
 * Gibt letzten Sync-Zeitpunkt zurück
 */
export const getLastSyncTime = () => lastSyncTime;

/**
 * Manueller Sync-Trigger
 */
export const triggerSync = async () => {
  if (!isOnline()) {
    return { success: false, message: 'Keine Internetverbindung' };
  }
  
  if (isSyncing) {
    return { success: false, message: 'Synchronisation läuft bereits' };
  }
  
  const results = await syncAll();
  return { success: true, results };
};

// Re-export isOnline für Convenience
export { isOnline };