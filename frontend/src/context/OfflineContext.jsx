import React, { createContext, useState, useEffect } from 'react';
import { getUnsyncedScans, markScanAsSynced } from '../utils/storage';
import { createScan } from '../api/scans';

export const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueue, setSyncQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // -----------------------------
  //  Online / Offline Monitoring
  // -----------------------------
  useEffect(() => {
    const handleOnline = () => {
      console.log('✅ Back online');
      setIsOnline(true);
      syncOfflineData();
    };

    const handleOffline = () => {
      console.log('📵 Offline mode');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load queue when app starts
    loadSyncQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // -----------------------------
  //  Load existing offline queue
  // -----------------------------
  const loadSyncQueue = async () => {
    try {
      const unsynced = await getUnsyncedScans();

      if (!Array.isArray(unsynced)) {
        console.warn("⚠️ Offline DB returned non-array. Setting empty queue.");
        setSyncQueue([]);
        return;
      }

      setSyncQueue(unsynced);
    } catch (error) {
      // Important fix: IndexedDB is not initialized yet
      if (String(error).includes("Database not initialized")) {
        console.warn("ℹ️ IndexedDB not ready yet. This is normal on first load.");
        setSyncQueue([]); // Prevent crash
        return;
      }

      console.error('❌ Failed to load sync queue:', error);
      setSyncQueue([]);
    }
  };

  // -----------------------------
  //  Sync offline scans → backend
  // -----------------------------
  const syncOfflineData = async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);

    try {
      const unsynced = await getUnsyncedScans();

      if (!Array.isArray(unsynced) || unsynced.length === 0) {
        console.log('✅ No offline scans to sync.');
        setIsSyncing(false);
        return;
      }

      console.log(`🔄 Syncing ${unsynced.length} offline scans...`);

      let successCount = 0;

      for (const scan of unsynced) {
        try {
          if (!scan.box_id || !scan.status) {
            console.warn(`⚠️ Invalid offline scan skipped (id ${scan.temp_id})`);
            await markScanAsSynced(scan.temp_id);
            continue;
          }

          await createScan({
            box_id: scan.box_id,
            status: scan.status,
            symbol: scan.symbol || null,
            notes: scan.notes || '',
            photo_url: scan.photo_url || null,
            scanned_at: scan.created_at
          });

          await markScanAsSynced(scan.temp_id);
          successCount++;

        } catch (error) {
          console.error(`❌ Failed to sync scan ${scan.temp_id}:`, error);
        }
      }

      console.log(`✅ Successfully synced ${successCount}/${unsynced.length} scans`);
      await loadSyncQueue();

    } catch (error) {
      console.error('❌ Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // -----------------------------
  //  Exposed context values
  // -----------------------------
  const value = {
    isOnline,
    syncQueue,
    queueLength: syncQueue.length,
    isSyncing,
    syncOfflineData
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};
