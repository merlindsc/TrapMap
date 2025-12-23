/* ============================================================
   TRAPMAP – OFFLINE MAP SERVICE
   Automatisches Caching von Karten-Tiles für Objekt-Standorte
   
   FEATURES:
   - Automatischer Download beim App-Start (WLAN)
   - 200m Radius um jeden Objekt-Standort
   - Zoom 14-18 + digitaler Zoom darüber
   - Progressives Laden ohne UI-Blockierung
   - Speicher-Management mit LRU-Eviction
   
   LIMITS:
   - ~86 Tiles pro Standort (200m, Zoom 14-18)
   - ~1.5-2 MB pro Standort
   - Max. 70 Standorte bei 6.000 Tile-Limit
   ============================================================ */

import { useState, useEffect, useCallback } from 'react';

// ============================================
// KONFIGURATION
// ============================================

const CONFIG = {
  DB_NAME: 'trapmap_map_tiles',
  DB_VERSION: 1,
  STORE_NAME: 'tiles',
  META_STORE: 'tile_meta',
  
  // Tile-Konfiguration
  DEFAULT_RADIUS_METERS: 25,   // Standard: 25m Radius = 50m Durchmesser
  MIN_ZOOM: 14,                // Minimum Zoom Level
  MAX_ZOOM: 17,                // Maximum Zoom Level (17 statt 18 - weniger schwarze Tiles)
  MAX_TILES: 6000,             // Mapbox Limit pro Gerät
  
  // Verfügbare Radius-Optionen (für UI)
  RADIUS_OPTIONS: [
    { value: 25, label: '50 x 50 m', tiles: '~22 Tiles' },
    { value: 50, label: '100 x 100 m', tiles: '~40 Tiles' },
    { value: 100, label: '200 x 200 m', tiles: '~85 Tiles' }
  ],
  
  // Download-Konfiguration  
  BATCH_SIZE: 10,            // Tiles pro Batch
  BATCH_DELAY: 100,          // ms zwischen Batches
  MAX_CONCURRENT: 5,         // Parallele Downloads
  RETRY_ATTEMPTS: 3,         // Wiederholungen bei Fehler
  
  // Speicher
  MAX_AGE_DAYS: 30,          // Tiles älter als X Tage werden gelöscht
  CLEANUP_INTERVAL: 86400000 // Cleanup alle 24h
};

// Export für UI
export const OFFLINE_MAP_CONFIG = {
  RADIUS_OPTIONS: CONFIG.RADIUS_OPTIONS,
  DEFAULT_RADIUS: CONFIG.DEFAULT_RADIUS_METERS
};

// ============================================
// DATABASE (Native IndexedDB)
// ============================================

let db = null;
let dbInitPromise = null;

const initDB = () => {
  if (dbInitPromise) return dbInitPromise;
  
  dbInitPromise = new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }
    
    const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
    
    request.onerror = () => {
      console.error('❌ Map-Tiles IndexedDB Fehler:', request.error);
      dbInitPromise = null;
      reject(request.error);
    };
    
    request.onsuccess = () => {
      db = request.result;
      console.log('✅ Map-Tiles IndexedDB bereit');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Tile Store
      if (!database.objectStoreNames.contains(CONFIG.STORE_NAME)) {
        const tileStore = database.createObjectStore(CONFIG.STORE_NAME, { 
          keyPath: 'key' 
        });
        tileStore.createIndex('objectId', 'objectId', { unique: false });
        tileStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
      
      // Meta Store
      if (!database.objectStoreNames.contains(CONFIG.META_STORE)) {
        const metaStore = database.createObjectStore(CONFIG.META_STORE, {
          keyPath: 'objectId'
        });
        metaStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
      
      console.log('📦 Map-Tiles Stores erstellt');
    };
  });
  
  return dbInitPromise;
};

// Helper: Einfache DB-Operationen
const dbPut = async (storeName, data) => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const dbGet = async (storeName, key) => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const dbGetAll = async (storeName) => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

const dbDelete = async (storeName, key) => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const dbClear = async (storeName) => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const dbGetByIndex = async (storeName, indexName, value) => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// ============================================
// TILE CALCULATION
// ============================================

/**
 * Konvertiert Lat/Lng zu Tile-Koordinaten
 */
const latLngToTile = (lat, lng, zoom) => {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y, z: zoom };
};

/**
 * Berechnet Bounding Box in Metern
 */
const getBoundingBox = (lat, lng, radiusMeters) => {
  // Ungefähre Umrechnung: 1 Grad ≈ 111km
  const latDelta = radiusMeters / 111000;
  const lngDelta = radiusMeters / (111000 * Math.cos(lat * Math.PI / 180));
  
  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lng + lngDelta,
    west: lng - lngDelta
  };
};

/**
 * Berechnet alle Tiles für einen Bereich
 */
const getTilesForArea = (lat, lng, radiusMeters, minZoom, maxZoom) => {
  const bbox = getBoundingBox(lat, lng, radiusMeters);
  const tiles = [];
  
  for (let z = minZoom; z <= maxZoom; z++) {
    const nwTile = latLngToTile(bbox.north, bbox.west, z);
    const seTile = latLngToTile(bbox.south, bbox.east, z);
    
    for (let x = nwTile.x; x <= seTile.x; x++) {
      for (let y = nwTile.y; y <= seTile.y; y++) {
        tiles.push({ x, y, z });
      }
    }
  }
  
  return tiles;
};

/**
 * Erstellt Tile-Key für IndexedDB
 */
const getTileKey = (x, y, z) => `${z}/${x}/${y}`;

// ============================================
// TILE DOWNLOAD
// ============================================

/**
 * Lädt ein einzelnes Tile
 */
const downloadTile = async (x, y, z, mapboxToken) => {
  const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/${z}/${x}/${y}?access_token=${mapboxToken}`;
  
  for (let attempt = 0; attempt < CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      return blob;
    } catch (error) {
      if (attempt === CONFIG.RETRY_ATTEMPTS - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
};

/**
 * Speichert Tile in IndexedDB
 */
const saveTile = async (key, blob, objectId) => {
  await dbPut(CONFIG.STORE_NAME, {
    key,
    blob,
    objectId,
    cachedAt: new Date().toISOString(),
    size: blob.size
  });
};

/**
 * Holt Tile aus IndexedDB
 */
const getTile = async (key) => {
  try {
    return await dbGet(CONFIG.STORE_NAME, key);
  } catch {
    return null;
  }
};

// ============================================
// MAIN SERVICE
// ============================================

class OfflineMapService {
  constructor() {
    this.mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    this.isDownloading = false;
    this.progress = { current: 0, total: 0, objectId: null };
    this.listeners = [];
  }
  
  /**
   * Event-Listener hinzufügen
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
  
  /**
   * Event emittieren
   */
  emit(event, data) {
    this.listeners.forEach(l => {
      try {
        l({ type: event, ...data });
      } catch (e) {
        console.error('OfflineMapService listener error:', e);
      }
    });
  }
  
  /**
   * Prüft ob ein Objekt bereits gecacht ist
   */
  async isObjectCached(objectId) {
    try {
      const meta = await dbGet(CONFIG.META_STORE, objectId);
      return !!meta;
    } catch {
      return false;
    }
  }
  
  /**
   * Holt alle gecachten Objekt-IDs
   */
  async getCachedObjectIds() {
    try {
      const allMeta = await dbGetAll(CONFIG.META_STORE);
      return allMeta.map(m => m.objectId);
    } catch {
      return [];
    }
  }
  
  /**
   * Berechnet wie viele Tiles für ein Objekt benötigt werden
   */
  getTileCount(radiusMeters = CONFIG.RADIUS_METERS) {
    // Grobe Schätzung basierend auf Radius
    // Bei 200m Durchmesser und Zoom 14-18: ~86 Tiles
    const tilesPerZoom = {
      14: 1,
      15: 1,
      16: 4,
      17: 16,
      18: 64
    };
    
    let total = 0;
    for (let z = CONFIG.MIN_ZOOM; z <= CONFIG.MAX_ZOOM; z++) {
      total += tilesPerZoom[z] || 1;
    }
    
    return total;
  }
  
  /**
   * Cached Tiles für ein einzelnes Objekt
   * @param {Object} object - Objekt mit latitude, longitude, offline_radius (optional)
   */
  async cacheObjectArea(object, onProgress = null) {
    if (!object?.latitude || !object?.longitude) {
      console.warn(`⚠️ Objekt ${object?.id} hat keine GPS-Koordinaten`);
      return { success: false, reason: 'no_coordinates' };
    }
    
    // Bereits gecacht?
    const isCached = await this.isObjectCached(object.id);
    if (isCached) {
      console.log(`✅ Objekt ${object.id} bereits gecacht`);
      return { success: true, cached: true };
    }
    
    // Radius aus Objekt oder Default
    const radius = object.offline_radius || CONFIG.DEFAULT_RADIUS_METERS;
    
    const tiles = getTilesForArea(
      object.latitude,
      object.longitude,
      radius,
      CONFIG.MIN_ZOOM,
      CONFIG.MAX_ZOOM
    );
    
    console.log(`🗺️ Cache ${tiles.length} Tiles für Objekt ${object.id} (${object.name}) - Radius: ${radius}m`);
    
    let downloaded = 0;
    let errors = 0;
    
    // In Batches herunterladen
    for (let i = 0; i < tiles.length; i += CONFIG.BATCH_SIZE) {
      const batch = tiles.slice(i, i + CONFIG.BATCH_SIZE);
      
      await Promise.all(batch.map(async (tile) => {
        const key = getTileKey(tile.x, tile.y, tile.z);
        
        // Prüfen ob bereits vorhanden
        const existing = await getTile(key);
        if (existing) {
          downloaded++;
          return;
        }
        
        try {
          const blob = await downloadTile(tile.x, tile.y, tile.z, this.mapboxToken);
          await saveTile(key, blob, object.id);
          downloaded++;
        } catch (error) {
          errors++;
          console.warn(`⚠️ Tile ${key} download failed:`, error.message);
        }
      }));
      
      // Progress Update
      if (onProgress) {
        onProgress({
          objectId: object.id,
          objectName: object.name,
          downloaded,
          total: tiles.length,
          percent: Math.round((downloaded / tiles.length) * 100)
        });
      }
      
      this.emit('progress', {
        objectId: object.id,
        downloaded,
        total: tiles.length
      });
      
      // Kleine Pause zwischen Batches
      if (i + CONFIG.BATCH_SIZE < tiles.length) {
        await new Promise(r => setTimeout(r, CONFIG.BATCH_DELAY));
      }
    }
    
    // Meta speichern
    await dbPut(CONFIG.META_STORE, {
      objectId: object.id,
      objectName: object.name,
      lat: object.latitude,
      lng: object.longitude,
      radius: radius,  // radius ist bereits oben definiert
      tileCount: downloaded,
      cachedAt: new Date().toISOString()
    });
    
    console.log(`✅ Objekt ${object.id} gecacht: ${downloaded}/${tiles.length} Tiles`);
    
    return {
      success: true,
      downloaded,
      total: tiles.length,
      errors
    };
  }
  
  /**
   * Synchronisiert alle zugewiesenen Objekte
   * Wird beim App-Start aufgerufen
   */
  async syncAllObjects(objects, options = {}) {
    const {
      onlyOnWifi = true,
      maxObjects = 20,
      onProgress = null,
      onComplete = null
    } = options;
    
    // Netzwerk-Check
    if (!navigator.onLine) {
      console.log('🔴 Offline - Map-Sync nicht möglich');
      return { success: false, reason: 'offline' };
    }
    
    // WLAN-Check (optional)
    if (onlyOnWifi) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection && connection.type !== 'wifi' && connection.effectiveType !== '4g') {
        console.log('📶 Kein WLAN - Map-Sync übersprungen');
        return { success: false, reason: 'no_wifi' };
      }
    }
    
    if (this.isDownloading) {
      console.log('⏳ Map-Download bereits aktiv');
      return { success: false, reason: 'already_downloading' };
    }
    
    this.isDownloading = true;
    this.emit('start', { totalObjects: objects.length });
    
    // Nur Objekte mit GPS-Koordinaten
    const objectsWithGps = objects.filter(obj => obj.latitude && obj.longitude);
    
    // Bereits gecachte Objekte ausschließen
    const cachedIds = await this.getCachedObjectIds();
    const uncachedObjects = objectsWithGps.filter(obj => !cachedIds.includes(obj.id));
    
    if (uncachedObjects.length === 0) {
      console.log('✅ Alle Objekte bereits gecacht');
      this.isDownloading = false;
      this.emit('complete', { cached: cachedIds.length, downloaded: 0 });
      return { success: true, cached: cachedIds.length, downloaded: 0 };
    }
    
    console.log(`🗺️ Starte Map-Sync: ${uncachedObjects.length} neue Objekte`);
    
    // Limitieren auf maxObjects
    const toDownload = uncachedObjects.slice(0, maxObjects);
    
    const results = {
      success: 0,
      failed: 0,
      skipped: uncachedObjects.length - toDownload.length
    };
    
    for (let i = 0; i < toDownload.length; i++) {
      const object = toDownload[i];
      
      try {
        const result = await this.cacheObjectArea(object, (progress) => {
          if (onProgress) {
            onProgress({
              ...progress,
              objectIndex: i,
              totalObjects: toDownload.length
            });
          }
        });
        
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
        }
      } catch (error) {
        console.error(`❌ Objekt ${object.id} Cache-Fehler:`, error);
        results.failed++;
      }
    }
    
    this.isDownloading = false;
    
    console.log(`✅ Map-Sync abgeschlossen: ${results.success} OK, ${results.failed} Fehler`);
    
    this.emit('complete', results);
    
    if (onComplete) {
      onComplete(results);
    }
    
    return { success: true, ...results };
  }
  
  /**
   * Holt ein gecachtes Tile (für Custom TileLayer)
   */
  async getCachedTile(x, y, z) {
    try {
      const key = getTileKey(x, y, z);
      const tile = await getTile(key);
      
      if (tile?.blob) {
        return URL.createObjectURL(tile.blob);
      }
      
      return null;
    } catch {
      return null;
    }
  }
  
  /**
   * Statistiken abrufen
   */
  async getStats() {
    try {
      const allMeta = await dbGetAll(CONFIG.META_STORE);
      const allTiles = await dbGetAll(CONFIG.STORE_NAME);
      
      const totalSize = allTiles.reduce((sum, t) => sum + (t.size || 0), 0);
      
      return {
        cachedObjects: allMeta.length,
        totalTiles: allTiles.length,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        objectDetails: allMeta
      };
    } catch {
      return {
        cachedObjects: 0,
        totalTiles: 0,
        totalSizeMB: '0',
        objectDetails: []
      };
    }
  }
  
  /**
   * Cache für ein Objekt löschen
   */
  async clearObjectCache(objectId) {
    try {
      // Alle Tiles für dieses Objekt finden und löschen
      const allTiles = await dbGetByIndex(CONFIG.STORE_NAME, 'objectId', objectId);
      
      for (const tile of allTiles) {
        await dbDelete(CONFIG.STORE_NAME, tile.key);
      }
      
      // Meta löschen
      await dbDelete(CONFIG.META_STORE, objectId);
      
      console.log(`🗑️ Cache für Objekt ${objectId} gelöscht`);
      
      return true;
    } catch (error) {
      console.error('Clear cache error:', error);
      return false;
    }
  }
  
  /**
   * Gesamten Cache löschen
   */
  async clearAllCache() {
    try {
      await dbClear(CONFIG.STORE_NAME);
      await dbClear(CONFIG.META_STORE);
      
      console.log('🗑️ Gesamter Map-Cache gelöscht');
      
      return true;
    } catch (error) {
      console.error('Clear all cache error:', error);
      return false;
    }
  }
  
  /**
   * Alte Tiles aufräumen
   */
  async cleanup() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CONFIG.MAX_AGE_DAYS);
      
      const allMeta = await dbGetAll(CONFIG.META_STORE);
      let deleted = 0;
      
      for (const meta of allMeta) {
        if (new Date(meta.cachedAt) < cutoffDate) {
          await this.clearObjectCache(meta.objectId);
          deleted++;
        }
      }
      
      console.log(`🧹 Cleanup: ${deleted} alte Objekt-Caches gelöscht`);
      
      return deleted;
    } catch (error) {
      console.error('Cleanup error:', error);
      return 0;
    }
  }
}

// Singleton-Export
export const offlineMapService = new OfflineMapService();
export default offlineMapService;

// ============================================
// REACT HOOK
// ============================================

export const useOfflineMap = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    // Stats laden
    offlineMapService.getStats().then(setStats);
    
    // Event Listener
    const unsubscribe = offlineMapService.addListener((event) => {
      switch (event.type) {
        case 'start':
          setIsDownloading(true);
          break;
        case 'progress':
          setProgress(event);
          break;
        case 'complete':
          setIsDownloading(false);
          setProgress(null);
          offlineMapService.getStats().then(setStats);
          break;
      }
    });
    
    return unsubscribe;
  }, []);
  
  const syncObjects = useCallback(async (objects, options) => {
    return offlineMapService.syncAllObjects(objects, options);
  }, []);
  
  const cacheObject = useCallback(async (object) => {
    return offlineMapService.cacheObjectArea(object);
  }, []);
  
  const clearCache = useCallback(async (objectId) => {
    if (objectId) {
      return offlineMapService.clearObjectCache(objectId);
    }
    return offlineMapService.clearAllCache();
  }, []);
  
  const refreshStats = useCallback(async () => {
    const newStats = await offlineMapService.getStats();
    setStats(newStats);
    return newStats;
  }, []);
  
  return {
    isDownloading,
    progress,
    stats,
    syncObjects,
    cacheObject,
    clearCache,
    refreshStats,
    isObjectCached: offlineMapService.isObjectCached.bind(offlineMapService),
    getCachedTile: offlineMapService.getCachedTile.bind(offlineMapService)
  };
};