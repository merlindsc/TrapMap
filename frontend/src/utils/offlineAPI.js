/* ============================================================
   TRAPMAP – OFFLINE API WRAPPER
   Vollständige Offline-Fähigkeit für alle API-Operationen
   
   FEATURES:
   - Automatischer Online/Offline Fallback
   - Foto-Support mit Base64 Konvertierung
   - Cache-Management für Stammdaten
   - Queue-Management für ausstehende Operationen
   ============================================================ */

import { 
  // Pending Operations
  addPendingScan, 
  addPendingBoxUpdate, 
  addPendingPositionUpdate,
  addPendingReturnToPool,
  getPendingBoxByQR,
  getPendingBoxById,
  getUnsyncedScans,
  getUnsyncedBoxes,
  getUnsyncedPositionUpdates,
  getUnsyncedReturnToPool,
  markScanAsSynced,
  markBoxAsSynced,
  markPositionUpdateAsSynced,
  markReturnToPoolAsSynced,
  incrementScanAttempts,
  deletePendingScan,
  deletePendingBox,
  
  // Cached Data
  getCachedBoxByQR,
  getCachedBox,
  getCachedBoxes,
  getCachedObjects,
  getCachedBoxTypes,
  getCachedLayouts,
  getCachedHistoryForBox,
  getCachedUser,
  cacheBoxes,
  cacheBox,
  cacheObjects,
  cacheBoxTypes,
  cacheLayouts,
  cacheHistory,
  cacheUser,
  updateCachedBox,
  addOfflineScanToHistory,
  
  // Stats
  getOfflineStats,
  addSyncLog
} from './offlineDB';

const API = import.meta.env.VITE_API_URL;

// ============================================
// HELPER FUNKTIONEN
// ============================================

/**
 * Prüft ob wir online sind
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * Holt den Auth-Token aus localStorage oder Cache
 */
const getToken = async () => {
  try {
    // Erst localStorage versuchen
    const token = localStorage.getItem('trapmap_token');
    if (token) return token;
    
    // Fallback auf IndexedDB Cache
    const cached = await getCachedUser();
    return cached?.token || null;
  } catch {
    return null;
  }
};

/**
 * Konvertiert ein File/Blob zu Base64
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

/**
 * Base64 zurück zu Blob konvertieren (für Sync)
 */
const base64ToBlob = (base64, mimeType = 'image/jpeg') => {
  try {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
  } catch (e) {
    console.error('Base64 to Blob error:', e);
    return null;
  }
};

/**
 * Standard Fetch mit Auth Header
 */
const authFetch = async (url, options = {}) => {
  const token = await getToken();
  
  const headers = {
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Content-Type nur setzen wenn kein FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  return fetch(url, { ...options, headers });
};

// ============================================
// SCAN OPERATIONEN (Kontrollen)
// ============================================

/**
 * Erstellt einen Scan - Online oder Offline
 * @param {Object} scanData - { box_id, status, notes, consumption, trap_state, quantity }
 * @param {File|null} photo - Optional: Foto-Datei
 */
export const createScanOffline = async (scanData, photo = null) => {
  // Offline-Daten vorbereiten
  const offlineScan = {
    box_id: scanData.box_id,
    object_id: scanData.object_id,
    status: scanData.status,
    notes: scanData.notes || '',
    consumption: scanData.consumption,
    trap_state: scanData.trap_state,
    quantity: scanData.quantity,
    scan_type: scanData.scan_type || 'control',
    offline_created_at: new Date().toISOString()
  };

  // Photo zu Base64 konvertieren wenn vorhanden
  if (photo) {
    try {
      offlineScan.photo_base64 = await fileToBase64(photo);
      offlineScan.photo_name = photo.name || 'photo.jpg';
    } catch (e) {
      console.warn('⚠️ Photo konnte nicht konvertiert werden:', e);
    }
  }

  // Wenn online, versuche direkten Upload
  if (isOnline()) {
    try {
      const token = await getToken();
      if (!token) throw new Error('Nicht authentifiziert');
      
      const formData = new FormData();
      formData.append('box_id', scanData.box_id);
      formData.append('status', scanData.status);
      formData.append('notes', scanData.notes || '');
      
      if (scanData.object_id) formData.append('object_id', scanData.object_id);
      if (scanData.consumption !== undefined) formData.append('consumption', scanData.consumption);
      if (scanData.trap_state !== undefined) formData.append('trap_state', scanData.trap_state);
      if (scanData.quantity !== undefined) formData.append('quantity', scanData.quantity);
      if (scanData.scan_type) formData.append('scan_type', scanData.scan_type);
      if (photo) formData.append('photo', photo);

      const response = await fetch(`${API}/scans`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Scan online gespeichert:', result);
        
        // Cache aktualisieren
        if (scanData.box_id) {
          await updateCachedBox(scanData.box_id, { 
            current_status: scanData.status,
            last_scan_at: new Date().toISOString()
          });
        }
        
        return { success: true, online: true, data: result };
      }
      
      // Bei Server-Fehler offline speichern
      const errorText = await response.text();
      console.warn('⚠️ Server-Fehler, speichere offline:', errorText);
    } catch (error) {
      console.warn('⚠️ Netzwerk-Fehler, speichere offline:', error.message);
    }
  }

  // Offline speichern
  const localId = await addPendingScan(offlineScan);
  
  // Auch zur lokalen History hinzufügen
  await addOfflineScanToHistory(scanData.box_id, {
    ...offlineScan,
    scanned_at: offlineScan.offline_created_at,
    users: await getCachedUser().then(u => u?.user || { email: 'Offline' })
  });
  
  // Lokalen Box-Status aktualisieren
  await updateCachedBox(scanData.box_id, { 
    current_status: scanData.status,
    last_scan_at: offlineScan.offline_created_at
  });
  
  console.log('📝 Scan offline gespeichert:', localId);
  
  return { 
    success: true, 
    online: false, 
    localId,
    message: 'Kontrolle wurde offline gespeichert und wird bei Verbindung synchronisiert.'
  };
};

/**
 * Lädt Scan-Historie für eine Box - Online oder aus Cache
 */
export const getBoxHistory = async (boxId, limit = 20) => {
  // Wenn online, Server abfragen
  if (isOnline()) {
    try {
      const token = await getToken();
      const response = await authFetch(`${API}/scans?box_id=${boxId}&limit=${limit}`);

      if (response.ok) {
        const data = await response.json();
        const scans = Array.isArray(data) ? data : data.data || [];
        
        // Cache aktualisieren
        await cacheHistory(boxId, scans);
        
        return { success: true, online: true, data: scans };
      }
    } catch (error) {
      console.warn('⚠️ History-Laden fehlgeschlagen, verwende Cache:', error.message);
    }
  }

  // Fallback auf Cache
  const cachedHistory = await getCachedHistoryForBox(boxId);
  
  // Auch pending offline scans hinzufügen
  const pendingScans = await getUnsyncedScans();
  const boxPendingScans = pendingScans
    .filter(s => s.box_id === boxId)
    .map(s => ({
      ...s,
      id: `pending_${s.localId}`,
      scanned_at: s.offline_created_at,
      offline: true,
      pending: true
    }));
  
  const combined = [...boxPendingScans, ...cachedHistory]
    .sort((a, b) => new Date(b.scanned_at || b.created_at) - new Date(a.scanned_at || a.created_at))
    .slice(0, limit);
  
  return { 
    success: true, 
    online: false, 
    cached: true,
    data: combined 
  };
};

// ============================================
// BOX OPERATIONEN
// ============================================

/**
 * Aktualisiert eine Box - Online oder Offline
 */
export const updateBoxOffline = async (boxId, updateData) => {
  // Wenn online, versuche direkten Upload
  if (isOnline()) {
    try {
      const response = await authFetch(`${API}/boxes/${boxId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Box online aktualisiert:', result);
        
        // Cache aktualisieren
        await updateCachedBox(boxId, updateData);
        
        return { success: true, online: true, data: result };
      }
      
      const errorText = await response.text();
      console.warn('⚠️ Server-Fehler, speichere offline:', errorText);
    } catch (error) {
      console.warn('⚠️ Netzwerk-Fehler, speichere offline:', error.message);
    }
  }

  // Offline speichern
  const { localId, tempId } = await addPendingBoxUpdate({
    box_id: boxId,
    ...updateData
  }, 'update');
  
  // Lokalen Cache aktualisieren
  await updateCachedBox(boxId, updateData);
  
  console.log('📦 Box-Update offline gespeichert:', localId);
  
  return { 
    success: true, 
    online: false, 
    localId,
    tempId,
    message: 'Änderungen wurden offline gespeichert.'
  };
};

/**
 * Erstellt Ersteinrichtungs-Scan für Box
 */
export const createSetupScan = async (boxId, boxData, objectId) => {
  const scanData = {
    box_id: boxId,
    object_id: objectId,
    status: 'green',
    notes: 'Ersteinrichtung' + 
      (boxData.bait ? ` | Köder: ${boxData.bait}` : '') + 
      (boxData.insect_type ? ` | Ziel: ${boxData.insect_type}` : ''),
    scan_type: 'setup'
  };
  
  return await createScanOffline(scanData);
};

/**
 * Sucht eine Box per QR-Code - Online, Cache und Pending
 */
export const findBoxByQR = async (qrCode) => {
  // Zuerst in Offline-Pending-Boxen suchen
  const pendingBox = await getPendingBoxByQR(qrCode);
  if (pendingBox) {
    return { 
      success: true, 
      offline: true, 
      pending: true,
      data: pendingBox,
      message: 'Diese Box wurde offline bearbeitet und wartet auf Synchronisation.'
    };
  }

  // Dann im Cache suchen
  const cachedBox = await getCachedBoxByQR(qrCode);
  
  // Wenn online, Server abfragen
  if (isOnline()) {
    try {
      const response = await authFetch(`${API}/qr/${qrCode}`);

      if (response.ok) {
        const result = await response.json();
        
        // Cache aktualisieren
        await cacheBox(result);
        
        return { success: true, online: true, data: result };
      }
      
      if (response.status === 404) {
        return { success: false, notFound: true };
      }
    } catch (error) {
      console.warn('⚠️ Netzwerk-Fehler, verwende Cache:', error.message);
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

/**
 * Holt Box-Details per ID
 */
export const getBoxById = async (boxId) => {
  // Pending Update prüfen
  const pendingBox = await getPendingBoxById(boxId);
  
  // Wenn online, Server abfragen
  if (isOnline()) {
    try {
      const response = await authFetch(`${API}/boxes/${boxId}`);

      if (response.ok) {
        let result = await response.json();
        
        // Pending Updates mergen
        if (pendingBox) {
          result = { ...result, ...pendingBox, _hasPendingUpdates: true };
        }
        
        // Cache aktualisieren
        await cacheBox(result);
        
        return { success: true, online: true, data: result };
      }
    } catch (error) {
      console.warn('⚠️ Netzwerk-Fehler, verwende Cache');
    }
  }

  // Fallback auf Cache
  let cachedBox = await getCachedBox(boxId);
  
  if (cachedBox) {
    // Pending Updates mergen
    if (pendingBox) {
      cachedBox = { ...cachedBox, ...pendingBox, _hasPendingUpdates: true };
    }
    
    return { 
      success: true, 
      offline: true, 
      cached: true,
      data: cachedBox
    };
  }

  return { success: false, notFound: true };
};

/**
 * Box zurück ins Lager - Online oder Offline
 */
export const returnBoxToPool = async (boxId) => {
  if (isOnline()) {
    try {
      const response = await authFetch(`${API}/boxes/${boxId}/return-to-pool`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        
        // Cache aktualisieren - Box resetten
        await updateCachedBox(boxId, {
          object_id: null,
          layout_id: null,
          lat: null,
          lng: null,
          position_type: null,
          grid_position: null,
          current_status: null
        });
        
        return { success: true, online: true, data: result };
      }
      
      const error = await response.json();
      throw new Error(error.error || 'Fehler beim Zurücksetzen');
    } catch (error) {
      if (error.message !== 'Failed to fetch') {
        throw error;
      }
      console.warn('⚠️ Netzwerk-Fehler, speichere offline');
    }
  }

  // Offline speichern
  const localId = await addPendingReturnToPool(boxId);
  
  // Lokalen Cache aktualisieren
  await updateCachedBox(boxId, {
    object_id: null,
    layout_id: null,
    current_status: null,
    _pendingReturnToPool: true
  });
  
  return { 
    success: true, 
    online: false, 
    localId,
    message: 'Box wird bei Verbindung zurück ins Lager gesetzt.'
  };
};

/**
 * GPS-Position einer Box aktualisieren
 */
export const updateBoxPosition = async (boxId, lat, lng, positionType = 'gps') => {
  if (isOnline()) {
    try {
      const response = await authFetch(`${API}/boxes/${boxId}/position`, {
        method: 'PUT',
        body: JSON.stringify({ lat, lng, position_type: positionType })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Cache aktualisieren
        await updateCachedBox(boxId, { lat, lng, position_type: positionType });
        
        return { success: true, online: true, data: result };
      }
    } catch (error) {
      console.warn('⚠️ Netzwerk-Fehler, speichere offline');
    }
  }

  // Offline speichern
  const localId = await addPendingPositionUpdate(boxId, lat, lng, positionType);
  
  // Cache aktualisieren
  await updateCachedBox(boxId, { lat, lng, position_type: positionType });
  
  return { 
    success: true, 
    online: false, 
    localId,
    message: 'Position wird bei Verbindung gespeichert.'
  };
};

// ============================================
// STAMMDATEN (Box-Typen, Objekte, Layouts)
// ============================================

/**
 * Lädt Box-Typen - Online oder aus Cache
 */
export const getBoxTypes = async () => {
  if (isOnline()) {
    try {
      // Beide Endpunkte versuchen
      let response;
      try {
        response = await authFetch(`${API}/boxtypes`);
      } catch (e) {
        response = await authFetch(`${API}/box-types`);
      }

      if (response.ok) {
        const data = await response.json();
        const boxTypes = Array.isArray(data) ? data : data?.data || [];
        
        // Cache aktualisieren
        await cacheBoxTypes(boxTypes);
        
        return { success: true, online: true, data: boxTypes };
      }
    } catch (error) {
      console.warn('⚠️ BoxTypes-Laden fehlgeschlagen, verwende Cache');
    }
  }

  // Fallback auf Cache
  const cached = await getCachedBoxTypes();
  
  if (cached.length > 0) {
    return { success: true, offline: true, cached: true, data: cached };
  }
  
  return { success: false, data: [], message: 'Keine Box-Typen verfügbar' };
};

/**
 * Lädt alle Objekte - Online oder aus Cache
 */
export const getObjects = async () => {
  if (isOnline()) {
    try {
      const response = await authFetch(`${API}/objects`);

      if (response.ok) {
        const data = await response.json();
        const objects = Array.isArray(data) ? data : data?.data || [];
        
        await cacheObjects(objects);
        
        return { success: true, online: true, data: objects };
      }
    } catch (error) {
      console.warn('⚠️ Objects-Laden fehlgeschlagen, verwende Cache');
    }
  }

  const cached = await getCachedObjects();
  
  if (cached.length > 0) {
    return { success: true, offline: true, cached: true, data: cached };
  }
  
  return { success: false, data: [] };
};

/**
 * Lädt alle Boxen - Online oder aus Cache
 */
export const getBoxes = async () => {
  if (isOnline()) {
    try {
      const response = await authFetch(`${API}/boxes`);

      if (response.ok) {
        const data = await response.json();
        const boxes = Array.isArray(data) ? data : data?.data || [];
        
        await cacheBoxes(boxes);
        
        return { success: true, online: true, data: boxes };
      }
    } catch (error) {
      console.warn('⚠️ Boxes-Laden fehlgeschlagen, verwende Cache');
    }
  }

  const cached = await getCachedBoxes();
  
  if (cached.length > 0) {
    return { success: true, offline: true, cached: true, data: cached };
  }
  
  return { success: false, data: [] };
};

/**
 * Lädt Boxen für ein bestimmtes Objekt - Online oder aus Cache
 */
export const getBoxesByObject = async (objectId) => {
  if (isOnline()) {
    try {
      const response = await authFetch(`${API}/boxes?object_id=${objectId}`);

      if (response.ok) {
        const data = await response.json();
        const boxes = Array.isArray(data) ? data : data?.data || [];
        
        // Cache alle Boxen (inkl. der neuen)
        const allCached = await getCachedBoxes();
        const otherBoxes = allCached.filter(b => b.object_id !== parseInt(objectId) && b.object_id !== objectId);
        await cacheBoxes([...otherBoxes, ...boxes]);
        
        return { success: true, online: true, data: boxes };
      }
    } catch (error) {
      console.warn('⚠️ Boxes für Objekt laden fehlgeschlagen, verwende Cache:', objectId);
    }
  }

  // Fallback auf Cache - filtern nach object_id
  const cached = await getCachedBoxes();
  const filtered = cached.filter(b => b.object_id === parseInt(objectId) || b.object_id === objectId);
  
  if (filtered.length > 0) {
    return { success: true, offline: true, cached: true, data: filtered };
  }
  
  return { success: false, data: [] };
};

/**
 * Lädt Pool-Boxen (QR-Codes ohne Objekt-Zuweisung) - Online oder aus Cache
 * 🆕 Pool-Boxen werden jetzt auch gecached für Offline-Scans!
 */
export const getPoolBoxes = async () => {
  if (isOnline()) {
    try {
      const response = await authFetch(`${API}/qr/codes`);

      if (response.ok) {
        const data = await response.json();
        const allCodes = Array.isArray(data) ? data : [];
        
        // Pool = Boxen ohne object_id
        const pool = allCodes.filter(qr => !qr.boxes?.object_id);
        
        // 🆕 Pool-Boxen in Cache speichern (als boxes mit status='pool')
        if (pool.length > 0) {
          const poolBoxes = pool.map(qr => ({
            id: qr.boxes?.id || qr.box_id,
            qr_code: qr.id,
            number: qr.boxes?.number,
            display_number: qr.boxes?.display_number,
            status: 'pool',
            object_id: null,
            box_type_id: qr.boxes?.box_type_id,
            box_type_name: qr.boxes?.box_types?.name,
            short_code: qr.boxes?.box_types?.short_code,
            current_status: qr.boxes?.current_status || 'green',
            ...qr.boxes
          })).filter(b => b.id); // Nur Boxen mit gültiger ID
          
          // Vorhandene gecachte Boxen holen (nicht-Pool)
          const existingCached = await getCachedBoxes();
          const nonPoolBoxes = existingCached.filter(b => b.status !== 'pool' && b.object_id);
          
          // Zusammenführen und cachen
          await cacheBoxes([...nonPoolBoxes, ...poolBoxes]);
          console.log('✅ Pool-Boxen gecached:', poolBoxes.length);
        }
        
        return { success: true, online: true, data: pool };
      }
    } catch (error) {
      console.warn('⚠️ Pool-Boxen laden fehlgeschlagen');
    }
  }

  // Fallback auf Cache - Pool-Boxen = status 'pool' oder keine object_id
  const cached = await getCachedBoxes();
  const pool = cached.filter(b => b.status === 'pool' || !b.object_id);
  
  return { success: true, offline: true, cached: true, data: pool };
};

/**
 * Lädt alle Layouts - Online oder aus Cache
 * HINWEIS: Backend hat nur /floorplans/object/:id - 
 * daher laden wir für alle bekannten Objekte
 */
export const getLayouts = async (objectId = null) => {
  // Wenn spezifisches Objekt angefragt
  if (objectId && isOnline()) {
    try {
      const response = await authFetch(`${API}/floorplans/object/${objectId}`);

      if (response.ok) {
        const data = await response.json();
        const layouts = Array.isArray(data) ? data : data?.data || [];
        
        // Zum Cache hinzufügen (nicht ersetzen)
        if (layouts.length > 0) {
          await cacheLayouts(layouts);
        }
        
        return { success: true, online: true, data: layouts };
      }
    } catch (error) {
      console.warn('⚠️ Layouts für Objekt laden fehlgeschlagen:', objectId);
    }
  }
  
  // Versuche alle Layouts aus Cache zu laden
  const cached = await getCachedLayouts();
  
  // Wenn spezifisches Objekt angefragt, filtere
  if (objectId) {
    const filtered = cached.filter(l => l.object_id === parseInt(objectId) || l.object_id === objectId);
    return { success: true, offline: true, cached: true, data: filtered };
  }
  
  if (cached.length > 0) {
    return { success: true, offline: true, cached: true, data: cached };
  }
  
  // Wenn online und kein Cache, versuche für alle Objekte zu laden
  if (isOnline()) {
    try {
      const objectsResult = await getObjects();
      if (objectsResult.success && objectsResult.data?.length > 0) {
        const allLayouts = [];
        
        // Lade Layouts für jedes Objekt (max 10 um nicht zu viele Requests zu machen)
        const objectsToLoad = objectsResult.data.slice(0, 10);
        
        for (const obj of objectsToLoad) {
          try {
            const response = await authFetch(`${API}/floorplans/object/${obj.id}`);
            if (response.ok) {
              const data = await response.json();
              const layouts = Array.isArray(data) ? data : data?.data || [];
              allLayouts.push(...layouts);
            }
          } catch (e) {
            // Einzelne Fehler ignorieren
          }
        }
        
        if (allLayouts.length > 0) {
          await cacheLayouts(allLayouts);
          return { success: true, online: true, data: allLayouts };
        }
      }
    } catch (error) {
      console.warn('⚠️ Layouts-Laden fehlgeschlagen');
    }
  }
  
  return { success: false, data: [] };
};

// ============================================
// CACHE MANAGEMENT
// ============================================

/**
 * Vollständiger Cache-Refresh aller Stammdaten
 * 🆕 Inkl. Pool-Boxen für Offline-Scans
 */
export const refreshAllCaches = async () => {
  if (!isOnline()) {
    console.log('🔴 Offline - Cache-Refresh übersprungen');
    return false;
  }

  console.log('🔄 Starte Cache-Refresh...');
  
  const results = await Promise.allSettled([
    getBoxTypes(),
    getObjects(),
    getBoxes(),
    getPoolBoxes(), // 🆕 Pool-Boxen für Offline-Scans!
    getLayouts()
  ]);
  
  const success = results.every(r => r.status === 'fulfilled' && r.value?.success);
  
  // Statistiken loggen
  const stats = await getOfflineStats();
  console.log(`📦 Cache: ${stats.cachedBoxes} Boxen, ${stats.cachedObjects} Objekte, ${stats.cachedBoxTypes} Typen`);
  console.log(success ? '✅ Cache-Refresh abgeschlossen' : '⚠️ Cache-Refresh teilweise fehlgeschlagen');
  
  return success;
};

/**
 * Cache User und Token
 */
export const cacheCurrentUser = async () => {
  try {
    const token = localStorage.getItem('trapmap_token');
    const userStr = localStorage.getItem('trapmap_user');
    
    if (token && userStr) {
      const user = JSON.parse(userStr);
      await cacheUser(user, token);
      return true;
    }
  } catch (e) {
    console.warn('User-Caching fehlgeschlagen:', e);
  }
  return false;
};

// ============================================
// OFFLINE STATUS & INFO
// ============================================

/**
 * Gibt Offline-Statistiken zurück
 */
export const getOfflineInfo = async () => {
  const stats = await getOfflineStats();

  return {
    isOnline: isOnline(),
    ...stats
  };
};

// ============================================
// SYNC FUNKTIONEN (werden von syncService aufgerufen)
// ============================================

/**
 * Synchronisiert einen einzelnen Offline-Scan
 */
export const syncSingleScan = async (scan) => {
  const token = await getToken();
  if (!token) throw new Error('Nicht authentifiziert');

  const formData = new FormData();
  formData.append('box_id', scan.box_id);
  formData.append('status', scan.status);
  formData.append('notes', scan.notes || '');
  
  if (scan.object_id) formData.append('object_id', scan.object_id);
  if (scan.consumption !== undefined) formData.append('consumption', scan.consumption);
  if (scan.trap_state !== undefined) formData.append('trap_state', scan.trap_state);
  if (scan.quantity !== undefined) formData.append('quantity', scan.quantity);
  if (scan.scan_type) formData.append('scan_type', scan.scan_type);
  
  // Base64 Photo zurück zu Blob
  if (scan.photo_base64) {
    const blob = base64ToBlob(scan.photo_base64);
    if (blob) {
      formData.append('photo', blob, scan.photo_name || 'photo.jpg');
    }
  }
  
  // Offline-Zeitstempel hinzufügen
  if (scan.offline_created_at) {
    formData.append('offline_created_at', scan.offline_created_at);
  }

  const response = await fetch(`${API}/scans`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Sync fehlgeschlagen');
  }

  return await response.json();
};

/**
 * Synchronisiert ein einzelnes Box-Update
 */
export const syncSingleBoxUpdate = async (boxUpdate) => {
  const token = await getToken();
  if (!token) throw new Error('Nicht authentifiziert');

  const { box_id, operation, localId, tempId, created_at, synced, attempts, ...updateData } = boxUpdate;

  const response = await fetch(`${API}/boxes/${box_id}`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(updateData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Box-Sync fehlgeschlagen');
  }

  return await response.json();
};

/**
 * Synchronisiert ein Position-Update
 */
export const syncSinglePositionUpdate = async (posUpdate) => {
  const token = await getToken();
  if (!token) throw new Error('Nicht authentifiziert');

  const response = await fetch(`${API}/boxes/${posUpdate.box_id}/position`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({
      lat: posUpdate.lat,
      lng: posUpdate.lng,
      position_type: posUpdate.position_type
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Position-Sync fehlgeschlagen');
  }

  return await response.json();
};

/**
 * Synchronisiert Return-to-Pool
 */
export const syncSingleReturnToPool = async (returnItem) => {
  const token = await getToken();
  if (!token) throw new Error('Nicht authentifiziert');

  const response = await fetch(`${API}/boxes/${returnItem.box_id}/return-to-pool`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Return-to-Pool-Sync fehlgeschlagen');
  }

  return await response.json();
};

// Export für Sync Service
export {
  getUnsyncedScans,
  getUnsyncedBoxes,
  getUnsyncedPositionUpdates,
  getUnsyncedReturnToPool,
  markScanAsSynced,
  markBoxAsSynced,
  markPositionUpdateAsSynced,
  markReturnToPoolAsSynced,
  incrementScanAttempts,
  deletePendingScan,
  deletePendingBox,
  addSyncLog
};