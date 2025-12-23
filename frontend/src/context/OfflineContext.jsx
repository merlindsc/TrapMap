/* ============================================================
   TRAPMAP – OFFLINE CONTEXT
   Globaler State für Offline-Funktionalität
   
   FEATURES:
   - IndexedDB Initialisierung
   - Automatische Synchronisation
   - Stammdaten-Caching beim App-Start
   - Online/Offline Event Handling
   - Pending Count Tracking
   - Sync Status für UI
   ============================================================ */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { initDB, getOfflineStats } from '../utils/offlineDB';
import { 
  startAutoSync, 
  stopAutoSync, 
  addSyncListener, 
  syncAll, 
  isOnline as checkIsOnline,
  getIsSyncing,
  getLastSyncTime
} from '../utils/syncService';
import { 
  refreshAllCaches, 
  cacheCurrentUser,
  getBoxTypes,
  getObjects,
  getBoxes,
  getLayouts
} from '../utils/offlineAPI';

// 🆕 Map-Sync Import
import { offlineMapService } from '../services/OfflineMapService';

// ============================================
// CONTEXT
// ============================================

export const OfflineContext = createContext();

// ============================================
// PROVIDER
// ============================================

export const OfflineProvider = ({ children }) => {
  // State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  
  // Pending Counts
  const [pendingScans, setPendingScans] = useState(0);
  const [pendingBoxes, setPendingBoxes] = useState(0);
  const [pendingPositions, setPendingPositions] = useState(0);
  const [pendingReturns, setPendingReturns] = useState(0);
  
  // Cache Status
  const [cacheStatus, setCacheStatus] = useState({
    boxes: 0,
    objects: 0,
    boxTypes: 0,
    layouts: 0,
    lastRefresh: null
  });
  
  // 🆕 Map Sync Status
  const [mapSyncStatus, setMapSyncStatus] = useState({
    isDownloading: false,
    progress: null,
    cachedObjects: 0,
    totalSizeMB: 0
  });
  
  // Sync Results
  const [lastSyncResult, setLastSyncResult] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  // Refs für Cleanup
  const cleanupRef = useRef(null);
  const syncListenerRef = useRef(null);

  // ============================================
  // PENDING COUNT UPDATE
  // ============================================
  
  const updatePendingCount = useCallback(async () => {
    try {
      const stats = await getOfflineStats();
      
      setPendingScans(stats.pending.scans);
      setPendingBoxes(stats.pending.boxes);
      setPendingPositions(stats.pending.positions);
      setPendingReturns(stats.pending.returns);
      
      setCacheStatus(prev => ({
        ...prev,
        boxes: stats.cached.boxes,
        objects: stats.cached.objects,
        boxTypes: stats.cached.boxTypes,
        layouts: stats.cached.layouts
      }));
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der Offline-Stats:', error);
    }
  }, []);

  // ============================================
  // STAMMDATEN CACHING
  // ============================================
  
  const refreshStammdaten = useCallback(async (force = false) => {
    if (!checkIsOnline() && !force) {
      console.log('🔴 Offline - Stammdaten-Refresh übersprungen');
      return false;
    }

    console.log('🔄 Lade Stammdaten...');
    
    try {
      // Parallel laden für Performance
      const results = await Promise.allSettled([
        getBoxTypes(),
        getObjects(),
        getBoxes(),
        getLayouts()
      ]);
      
      const [boxTypesResult, objectsResult, boxesResult, layoutsResult] = results;
      
      // Status aktualisieren
      setCacheStatus({
        boxTypes: boxTypesResult.status === 'fulfilled' ? boxTypesResult.value.data?.length || 0 : 0,
        objects: objectsResult.status === 'fulfilled' ? objectsResult.value.data?.length || 0 : 0,
        boxes: boxesResult.status === 'fulfilled' ? boxesResult.value.data?.length || 0 : 0,
        layouts: layoutsResult.status === 'fulfilled' ? layoutsResult.value.data?.length || 0 : 0,
        lastRefresh: new Date().toISOString()
      });
      
      const success = results.every(r => r.status === 'fulfilled' && r.value?.success);
      
      console.log(success ? '✅ Stammdaten geladen' : '⚠️ Stammdaten teilweise geladen', {
        boxTypes: boxTypesResult.status === 'fulfilled' ? boxTypesResult.value.data?.length : 'error',
        objects: objectsResult.status === 'fulfilled' ? objectsResult.value.data?.length : 'error',
        boxes: boxesResult.status === 'fulfilled' ? boxesResult.value.data?.length : 'error',
        layouts: layoutsResult.status === 'fulfilled' ? layoutsResult.value.data?.length : 'error'
      });
      
      return success;
    } catch (error) {
      console.error('❌ Stammdaten-Refresh fehlgeschlagen:', error);
      return false;
    }
  }, []);

  // ============================================
  // INITIALISIERUNG
  // ============================================
  
  useEffect(() => {
    const init = async () => {
      console.log('🚀 Initialisiere Offline-System...');
      
      try {
        // 1. IndexedDB initialisieren
        await initDB();
        console.log('✅ IndexedDB bereit');
        
        // 2. User cachen (für Offline-Auth)
        await cacheCurrentUser();
        
        // 3. Initiale Stats laden
        await updatePendingCount();
        
        // 4. Sync-Listener registrieren
        syncListenerRef.current = addSyncListener((event) => {
          switch (event.type) {
            case 'start':
              setIsSyncing(true);
              break;
              
            case 'complete':
              setIsSyncing(false);
              setLastSyncResult(event.data?.results || null);
              setLastSyncTime(new Date());
              updatePendingCount();
              break;
              
            case 'error':
              setIsSyncing(false);
              console.error('Sync error:', event.data?.error);
              break;
              
            case 'progress':
              // Optional: Fortschritt tracken
              break;
              
            case 'scan_synced':
            case 'box_synced':
            case 'position_synced':
            case 'return_synced':
              updatePendingCount();
              break;
              
            case 'offline':
              setIsOnline(false);
              break;
              
            case 'online':
              setIsOnline(true);
              break;
          }
        });
        
        // 5. Auto-Sync starten
        cleanupRef.current = startAutoSync(30000); // 30 Sekunden
        
        // 6. Stammdaten laden wenn online
        if (navigator.onLine) {
          await refreshStammdaten();
          
          // 🆕 7. Map-Tiles für Objekte cachen (im Hintergrund)
          try {
            const objectsResult = await getObjects();
            if (objectsResult?.data?.length > 0) {
              console.log('🗺️ Starte Map-Sync im Hintergrund...');
              
              // Map-Sync Listener
              const mapUnsubscribe = offlineMapService.addListener((event) => {
                switch (event.type) {
                  case 'start':
                    setMapSyncStatus(prev => ({ ...prev, isDownloading: true }));
                    break;
                  case 'progress':
                    setMapSyncStatus(prev => ({ 
                      ...prev, 
                      progress: event 
                    }));
                    break;
                  case 'complete':
                    setMapSyncStatus(prev => ({ 
                      ...prev, 
                      isDownloading: false,
                      progress: null
                    }));
                    // Stats aktualisieren
                    offlineMapService.getStats().then(stats => {
                      setMapSyncStatus(prev => ({
                        ...prev,
                        cachedObjects: stats.cachedObjects,
                        totalSizeMB: parseFloat(stats.totalSizeMB)
                      }));
                    });
                    break;
                }
              });
              
              // Sync starten (nur bei WLAN, max 20 Objekte)
              offlineMapService.syncAllObjects(objectsResult.data, {
                onlyOnWifi: true,
                maxObjects: 20
              }).then(result => {
                console.log('🗺️ Map-Sync abgeschlossen:', result);
              }).catch(err => {
                console.warn('⚠️ Map-Sync Fehler:', err);
              });
            }
          } catch (mapError) {
            console.warn('⚠️ Map-Sync konnte nicht gestartet werden:', mapError);
          }
        }
        
        setIsInitialized(true);
        console.log('✅ Offline-System bereit');
        
      } catch (error) {
        console.error('❌ Offline-System Initialisierungsfehler:', error);
        setInitError(error.message);
        setIsInitialized(true); // Trotzdem als "fertig" markieren
      }
    };

    init();

    // Cleanup
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (syncListenerRef.current) {
        syncListenerRef.current();
      }
    };
  }, [updatePendingCount, refreshStammdaten]);

  // ============================================
  // ONLINE/OFFLINE EVENT LISTENER
  // ============================================
  
  useEffect(() => {
    const handleOnline = async () => {
      console.log('🌐 Online - Starte Sync und Cache-Refresh...');
      setIsOnline(true);
      
      // Kurze Verzögerung für stabile Verbindung
      setTimeout(async () => {
        // Sync ausstehende Daten
        await syncAll();
        
        // Stammdaten aktualisieren
        await refreshStammdaten();
      }, 1000);
    };

    const handleOffline = () => {
      console.log('🔴 Offline-Modus aktiv');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshStammdaten]);

  // ============================================
  // VISIBILITY CHANGE (App wieder sichtbar)
  // ============================================
  
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        console.log('👁️ App wieder sichtbar - prüfe Sync...');
        await updatePendingCount();
        
        // Nur syncen wenn pending items vorhanden
        const stats = await getOfflineStats();
        if (stats.pending.total > 0) {
          await syncAll();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updatePendingCount]);

  // ============================================
  // MANUELLER SYNC
  // ============================================
  
  const syncOfflineData = useCallback(async () => {
    if (!checkIsOnline()) {
      console.log('🔴 Offline - Sync nicht möglich');
      return { success: false, message: 'Keine Internetverbindung' };
    }

    if (getIsSyncing()) {
      console.log('⏳ Sync bereits aktiv');
      return { success: false, message: 'Sync bereits aktiv' };
    }

    setIsSyncing(true);
    
    try {
      const results = await syncAll();
      await updatePendingCount();
      setLastSyncResult(results);
      setLastSyncTime(new Date());
      return { success: true, results };
    } catch (error) {
      console.error('❌ Sync-Fehler:', error);
      return { success: false, error: error.message };
    } finally {
      setIsSyncing(false);
    }
  }, [updatePendingCount]);

  // ============================================
  // MANUELLER CACHE REFRESH
  // ============================================
  
  const forceRefreshCache = useCallback(async () => {
    if (!checkIsOnline()) {
      return { success: false, message: 'Keine Internetverbindung' };
    }
    
    const success = await refreshStammdaten(true);
    await updatePendingCount();
    
    return { success, message: success ? 'Cache aktualisiert' : 'Teilweise fehlgeschlagen' };
  }, [refreshStammdaten, updatePendingCount]);

  // ============================================
  // COMPUTED VALUES
  // ============================================
  
  const pendingCount = pendingScans + pendingBoxes + pendingPositions + pendingReturns;
  const hasPendingData = pendingCount > 0;

  // ============================================
  // CONTEXT VALUE
  // ============================================
  
  const value = {
    // Status
    isOnline,
    isOffline: !isOnline,
    isSyncing,
    isInitialized,
    initError,
    
    // Pending Counts
    pendingScans,
    pendingBoxes,
    pendingPositions,
    pendingReturns,
    pendingCount,
    hasPendingData,
    
    // Cache Status
    cacheStatus,
    
    // 🆕 Map Sync Status
    mapSyncStatus,
    
    // Sync Info
    lastSyncResult,
    lastSyncTime,
    
    // Actions
    syncOfflineData,
    updatePendingCount,
    forceRefreshCache,
    refreshStammdaten,
    
    // 🆕 Map Actions
    syncMapTiles: async (objects) => {
      return offlineMapService.syncAllObjects(objects, {
        onlyOnWifi: false,
        maxObjects: 50
      });
    },
    getMapStats: () => offlineMapService.getStats(),
    clearMapCache: () => offlineMapService.clearAllCache(),
    
    // Legacy Support (für bestehenden Code)
    syncQueue: [], // Deprecated, use pendingCount
    queueLength: pendingCount
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

// ============================================
// HOOK
// ============================================

export const useOffline = () => {
  const context = useContext(OfflineContext);
  
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  
  return context;
};

// ============================================
// OFFLINE INDICATOR COMPONENT
// ============================================

export const OfflineIndicator = ({ 
  showWhenOnline = false, 
  compact = false,
  className = '' 
}) => {
  const { isOnline, isSyncing, pendingCount, syncOfflineData } = useOffline();
  
  // Nichts anzeigen wenn online und keine pending items (außer showWhenOnline)
  if (isOnline && pendingCount === 0 && !showWhenOnline && !isSyncing) {
    return null;
  }
  
  const handleSync = async () => {
    if (!isSyncing && isOnline && pendingCount > 0) {
      await syncOfflineData();
    }
  };
  
  if (compact) {
    // Kompakte Version für Header/Navbar
    return (
      <div 
        className={`flex items-center gap-2 ${className}`}
        onClick={handleSync}
        style={{ cursor: pendingCount > 0 && isOnline ? 'pointer' : 'default' }}
      >
        {!isOnline ? (
          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded text-yellow-400 text-xs">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656m-7.072 7.072a9 9 0 010-12.728m3.536 3.536a4 4 0 010 5.656" />
            </svg>
            Offline
          </div>
        ) : isSyncing ? (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded text-blue-400 text-xs">
            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            Sync...
          </div>
        ) : pendingCount > 0 ? (
          <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 rounded text-orange-400 text-xs">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {pendingCount}
          </div>
        ) : null}
      </div>
    );
  }
  
  // Vollständige Version
  return (
    <div 
      className={`rounded-lg p-3 flex items-center gap-3 ${className}`}
      style={{
        background: !isOnline ? 'rgba(234, 179, 8, 0.1)' : isSyncing ? 'rgba(59, 130, 246, 0.1)' : 'rgba(249, 115, 22, 0.1)',
        border: `1px solid ${!isOnline ? 'rgba(234, 179, 8, 0.2)' : isSyncing ? 'rgba(59, 130, 246, 0.2)' : 'rgba(249, 115, 22, 0.2)'}`
      }}
    >
      {!isOnline ? (
        <>
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656m-7.072 7.072a9 9 0 010-12.728m3.536 3.536a4 4 0 010 5.656" />
          </svg>
          <div className="flex-1">
            <div className="text-yellow-400 font-medium text-sm">Offline-Modus</div>
            <div className="text-yellow-400/60 text-xs">Änderungen werden lokal gespeichert</div>
          </div>
          {pendingCount > 0 && (
            <div className="px-2 py-1 bg-yellow-500/20 rounded text-yellow-400 text-xs font-medium">
              {pendingCount} ausstehend
            </div>
          )}
        </>
      ) : isSyncing ? (
        <>
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <div className="flex-1">
            <div className="text-blue-400 font-medium text-sm">Synchronisiere...</div>
            <div className="text-blue-400/60 text-xs">Daten werden übertragen</div>
          </div>
        </>
      ) : pendingCount > 0 ? (
        <>
          <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <div className="flex-1">
            <div className="text-orange-400 font-medium text-sm">{pendingCount} ausstehende Änderungen</div>
            <div className="text-orange-400/60 text-xs">Tippen zum Synchronisieren</div>
          </div>
          <button
            onClick={handleSync}
            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded text-white text-xs font-medium transition-colors"
          >
            Sync
          </button>
        </>
      ) : null}
    </div>
  );
};

export default OfflineProvider;