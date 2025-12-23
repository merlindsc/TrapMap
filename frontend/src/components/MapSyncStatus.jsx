/* ============================================================
   TRAPMAP – MAP SYNC STATUS
   UI-Komponente für Offline-Karten Sync-Status
   
   FEATURES:
   - Download-Fortschritt
   - Sync-Status Indikator
   - Manual Sync Button
   - Cache-Statistiken
   ============================================================ */

import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Download, 
  Check, 
  WifiOff, 
  RefreshCw, 
  Trash2,
  ChevronDown,
  ChevronUp,
  Map
} from 'lucide-react';
import { useOfflineMap } from '../services/OfflineMapService';

// ============================================
// COMPACT BADGE (für Navbar)
// ============================================

export const MapSyncBadge = ({ className = '' }) => {
  const { isDownloading, progress, stats } = useOfflineMap();
  
  if (isDownloading) {
    return (
      <div className={`flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded text-blue-400 text-xs ${className}`}>
        <Download className="w-3 h-3 animate-pulse" />
        <span>{progress?.percent || 0}%</span>
      </div>
    );
  }
  
  if (stats?.cachedObjects > 0) {
    return (
      <div className={`flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded text-green-400 text-xs ${className}`}>
        <Map className="w-3 h-3" />
        <span>{stats.cachedObjects}</span>
      </div>
    );
  }
  
  return null;
};

// ============================================
// FULL STATUS PANEL
// ============================================

const MapSyncStatus = ({ 
  objects = [], 
  onSync = null,
  compact = false,
  className = '' 
}) => {
  const { 
    isDownloading, 
    progress, 
    stats, 
    syncObjects, 
    clearCache,
    refreshStats 
  } = useOfflineMap();
  
  const [expanded, setExpanded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Auto-Sync beim Mount wenn Objekte übergeben werden
  useEffect(() => {
    if (objects.length > 0 && !isDownloading) {
      // Nur im Hintergrund syncen wenn online
      if (navigator.onLine) {
        syncObjects(objects, { 
          onlyOnWifi: true,
          maxObjects: 20 
        });
      }
    }
  }, [objects.length]);
  
  const handleManualSync = async () => {
    if (syncing || isDownloading) return;
    
    setSyncing(true);
    try {
      await syncObjects(objects, { 
        onlyOnWifi: false, // Manual = auch ohne WLAN
        maxObjects: 50 
      });
    } finally {
      setSyncing(false);
    }
  };
  
  const handleClearCache = async () => {
    if (confirm('Alle gecachten Karten löschen?')) {
      await clearCache();
      await refreshStats();
    }
  };
  
  // Berechne ungecachte Objekte
  const objectsWithGps = objects.filter(o => o.latitude && o.longitude);
  const cachedCount = stats?.cachedObjects || 0;
  const uncachedCount = Math.max(0, objectsWithGps.length - cachedCount);
  
  if (compact) {
    return (
      <div 
        className={`flex items-center gap-2 cursor-pointer ${className}`}
        onClick={() => setExpanded(!expanded)}
      >
        {isDownloading ? (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded text-blue-400 text-xs">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Karten: {progress?.percent || 0}%</span>
          </div>
        ) : uncachedCount > 0 ? (
          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded text-yellow-400 text-xs">
            <WifiOff className="w-3 h-3" />
            <span>{uncachedCount} nicht offline</span>
          </div>
        ) : cachedCount > 0 ? (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded text-green-400 text-xs">
            <Check className="w-3 h-3" />
            <span>{cachedCount} offline</span>
          </div>
        ) : null}
      </div>
    );
  }
  
  return (
    <div className={`bg-[#1a1a2e] rounded-lg border border-white/10 overflow-hidden ${className}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Map className="w-5 h-5 text-purple-400" />
          <span className="font-medium text-white">Offline-Karten</span>
        </div>
        
        <div className="flex items-center gap-2">
          {isDownloading ? (
            <div className="flex items-center gap-1 text-blue-400 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{progress?.percent || 0}%</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">
              {cachedCount} / {objectsWithGps.length} Standorte
            </span>
          )}
          
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>
      
      {/* Download Progress */}
      {isDownloading && progress && (
        <div className="px-3 pb-2">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>{progress.objectName || 'Lade...'}</span>
            <span>{progress.downloaded}/{progress.total} Tiles</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress.percent || 0}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-white/10 p-3 space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/5 rounded p-2">
              <div className="text-gray-400 text-xs">Gecacht</div>
              <div className="text-white font-medium">{cachedCount} Standorte</div>
            </div>
            <div className="bg-white/5 rounded p-2">
              <div className="text-gray-400 text-xs">Speicher</div>
              <div className="text-white font-medium">{stats?.totalSizeMB || 0} MB</div>
            </div>
          </div>
          
          {/* Status Message */}
          {uncachedCount > 0 && !isDownloading && (
            <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded text-yellow-400 text-sm">
              <WifiOff className="w-4 h-4" />
              <span>{uncachedCount} Standorte nicht offline verfügbar</span>
            </div>
          )}
          
          {uncachedCount === 0 && cachedCount > 0 && (
            <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded text-green-400 text-sm">
              <Check className="w-4 h-4" />
              <span>Alle Standorte offline verfügbar!</span>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleManualSync}
              disabled={syncing || isDownloading || uncachedCount === 0}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm transition-colors"
            >
              {syncing || isDownloading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>
                {uncachedCount > 0 ? `${uncachedCount} laden` : 'Alle geladen'}
              </span>
            </button>
            
            {cachedCount > 0 && (
              <button
                onClick={handleClearCache}
                disabled={isDownloading}
                className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Object List (optional) */}
          {stats?.objectDetails && stats.objectDetails.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              <div className="text-xs text-gray-500 mb-1">Gecachte Standorte:</div>
              {stats.objectDetails.map((obj) => (
                <div 
                  key={obj.objectId}
                  className="flex items-center justify-between text-xs px-2 py-1 bg-white/5 rounded"
                >
                  <span className="text-gray-300">{obj.objectName}</span>
                  <span className="text-gray-500">{obj.tileCount} Tiles</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapSyncStatus;