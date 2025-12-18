/* ============================================================
   TRAPMAP — OFFLINE DATABASE (IndexedDB)
   Lokale Datenspeicherung für Offline-Funktionalität
   ============================================================ */

const DB_NAME = 'trapmap_offline';
const DB_VERSION = 1;

// Store Namen
const STORES = {
  PENDING_SCANS: 'pending_scans',
  PENDING_BOXES: 'pending_boxes',
  CACHED_BOXES: 'cached_boxes',
  CACHED_OBJECTS: 'cached_objects',
  SYNC_QUEUE: 'sync_queue'
};

let db = null;

/**
 * Initialisiert die IndexedDB
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('❌ IndexedDB Fehler:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('✅ IndexedDB initialisiert');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Pending Scans - Scans die offline erstellt wurden
      if (!database.objectStoreNames.contains(STORES.PENDING_SCANS)) {
        const scanStore = database.createObjectStore(STORES.PENDING_SCANS, { 
          keyPath: 'localId', 
          autoIncrement: true 
        });
        scanStore.createIndex('box_id', 'box_id', { unique: false });
        scanStore.createIndex('created_at', 'created_at', { unique: false });
        scanStore.createIndex('synced', 'synced', { unique: false });
      }

      // Pending Boxes - Neue Boxen die offline erstellt wurden
      if (!database.objectStoreNames.contains(STORES.PENDING_BOXES)) {
        const boxStore = database.createObjectStore(STORES.PENDING_BOXES, { 
          keyPath: 'localId', 
          autoIncrement: true 
        });
        boxStore.createIndex('qr_code', 'qr_code', { unique: true });
        boxStore.createIndex('synced', 'synced', { unique: false });
      }

      // Cached Boxes - Für Offline-Zugriff
      if (!database.objectStoreNames.contains(STORES.CACHED_BOXES)) {
        const cachedBoxStore = database.createObjectStore(STORES.CACHED_BOXES, { 
          keyPath: 'id' 
        });
        cachedBoxStore.createIndex('qr_code', 'qr_code', { unique: false });
        cachedBoxStore.createIndex('object_id', 'object_id', { unique: false });
      }

      // Cached Objects - Für Offline-Zugriff
      if (!database.objectStoreNames.contains(STORES.CACHED_OBJECTS)) {
        database.createObjectStore(STORES.CACHED_OBJECTS, { keyPath: 'id' });
      }

      // Sync Queue - Alle ausstehenden Sync-Operationen
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = database.createObjectStore(STORES.SYNC_QUEUE, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('priority', 'priority', { unique: false });
        syncStore.createIndex('created_at', 'created_at', { unique: false });
      }

      console.log('📦 IndexedDB Stores erstellt');
    };
  });
};

/**
 * Generische Funktion zum Hinzufügen eines Eintrags
 */
const addToStore = (storeName, data) => {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await initDB();
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
 * Generische Funktion zum Aktualisieren eines Eintrags
 */
const updateInStore = (storeName, data) => {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await initDB();
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
      const database = await initDB();
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
      const database = await initDB();
      const transaction = database.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
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
      const database = await initDB();
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
      const database = await initDB();
      const transaction = database.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      
      const request = index.getAll(value);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
};

// ============================================
// PENDING SCANS (Offline-Scans)
// ============================================

export const addPendingScan = async (scanData) => {
  const data = {
    ...scanData,
    created_at: new Date().toISOString(),
    synced: false
  };
  const localId = await addToStore(STORES.PENDING_SCANS, data);
  console.log('📝 Offline-Scan gespeichert:', localId);
  return localId;
};

export const getPendingScans = () => getAllFromStore(STORES.PENDING_SCANS);

export const markScanAsSynced = async (localId) => {
  const scan = await getFromStore(STORES.PENDING_SCANS, localId);
  if (scan) {
    scan.synced = true;
    scan.synced_at = new Date().toISOString();
    await updateInStore(STORES.PENDING_SCANS, scan);
  }
};

export const deletePendingScan = (localId) => deleteFromStore(STORES.PENDING_SCANS, localId);

export const getUnsyncedScans = async () => {
  const all = await getPendingScans();
  return all.filter(s => !s.synced);
};

// ============================================
// PENDING BOXES (Offline-Box-Ersteinrichtung)
// ============================================

export const addPendingBox = async (boxData) => {
  const data = {
    ...boxData,
    created_at: new Date().toISOString(),
    synced: false,
    tempId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  const localId = await addToStore(STORES.PENDING_BOXES, data);
  console.log('📦 Offline-Box gespeichert:', localId);
  return { localId, tempId: data.tempId };
};

export const getPendingBoxes = () => getAllFromStore(STORES.PENDING_BOXES);

export const getPendingBoxByQR = async (qrCode) => {
  const results = await getByIndex(STORES.PENDING_BOXES, 'qr_code', qrCode);
  return results.length > 0 ? results[0] : null;
};

export const markBoxAsSynced = async (localId, serverId) => {
  const box = await getFromStore(STORES.PENDING_BOXES, localId);
  if (box) {
    box.synced = true;
    box.synced_at = new Date().toISOString();
    box.server_id = serverId;
    await updateInStore(STORES.PENDING_BOXES, box);
  }
};

export const deletePendingBox = (localId) => deleteFromStore(STORES.PENDING_BOXES, localId);

export const getUnsyncedBoxes = async () => {
  const all = await getPendingBoxes();
  return all.filter(b => !b.synced);
};

// ============================================
// CACHED BOXES (Für Offline-Zugriff)
// ============================================

export const cacheBoxes = async (boxes) => {
  const database = await initDB();
  const transaction = database.transaction(STORES.CACHED_BOXES, 'readwrite');
  const store = transaction.objectStore(STORES.CACHED_BOXES);
  
  for (const box of boxes) {
    store.put({ ...box, cached_at: new Date().toISOString() });
  }
  
  console.log(`📦 ${boxes.length} Boxen gecached`);
};

export const getCachedBoxes = () => getAllFromStore(STORES.CACHED_BOXES);

export const getCachedBoxByQR = async (qrCode) => {
  const results = await getByIndex(STORES.CACHED_BOXES, 'qr_code', qrCode);
  return results.length > 0 ? results[0] : null;
};

export const getCachedBox = (id) => getFromStore(STORES.CACHED_BOXES, id);

// ============================================
// CACHED OBJECTS
// ============================================

export const cacheObjects = async (objects) => {
  const database = await initDB();
  const transaction = database.transaction(STORES.CACHED_OBJECTS, 'readwrite');
  const store = transaction.objectStore(STORES.CACHED_OBJECTS);
  
  for (const obj of objects) {
    store.put({ ...obj, cached_at: new Date().toISOString() });
  }
  
  console.log(`🏢 ${objects.length} Objekte gecached`);
};

export const getCachedObjects = () => getAllFromStore(STORES.CACHED_OBJECTS);
export const getCachedObject = (id) => getFromStore(STORES.CACHED_OBJECTS, id);

// ============================================
// SYNC QUEUE
// ============================================

export const addToSyncQueue = async (type, data, priority = 1) => {
  const item = {
    type,
    data,
    priority,
    created_at: new Date().toISOString(),
    attempts: 0,
    status: 'pending'
  };
  return await addToStore(STORES.SYNC_QUEUE, item);
};

export const getSyncQueue = () => getAllFromStore(STORES.SYNC_QUEUE);

export const updateSyncItem = (item) => updateInStore(STORES.SYNC_QUEUE, item);

export const deleteSyncItem = (id) => deleteFromStore(STORES.SYNC_QUEUE, id);

export const getPendingSyncItems = async () => {
  const all = await getSyncQueue();
  return all.filter(item => item.status === 'pending').sort((a, b) => b.priority - a.priority);
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const clearAllOfflineData = async () => {
  const database = await initDB();
  
  const storeNames = Object.values(STORES);
  const transaction = database.transaction(storeNames, 'readwrite');
  
  for (const storeName of storeNames) {
    transaction.objectStore(storeName).clear();
  }
  
  console.log('🗑️ Alle Offline-Daten gelöscht');
};

export const getOfflineStats = async () => {
  const pendingScans = await getUnsyncedScans();
  const pendingBoxes = await getUnsyncedBoxes();
  const syncQueue = await getPendingSyncItems();
  
  return {
    pendingScans: pendingScans.length,
    pendingBoxes: pendingBoxes.length,
    syncQueueItems: syncQueue.length,
    totalPending: pendingScans.length + pendingBoxes.length + syncQueue.length
  };
};

export { STORES };
