// ============================================
// OFFLINE STORAGE ENGINE
// IndexedDB for offline-first functionality
// ============================================

const DB_NAME = 'TrapMapDB';
const DB_VERSION = 1;

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
      console.log('✅ IndexedDB initialized');
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

      // Offline Scans Queue
      if (!db.objectStoreNames.contains('scans_queue')) {
        const scansStore = db.createObjectStore('scans_queue', { keyPath: 'temp_id', autoIncrement: true });
        scansStore.createIndex('box_id', 'box_id', { unique: false });
        scansStore.createIndex('synced', 'synced', { unique: false });
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

      console.log('✅ IndexedDB stores created');
    };
  });
};

/**
 * Generic save function
 * @param {string} storeName 
 * @param {Object} data 
 */
export const save = (storeName, data) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Generic get function
 * @param {string} storeName 
 * @param {number} id 
 */
export const get = (storeName, id) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Generic getAll function
 * @param {string} storeName 
 */
export const getAll = (storeName) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get by index
 * @param {string} storeName 
 * @param {string} indexName 
 * @param {any} value 
 */
export const getByIndex = (storeName, indexName, value) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Delete by key
 * @param {string} storeName 
 * @param {number} id 
 */
export const remove = (storeName, id) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Clear entire store
 * @param {string} storeName 
 */
export const clear = (storeName) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Save offline scan to queue
 * @param {Object} scanData 
 */
export const saveOfflineScan = async (scanData) => {
  const offlineScan = {
    ...scanData,
    synced: false,
    created_at: new Date().toISOString()
  };
  
  return await save('scans_queue', offlineScan);
};

/**
 * Get unsynced scans
 */
export const getUnsyncedScans = async () => {
  return await getByIndex('scans_queue', 'synced', false);
};

/**
 * Mark scan as synced
 * @param {number} tempId 
 */
export const markScanAsSynced = async (tempId) => {
  const scan = await get('scans_queue', tempId);
  if (scan) {
    scan.synced = true;
    await save('scans_queue', scan);
  }
};

// Initialize on load
if (typeof window !== 'undefined') {
  initDB().catch(console.error);
}