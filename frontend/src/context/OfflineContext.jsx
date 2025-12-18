/* ============================================================
   TRAPMAP — OFFLINE CONTEXT
   Globaler State für Offline-Funktionalität
   Mit IndexedDB und automatischer Synchronisation
   ============================================================ */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initDB, getOfflineStats, getUnsyncedScans, getUnsyncedBoxes } from '../utils/offlineDB';
import { startAutoSync, addSyncListener, syncAll } from '../utils/syncService';
import { refreshAllCaches } from '../utils/offlineAPI';

export const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingScans, setPendingScans] = useState(0);
  const [pendingBoxes, setPendingBoxes] = useState(0);
  const [lastSyncResult, setLastSyncResult] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncQueue, setSyncQueue] = useState([]);

  // Pending Count aktualisieren
  const updatePendingCount = useCallback(async () => {
    try {
      const stats = await getOfflineStats();
      setPendingScans(stats.pendingScans);
      setPendingBoxes(stats.pendingBoxes);
      
      // Für Rückwärtskompatibilität: syncQueue aktualisieren
      const scans = await getUnsyncedScans();
      const boxes = await getUnsyncedBoxes();
      setSyncQueue([...scans, ...boxes]);
    } catch (error) {
      console.error('Fehler beim Laden der Offline-Stats:', error);
    }
  }, []);

  // Initialisierung
  useEffect(() => {
    const init = async () => {
      try {
        // IndexedDB initialisieren
        await initDB();
        console.log('✅ Offline-System initialisiert');
        
        // Auto-Sync starten (alle 30 Sekunden)
        const stopAutoSync = startAutoSync(30000);

        // Sync-Listener hinzufügen
        const removeSyncListener = addSyncListener((event) => {
          switch (event.type) {
            case 'start':
              setIsSyncing(true);
              break;
            case 'complete':
              setIsSyncing(false);
              setLastSyncResult(event.results);
              updatePendingCount();
              break;
            case 'error':
              setIsSyncing(false);
              break;
            case 'offline':
              setIsOnline(false);
              break;
            case 'scan_synced':
            case 'box_synced':
              updatePendingCount();
              break;
          }
        });

        // Initial pending count laden
        await updatePendingCount();
        
        // Cache aktualisieren wenn online
        if (navigator.onLine) {
          refreshAllCaches().catch(console.error);
        }

        setIsInitialized(true);

        return () => {
          stopAutoSync();
          removeSyncListener();
        };
      } catch (error) {
        console.error('❌ Offline-System Initialisierungsfehler:', error);
        setIsInitialized(true); // Trotzdem als initialisiert markieren
      }
    };

    init();
  }, [updatePendingCount]);

  // Online/Offline Event Listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🌐 Online - Starte Sync...');
      // Bei Wiederverbindung: Sync und Cache aktualisieren
      syncAll().catch(console.error);
      refreshAllCaches().catch(console.error);
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('📴 Offline-Modus aktiv');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Manueller Sync (Rückwärtskompatibilität: syncOfflineData)
  const syncOfflineData = useCallback(async () => {
    if (!isOnline) {
      console.log('📴 Offline - Sync nicht möglich');
      return { success: false, message: 'Keine Internetverbindung' };
    }

    if (isSyncing) {
      console.log('⏳ Sync bereits aktiv');
      return { success: false, message: 'Sync bereits aktiv' };
    }

    setIsSyncing(true);
    try {
      const results = await syncAll();
      await updatePendingCount();
      setLastSyncResult(results);
      return { success: true, results };
    } catch (error) {
      console.error('❌ Sync-Fehler:', error);
      return { success: false, error: error.message };
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, updatePendingCount]);

  // Context-Werte (mit Rückwärtskompatibilität)
  const value = {
    // Neue API
    isOnline,
    isSyncing,
    pendingScans,
    pendingBoxes,
    pendingCount: pendingScans + pendingBoxes,
    lastSyncResult,
    isInitialized,
    syncOfflineData,
    updatePendingCount,
    
    // Rückwärtskompatibilität
    syncQueue,
    queueLength: pendingScans + pendingBoxes
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

// Custom Hook
export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
