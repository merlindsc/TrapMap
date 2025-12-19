/* ============================================================
   TRAPMAP – OFFLINE DATABASE (IndexedDB)
   Vollständige lokale Datenspeicherung für Offline-Funktionalität
   
   STORES:
   - pending_scans: Offline erstellte Kontrollen
   - pending_boxes: Offline erstellte/bearbeitete Boxen
   - pending_position_updates: Offline GPS-Updates
   - cached_boxes: Alle Boxen für Offline-Zugriff
   - cached_objects: Alle Objekte/Standorte
   - cached_box_types: Alle Box-Typen
   - cached_layouts: Alle Layouts/Lagepläne
   - cached_history: Scan-Historie pro Box
   - cached_user: Aktueller User + Organisation
   - sync_queue: Allgemeine Sync-Queue
   ============================================================ */

const DB_NAME = 'trapmap_offline_v2';
const DB_VERSION = 2;

// Store Namen als Konstanten
export const STORES = {
  PENDING_SCANS: 'pending_scans',
  PENDING_BOXES: 'pending_boxes',
  PENDING_POSITION_UPDATES: 'pending_position_updates',
  PENDING_RETURN_TO_POOL: 'pending_return_to_pool',
  CACHED_BOXES: 'cached_boxes',
  CACHED_OBJECTS: 'cached_objects',
  CACHED_BOX_TYPES: 'cached_box_types',
  CACHED_LAYOUTS: 'cached_layouts',
  CACHED_HISTORY: 'cached_history',
  CACHED_USER: 'cached_user',
  SYNC_QUEUE: 'sync_queue',
  SYNC_LOG: 'sync_log'
};

let db = null;
let dbInitPromise = null;

/**
 * Initialisiert die IndexedDB
 */
export const initDB = () => {
  // Verhindere mehrfache gleichzeitige Initialisierungen
  if (dbInitPromise) return dbInitPromise;
  
  dbInitPromise = new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('❌ IndexedDB Fehler:', request.error);
      dbInitPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('✅ IndexedDB initialisiert (v' + DB_VERSION + ')');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // ========== PENDING STORES (Offline-Änderungen) ==========
      
      // Pending Scans - Kontrollen die offline erstellt wurden
      if (!database.objectStoreNames.contains(STORES.PENDING_SCANS)) {
        const scanStore = database.createObjectStore(STORES.PENDING_SCANS, { 
          keyPath: 'localId', 
          autoIncrement: true 
        });
        scanStore.createIndex('box_id', 'box_id', { unique: false });
        scanStore.createIndex('created_at', 'created_at', { unique: false });
        scanStore.createIndex('synced', 'synced', { unique: false });
      }

      // Pending Boxes - Box-Updates die offline erstellt wurden
      if (!database.objectStoreNames.contains(STORES.PENDING_BOXES)) {
        const boxStore = database.createObjectStore(STORES.PENDING_BOXES, { 
          keyPath: 'localId', 
          autoIncrement: true 
        });
        boxStore.createIndex('box_id', 'box_id', { unique: false });
        boxStore.createIndex('qr_code', 'qr_code', { unique: false });
        boxStore.createIndex('synced', 'synced', { unique: false });
        boxStore.createIndex('operation', 'operation', { unique: false });
      }

      // Pending Position Updates - GPS-Updates die offline gemacht wurden
      if (!database.objectStoreNames.contains(STORES.PENDING_POSITION_UPDATES)) {
        const posStore = database.createObjectStore(STORES.PENDING_POSITION_UPDATES, { 
          keyPath: 'localId', 
          autoIncrement: true 
        });
        posStore.createIndex('box_id', 'box_id', { unique: false });
        posStore.createIndex('synced', 'synced', { unique: false });
      }

      // Pending Return to Pool - Boxen die offline ins Lager zurückgesetzt wurden
      if (!database.objectStoreNames.contains(STORES.PENDING_RETURN_TO_POOL)) {
        const returnStore = database.createObjectStore(STORES.PENDING_RETURN_TO_POOL, { 
          keyPath: 'localId', 
          autoIncrement: true 
        });
        returnStore.createIndex('box_id', 'box_id', { unique: false });
        returnStore.createIndex('synced', 'synced', { unique: false });
      }

      // ========== CACHED STORES (Stammdaten für Offline-Zugriff) ==========

      // Cached Boxes - Alle Boxen
      if (!database.objectStoreNames.contains(STORES.CACHED_BOXES)) {
        const cachedBoxStore = database.createObjectStore(STORES.CACHED_BOXES, { 
          keyPath: 'id' 
        });
        cachedBoxStore.createIndex('qr_code', 'qr_code', { unique: false });
        cachedBoxStore.createIndex('object_id', 'object_id', { unique: false });
        cachedBoxStore.createIndex('layout_id', 'layout_id', { unique: false });
      }

      // Cached Objects - Alle Objekte/Standorte
      if (!database.objectStoreNames.contains(STORES.CACHED_OBJECTS)) {
        database.createObjectStore(STORES.CACHED_OBJECTS, { keyPath: 'id' });
      }

      // Cached Box Types - Alle Box-Typen
      if (!database.objectStoreNames.contains(STORES.CACHED_BOX_TYPES)) {
        const typesStore = database.createObjectStore(STORES.CACHED_BOX_TYPES, { keyPath: 'id' });
        typesStore.createIndex('category', 'category', { unique: false });
      }

      // Cached Layouts - Alle Lagepläne
      if (!database.objectStoreNames.contains(STORES.CACHED_LAYOUTS)) {
        const layoutStore = database.createObjectStore(STORES.CACHED_LAYOUTS, { keyPath: 'id' });
        layoutStore.createIndex('object_id', 'object_id', { unique: false });
      }

      // Cached History - Scan-Historie pro Box
      if (!database.objectStoreNames.contains(STORES.CACHED_HISTORY)) {
        const historyStore = database.createObjectStore(STORES.CACHED_HISTORY, { 
          keyPath: 'id' 
        });
        historyStore.createIndex('box_id', 'box_id', { unique: false });
        historyStore.createIndex('scanned_at', 'scanned_at', { unique: false });
      }

      // Cached User - Aktueller User + Organisation
      if (!database.objectStoreNames.contains(STORES.CACHED_USER)) {
        database.createObjectStore(STORES.CACHED_USER, { keyPath: 'key' });
      }

      // ========== SYSTEM STORES ==========

      // Sync Queue - Allgemeine Sync-Operationen
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = database.createObjectStore(STORES.SYNC_QUEUE, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('priority', 'priority', { unique: false });
        syncStore.createIndex('created_at', 'created_at', { unique: false });
        syncStore.createIndex('status', 'status', { unique: false });
      }

      // Sync Log - Historie der Synchronisierungen
      if (!database.objectStoreNames.contains(STORES.SYNC_LOG)) {
        const logStore = database.createObjectStore(STORES.SYNC_LOG, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
        logStore.createIndex('success', 'success', { unique: false });
      }

      console.log('📦 IndexedDB Stores erstellt/aktualisiert');
    };
  });
  
  return dbInitPromise;
};

// ============================================
// GENERISCHE HELPER FUNKTIONEN
// ============================================

/**
 * Sicherstellen dass DB initialisiert ist
 */
const ensureDB = async () => {
  if (!db) {
    await initDB();
  }
  return db;
};

/**
 * Generische Funktion zum Hinzufügen eines Eintrags
 */
const addToStore = (storeName, data) => {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await ensureDB();
      const transaction = database.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.add(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generische Funktion zum Aktualisieren/Einfügen eines Eintrags
 */
const putToStore = (storeName, data) => {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await ensureDB();
      const transaction = database.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.put(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generische Funktion zum Löschen eines Eintrags
 */
const deleteFromStore = (storeName, key) => {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await ensureDB();
      const transaction = database.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generische Funktion zum Abrufen aller Einträge
 */
const getAllFromStore = (storeName) => {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await ensureDB();
      const transaction = database.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generische Funktion zum Abrufen eines Eintrags per Key
 */
const getFromStore = (storeName, key) => {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await ensureDB();
      const transaction = database.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Abrufen per Index
 */
const getByIndex = (storeName, indexName, value) => {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await ensureDB();
      const transaction = database.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      
      const request = index.getAll(value);
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Store komplett leeren
 */
const clearStore = (storeName) => {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await ensureDB();
      const transaction = database.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
};

// ============================================
// PENDING SCANS (Offline-Kontrollen)
// ============================================

export const addPendingScan = async (scanData) => {
  const data = {
    ...scanData,
    created_at: new Date().toISOString(),
    synced: false,
    attempts: 0
  };
  const localId = await addToStore(STORES.PENDING_SCANS, data);
  console.log('📝 Offline-Scan gespeichert:', localId);
  return localId;
};

export const getPendingScans = () => getAllFromStore(STORES.PENDING_SCANS);

export const getUnsyncedScans = async () => {
  const all = await getPendingScans();
  return all.filter(s => !s.synced);
};

export const markScanAsSynced = async (localId, serverId = null) => {
  const scan = await getFromStore(STORES.PENDING_SCANS, localId);
  if (scan) {
    scan.synced = true;
    scan.synced_at = new Date().toISOString();
    if (serverId) scan.server_id = serverId;
    await putToStore(STORES.PENDING_SCANS, scan);
  }
};

export const incrementScanAttempts = async (localId) => {
  const scan = await getFromStore(STORES.PENDING_SCANS, localId);
  if (scan) {
    scan.attempts = (scan.attempts || 0) + 1;
    scan.last_attempt = new Date().toISOString();
    await putToStore(STORES.PENDING_SCANS, scan);
  }
};

export const deletePendingScan = (localId) => deleteFromStore(STORES.PENDING_SCANS, localId);

// ============================================
// PENDING BOXES (Offline-Box-Änderungen)
// ============================================

// Helper: Box-Nummer aus QR-Code extrahieren (ohne führende Nullen)
const extractBoxNumberFromQR = (qrCode) => {
  if (!qrCode) return null;
  const match = qrCode.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

export const addPendingBoxUpdate = async (boxData, operation = 'update') => {
  // Bei neuen Boxen: Nummer automatisch aus QR-Code ableiten
  let boxNumber = boxData.number;
  if (!boxNumber && boxData.qr_code) {
    boxNumber = extractBoxNumberFromQR(boxData.qr_code);
  }
  
  const data = {
    ...boxData,
    number: boxNumber,
    display_number: boxNumber,
    operation, // 'create', 'update', 'setup'
    created_at: new Date().toISOString(),
    synced: false,
    attempts: 0,
    tempId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  const localId = await addToStore(STORES.PENDING_BOXES, data);
  console.log('📦 Offline-Box-Update gespeichert:', localId, operation, 'Nummer:', boxNumber);
  return { localId, tempId: data.tempId };
};

export const getPendingBoxes = () => getAllFromStore(STORES.PENDING_BOXES);

export const getUnsyncedBoxes = async () => {
  const all = await getPendingBoxes();
  return all.filter(b => !b.synced);
};

export const getPendingBoxByQR = async (qrCode) => {
  const results = await getByIndex(STORES.PENDING_BOXES, 'qr_code', qrCode);
  // Nur unsynced zurückgeben
  const unsynced = results.filter(b => !b.synced);
  return unsynced.length > 0 ? unsynced[0] : null;
};

export const getPendingBoxById = async (boxId) => {
  const results = await getByIndex(STORES.PENDING_BOXES, 'box_id', boxId);
  const unsynced = results.filter(b => !b.synced);
  return unsynced.length > 0 ? unsynced[0] : null;
};

export const markBoxAsSynced = async (localId, serverId = null) => {
  const box = await getFromStore(STORES.PENDING_BOXES, localId);
  if (box) {
    box.synced = true;
    box.synced_at = new Date().toISOString();
    if (serverId) box.server_id = serverId;
    await putToStore(STORES.PENDING_BOXES, box);
  }
};

export const deletePendingBox = (localId) => deleteFromStore(STORES.PENDING_BOXES, localId);

// ============================================
// PENDING POSITION UPDATES
// ============================================

export const addPendingPositionUpdate = async (boxId, lat, lng, positionType = 'gps') => {
  const data = {
    box_id: boxId,
    lat,
    lng,
    position_type: positionType,
    created_at: new Date().toISOString(),
    synced: false
  };
  const localId = await addToStore(STORES.PENDING_POSITION_UPDATES, data);
  console.log('📍 Offline-Position gespeichert:', localId);
  return localId;
};

export const getUnsyncedPositionUpdates = async () => {
  const all = await getAllFromStore(STORES.PENDING_POSITION_UPDATES);
  return all.filter(p => !p.synced);
};

export const markPositionUpdateAsSynced = async (localId) => {
  const pos = await getFromStore(STORES.PENDING_POSITION_UPDATES, localId);
  if (pos) {
    pos.synced = true;
    pos.synced_at = new Date().toISOString();
    await putToStore(STORES.PENDING_POSITION_UPDATES, pos);
  }
};

// ============================================
// PENDING RETURN TO POOL
// ============================================

export const addPendingReturnToPool = async (boxId) => {
  const data = {
    box_id: boxId,
    created_at: new Date().toISOString(),
    synced: false
  };
  const localId = await addToStore(STORES.PENDING_RETURN_TO_POOL, data);
  console.log('📤 Offline-Return-to-Pool gespeichert:', localId);
  return localId;
};

export const getUnsyncedReturnToPool = async () => {
  const all = await getAllFromStore(STORES.PENDING_RETURN_TO_POOL);
  return all.filter(r => !r.synced);
};

export const markReturnToPoolAsSynced = async (localId) => {
  const item = await getFromStore(STORES.PENDING_RETURN_TO_POOL, localId);
  if (item) {
    item.synced = true;
    item.synced_at = new Date().toISOString();
    await putToStore(STORES.PENDING_RETURN_TO_POOL, item);
  }
};

// ============================================
// CACHED BOXES
// ============================================

/**
 * Cached Boxen mit allen relevanten Feldern für Offline-Scan
 * WICHTIG: Alle Felder müssen explizit gespeichert werden für:
 * - Ersteinrichtungs-Erkennung (box_type_id, object_id)
 * - Kontrollformular (box_type_name, current_status, last_scan)
 * - Platzierung (lat, lng, floor_plan_id, pos_x, pos_y)
 */
export const cacheBoxes = async (boxes) => {
  const database = await ensureDB();
  const transaction = database.transaction(STORES.CACHED_BOXES, 'readwrite');
  const store = transaction.objectStore(STORES.CACHED_BOXES);
  
  for (const box of boxes) {
    // Vollständige Box-Daten speichern mit expliziten Feldern
    const boxToCache = {
      // Basis-IDs
      id: box.id,
      qr_code: box.qr_code,
      object_id: box.object_id,
      organisation_id: box.organisation_id,
      
      // Box-Typ (WICHTIG für Ersteinrichtungs-Erkennung!)
      box_type_id: box.box_type_id,
      box_type_name: box.box_type_name || box.box_types?.name,
      box_type_category: box.box_type_category || box.box_types?.category,
      short_code: box.short_code || box.box_types?.short_code,
      
      // Position GPS
      lat: box.lat,
      lng: box.lng,
      position_type: box.position_type,
      
      // Position Lageplan
      floor_plan_id: box.floor_plan_id,
      pos_x: box.pos_x,
      pos_y: box.pos_y,
      grid_position: box.grid_position,
      layout_id: box.layout_id,
      
      // Nummern
      number: box.number,
      display_number: box.display_number,
      box_name: box.box_name,
      name: box.name,
      
      // Status (WICHTIG für Kontrollformular!)
      current_status: box.current_status,
      status: box.status,
      
      // Letzter Scan (für Ersteinrichtungs-Erkennung!)
      last_scan: box.last_scan || box.last_scan_at,
      last_scan_at: box.last_scan_at || box.last_scan,
      
      // Zusätzliche Daten
      bait: box.bait,
      notes: box.notes,
      insect_type: box.insect_type,
      
      // Objekt-Info (falls vorhanden)
      object_name: box.object_name || box.objects?.name,
      floor_plan_name: box.floor_plan_name || box.floor_plans?.name,
      
      // Timestamp für Cache-Invalidierung
      cached_at: new Date().toISOString()
    };
    
    store.put(boxToCache);
  }
  
  console.log(`📦 ${boxes.length} Boxen gecached (mit vollständigen Feldern)`);
};

export const cacheBox = async (box) => {
  // Einzelne Box mit vollständigen Feldern cachen
  const boxToCache = {
    // Basis-IDs
    id: box.id,
    qr_code: box.qr_code,
    object_id: box.object_id,
    organisation_id: box.organisation_id,
    
    // Box-Typ (WICHTIG für Ersteinrichtungs-Erkennung!)
    box_type_id: box.box_type_id,
    box_type_name: box.box_type_name || box.box_types?.name,
    box_type_category: box.box_type_category || box.box_types?.category,
    short_code: box.short_code || box.box_types?.short_code,
    
    // Position GPS
    lat: box.lat,
    lng: box.lng,
    position_type: box.position_type,
    
    // Position Lageplan
    floor_plan_id: box.floor_plan_id,
    pos_x: box.pos_x,
    pos_y: box.pos_y,
    grid_position: box.grid_position,
    layout_id: box.layout_id,
    
    // Nummern
    number: box.number,
    display_number: box.display_number,
    box_name: box.box_name,
    name: box.name,
    
    // Status (WICHTIG für Kontrollformular!)
    current_status: box.current_status,
    status: box.status,
    
    // Letzter Scan (für Ersteinrichtungs-Erkennung!)
    last_scan: box.last_scan || box.last_scan_at,
    last_scan_at: box.last_scan_at || box.last_scan,
    
    // Zusätzliche Daten
    bait: box.bait,
    notes: box.notes,
    insect_type: box.insect_type,
    
    // Objekt-Info
    object_name: box.object_name || box.objects?.name,
    floor_plan_name: box.floor_plan_name || box.floor_plans?.name,
    
    // Timestamp
    cached_at: new Date().toISOString()
  };
  
  await putToStore(STORES.CACHED_BOXES, boxToCache);
};

export const getCachedBoxes = () => getAllFromStore(STORES.CACHED_BOXES);

export const getCachedBox = (id) => getFromStore(STORES.CACHED_BOXES, id);

export const getCachedBoxByQR = async (qrCode) => {
  const results = await getByIndex(STORES.CACHED_BOXES, 'qr_code', qrCode);
  return results.length > 0 ? results[0] : null;
};

export const getCachedBoxesByObject = (objectId) => 
  getByIndex(STORES.CACHED_BOXES, 'object_id', objectId);

export const getCachedBoxesByLayout = (layoutId) => 
  getByIndex(STORES.CACHED_BOXES, 'layout_id', layoutId);

export const updateCachedBox = async (boxId, updates) => {
  const box = await getCachedBox(boxId);
  if (box) {
    await putToStore(STORES.CACHED_BOXES, { 
      ...box, 
      ...updates, 
      cached_at: new Date().toISOString() 
    });
  }
};

export const clearCachedBoxes = () => clearStore(STORES.CACHED_BOXES);

// ============================================
// CACHED OBJECTS
// ============================================

export const cacheObjects = async (objects) => {
  const database = await ensureDB();
  const transaction = database.transaction(STORES.CACHED_OBJECTS, 'readwrite');
  const store = transaction.objectStore(STORES.CACHED_OBJECTS);
  
  for (const obj of objects) {
    store.put({ ...obj, cached_at: new Date().toISOString() });
  }
  
  console.log(`🏢 ${objects.length} Objekte gecached`);
};

export const getCachedObjects = () => getAllFromStore(STORES.CACHED_OBJECTS);
export const getCachedObject = (id) => getFromStore(STORES.CACHED_OBJECTS, id);
export const clearCachedObjects = () => clearStore(STORES.CACHED_OBJECTS);

// ============================================
// CACHED BOX TYPES
// ============================================

export const cacheBoxTypes = async (boxTypes) => {
  const database = await ensureDB();
  const transaction = database.transaction(STORES.CACHED_BOX_TYPES, 'readwrite');
  const store = transaction.objectStore(STORES.CACHED_BOX_TYPES);
  
  // Erst leeren, dann neu befüllen
  store.clear();
  
  for (const type of boxTypes) {
    store.put({ ...type, cached_at: new Date().toISOString() });
  }
  
  console.log(`📋 ${boxTypes.length} Box-Typen gecached`);
};

export const getCachedBoxTypes = () => getAllFromStore(STORES.CACHED_BOX_TYPES);
export const getCachedBoxType = (id) => getFromStore(STORES.CACHED_BOX_TYPES, id);
export const clearCachedBoxTypes = () => clearStore(STORES.CACHED_BOX_TYPES);

// ============================================
// CACHED LAYOUTS
// ============================================

export const cacheLayouts = async (layouts) => {
  const database = await ensureDB();
  const transaction = database.transaction(STORES.CACHED_LAYOUTS, 'readwrite');
  const store = transaction.objectStore(STORES.CACHED_LAYOUTS);
  
  for (const layout of layouts) {
    store.put({ ...layout, cached_at: new Date().toISOString() });
  }
  
  console.log(`🗺️ ${layouts.length} Layouts gecached`);
};

export const getCachedLayouts = () => getAllFromStore(STORES.CACHED_LAYOUTS);
export const getCachedLayout = (id) => getFromStore(STORES.CACHED_LAYOUTS, id);
export const getCachedLayoutsByObject = (objectId) => 
  getByIndex(STORES.CACHED_LAYOUTS, 'object_id', objectId);
export const clearCachedLayouts = () => clearStore(STORES.CACHED_LAYOUTS);

// ============================================
// CACHED HISTORY (Scan-Historie)
// ============================================

export const cacheHistory = async (boxId, scans) => {
  const database = await ensureDB();
  const transaction = database.transaction(STORES.CACHED_HISTORY, 'readwrite');
  const store = transaction.objectStore(STORES.CACHED_HISTORY);
  
  for (const scan of scans) {
    // Kombinierter Key aus box_id und scan_id für Eindeutigkeit
    store.put({ 
      ...scan, 
      cache_key: `${boxId}_${scan.id}`,
      cached_at: new Date().toISOString() 
    });
  }
  
  console.log(`📜 ${scans.length} History-Einträge für Box ${boxId} gecached`);
};

export const getCachedHistoryForBox = async (boxId) => {
  const results = await getByIndex(STORES.CACHED_HISTORY, 'box_id', boxId);
  // Nach Datum sortieren (neueste zuerst)
  return results.sort((a, b) => 
    new Date(b.scanned_at || b.created_at) - new Date(a.scanned_at || a.created_at)
  );
};

export const addOfflineScanToHistory = async (boxId, scanData) => {
  // Füge offline erstellten Scan zur History hinzu
  const historyEntry = {
    ...scanData,
    id: `offline_${Date.now()}`,
    box_id: boxId,
    offline: true,
    synced: false,
    cached_at: new Date().toISOString()
  };
  await putToStore(STORES.CACHED_HISTORY, historyEntry);
};

export const clearCachedHistory = () => clearStore(STORES.CACHED_HISTORY);

// ============================================
// CACHED USER & AUTH
// ============================================

export const cacheUser = async (user, token) => {
  await putToStore(STORES.CACHED_USER, { 
    key: 'current_user', 
    user, 
    token,
    cached_at: new Date().toISOString() 
  });
  console.log('👤 User gecached');
};

export const getCachedUser = async () => {
  const data = await getFromStore(STORES.CACHED_USER, 'current_user');
  return data || null;
};

export const clearCachedUser = () => clearStore(STORES.CACHED_USER);

// ============================================
// SYNC LOG
// ============================================

export const addSyncLog = async (success, details = {}) => {
  const log = {
    timestamp: new Date().toISOString(),
    success,
    ...details
  };
  await addToStore(STORES.SYNC_LOG, log);
};

export const getSyncLogs = async (limit = 50) => {
  const all = await getAllFromStore(STORES.SYNC_LOG);
  return all
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
};

// ============================================
// STATISTIKEN & UTILITIES
// ============================================

export const getOfflineStats = async () => {
  const pendingScans = await getUnsyncedScans();
  const pendingBoxes = await getUnsyncedBoxes();
  const pendingPositions = await getUnsyncedPositionUpdates();
  const pendingReturns = await getUnsyncedReturnToPool();
  
  const cachedBoxes = await getCachedBoxes();
  const cachedObjects = await getCachedObjects();
  const cachedBoxTypes = await getCachedBoxTypes();
  const cachedLayouts = await getCachedLayouts();
  
  // 🆕 Pool-Boxen separat zählen
  const poolBoxes = cachedBoxes.filter(b => b.status === 'pool' || b._isPoolBox);

  return {
    pending: {
      scans: pendingScans.length,
      boxes: pendingBoxes.length,
      positions: pendingPositions.length,
      returns: pendingReturns.length,
      total: pendingScans.length + pendingBoxes.length + pendingPositions.length + pendingReturns.length
    },
    cached: {
      boxes: cachedBoxes.length,
      poolBoxes: poolBoxes.length, // 🆕 Pool-Boxen
      objects: cachedObjects.length,
      boxTypes: cachedBoxTypes.length,
      layouts: cachedLayouts.length
    },
    // Kompatibilität für alte Verwendung
    cachedBoxes: cachedBoxes.length,
    cachedObjects: cachedObjects.length,
    cachedBoxTypes: cachedBoxTypes.length,
    cachedLayouts: cachedLayouts.length
  };
};

export const clearAllPendingData = async () => {
  await clearStore(STORES.PENDING_SCANS);
  await clearStore(STORES.PENDING_BOXES);
  await clearStore(STORES.PENDING_POSITION_UPDATES);
  await clearStore(STORES.PENDING_RETURN_TO_POOL);
  console.log('🗑️ Alle ausstehenden Daten gelöscht');
};

export const clearAllCachedData = async () => {
  await clearStore(STORES.CACHED_BOXES);
  await clearStore(STORES.CACHED_OBJECTS);
  await clearStore(STORES.CACHED_BOX_TYPES);
  await clearStore(STORES.CACHED_LAYOUTS);
  await clearStore(STORES.CACHED_HISTORY);
  console.log('🗑️ Alle gecachten Daten gelöscht');
};

export const clearAllOfflineData = async () => {
  await clearAllPendingData();
  await clearAllCachedData();
  await clearStore(STORES.SYNC_LOG);
  console.log('🗑️ Alle Offline-Daten gelöscht');
};

// Initialisiere beim Import
if (typeof window !== 'undefined') {
  initDB().catch(err => {
    console.warn('IndexedDB init failed (will retry on first use):', err);
  });
}