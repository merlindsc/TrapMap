// ============================================
// OFFLINE STORAGE ENGINE
// IndexedDB for offline-first functionality
// ============================================

const DB_NAME = 'TrapMapDB';
const DB_VERSION = 2; // Version erhöht für synced index fix

let db = null;

/**
 * Initialize IndexedDB
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB failed to open');
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;

      // Objects Store
      if (!db.objectStoreNames.contains('objects')) {
        db.createObjectStore('objects', { keyPath: 'id' });
      }

      // Layouts Store
      if (!db.objectStoreNames.contains('layouts')) {
        const layoutsStore = db.createObjectStore('layouts', { keyPath: 'id' });
        layoutsStore.createIndex('object_id', 'object_id', { unique: false });
      }

      // Boxes Store
      if (!db.objectStoreNames.contains('boxes')) {
        const boxesStore = db.createObjectStore('boxes', { keyPath: 'id' });
        boxesStore.createIndex('layout_id', 'layout_id', { unique: false });
        boxesStore.createIndex('object_id', 'object_id', { unique: false });
      }

      // Offline Scans Queue - use number instead of boolean for synced
      if (!db.objectStoreNames.contains('scans_queue')) {
        const scansStore = db.createObjectStore('scans_queue', { keyPath: 'temp_id', autoIncrement: true });
        scansStore.createIndex('box_id', 'box_id', { unique: false });
        scansStore.createIndex('synced', 'synced', { unique: false }); // 0 = unsynced, 1 = synced
      }

      // Zones Store
      if (!db.objectStoreNames.contains('zones')) {
        const zonesStore = db.createObjectStore('zones', { keyPath: 'id' });
        zonesStore.createIndex('layout_id', 'layout_id', { unique: false });
      }

      // Pins Store
      if (!db.objectStoreNames.contains('pins')) {
        const pinsStore = db.createObjectStore('pins', { keyPath: 'id' });
        pinsStore.createIndex('layout_id', 'layout_id', { unique: false });
      }

      // Labels Store
      if (!db.objectStoreNames.contains('labels')) {
        const labelsStore = db.createObjectStore('labels', { keyPath: 'id' });
        labelsStore.createIndex('layout_id', 'layout_id', { unique: false });
      }

    };
  });
};

/**
 * Ensure DB is initialized
 */
const ensureDB = async () => {
  if (!db) {
    await initDB();
  }
  return db;
};

/**
 * Generic save function
 */
export const save = async (storeName, data) => {
  await ensureDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Generic get function
 */
export const get = async (storeName, id) => {
  await ensureDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Generic getAll function
 */
export const getAll = async (storeName) => {
  await ensureDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get by index - with proper key validation
 */
export const getByIndex = async (storeName, indexName, value) => {
  await ensureDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      
      // Validate key - IndexedDB doesn't accept booleans
      let queryValue = value;
      if (typeof value === 'boolean') {
        queryValue = value ? 1 : 0;
      }
      
      const request = index.getAll(queryValue);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Delete by key
 */
export const remove = async (storeName, id) => {
  await ensureDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Clear entire store
 */
export const clear = async (storeName) => {
  await ensureDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Save offline scan to queue
 */
export const saveOfflineScan = async (scanData) => {
  const offlineScan = {
    ...scanData,
    synced: 0, // Use 0 instead of false
    created_at: new Date().toISOString()
  };
  
  return await save('scans_queue', offlineScan);
};

/**
 * Get unsynced scans - use 0 instead of false
 */
export const getUnsyncedScans = async () => {
  try {
    // Get all and filter - safer approach
    const all = await getAll('scans_queue');
    return (all || []).filter(scan => scan.synced === 0 || scan.synced === false);
  } catch (error) {
    console.warn('Could not get unsynced scans:', error);
    return [];
  }
};

/**
 * Mark scan as synced
 */
export const markScanAsSynced = async (tempId) => {
  try {
    const scan = await get('scans_queue', tempId);
    if (scan) {
      scan.synced = 1; // Use 1 instead of true
      await save('scans_queue', scan);
    }
  } catch (error) {
    console.error('Failed to mark scan as synced:', error);
  }
};

// Initialize on load
if (typeof window !== 'undefined') {
  initDB().catch(err => {
    console.warn('IndexedDB init failed (will retry):', err);
  });
}