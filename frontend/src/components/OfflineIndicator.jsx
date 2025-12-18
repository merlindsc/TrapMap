/* ============================================================
   TRAPMAP — OFFLINE STATUS INDICATOR
   Zeigt den Offline-Status und ausstehende Synchronisationen
   ============================================================ */

import React from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff, Check } from 'lucide-react';
import { useOffline } from '../context/OfflineContext';

export default function OfflineIndicator({ showDetails = false, className = '' }) {
  const { 
    isOnline, 
    isSyncing, 
    pendingScans, 
    pendingBoxes,
    pendingCount,
    syncOfflineData 
  } = useOffline();

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    await syncOfflineData();
  };

  // Keine Anzeige wenn online und nichts ausstehend
  if (isOnline && pendingCount === 0 && !showDetails) {
    return null;
  }

  return (
    <div className={`offline-indicator ${className}`}>
      {/* Kompakte Anzeige */}
      {!showDetails && (
        <div 
          className={`offline-badge ${isOnline ? 'online' : 'offline'} ${pendingCount > 0 ? 'has-pending' : ''}`}
          onClick={handleSync}
          title={isOnline ? 'Online' : 'Offline-Modus'}
        >
          {!isOnline && <WifiOff size={16} />}
          {isOnline && pendingCount > 0 && (
            <>
              {isSyncing ? (
                <RefreshCw size={16} className="spin" />
              ) : (
                <Cloud size={16} />
              )}
              <span className="pending-count">{pendingCount}</span>
            </>
          )}
          {isOnline && pendingCount === 0 && <Wifi size={16} />}
        </div>
      )}

      {/* Detaillierte Anzeige */}
      {showDetails && (
        <div className={`offline-details ${isOnline ? 'online' : 'offline'}`}>
          <div className="status-header">
            {isOnline ? (
              <>
                <Wifi size={20} className="text-green-500" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff size={20} className="text-red-500" />
                <span>Offline-Modus</span>
              </>
            )}
          </div>

          {pendingCount > 0 && (
            <div className="pending-info">
              <p className="pending-title">Ausstehende Synchronisationen:</p>
              <ul className="pending-list">
                {pendingScans > 0 && (
                  <li>📝 {pendingScans} Kontrolle{pendingScans !== 1 ? 'n' : ''}</li>
                )}
                {pendingBoxes > 0 && (
                  <li>📦 {pendingBoxes} Box{pendingBoxes !== 1 ? 'en' : ''}</li>
                )}
              </ul>

              {isOnline && (
                <button 
                  className="sync-button"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      Synchronisiere...
                    </>
                  ) : (
                    <>
                      <Cloud size={16} />
                      Jetzt synchronisieren
                    </>
                  )}
                </button>
              )}

              {!isOnline && (
                <p className="offline-note">
                  Die Daten werden automatisch synchronisiert, sobald Sie wieder online sind.
                </p>
              )}
            </div>
          )}

          {pendingCount === 0 && isOnline && (
            <div className="synced-info">
              <Check size={20} className="text-green-500" />
              <span>Alle Daten synchronisiert</span>
            </div>
          )}
        </div>
      )}

      <style>{`
        .offline-indicator {
          position: relative;
        }

        .offline-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .offline-badge.online {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
        }

        .offline-badge.online.has-pending {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .offline-badge.offline {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .offline-badge:hover {
          transform: scale(1.05);
        }

        .pending-count {
          background: currentColor;
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          min-width: 18px;
          text-align: center;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .offline-details {
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          min-width: 280px;
        }

        .offline-details.offline {
          border: 2px solid #ef4444;
        }

        .status-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .pending-info {
          margin-top: 12px;
        }

        .pending-title {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }

        .pending-list {
          list-style: none;
          padding: 0;
          margin: 0 0 12px 0;
        }

        .pending-list li {
          padding: 4px 0;
          font-size: 14px;
        }

        .sync-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .sync-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .sync-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .offline-note {
          font-size: 12px;
          color: #888;
          margin-top: 8px;
          padding: 8px;
          background: #f5f5f5;
          border-radius: 6px;
        }

        .synced-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #22c55e;
          font-size: 14px;
        }

        .text-green-500 { color: #22c55e; }
        .text-red-500 { color: #ef4444; }
      `}</style>
    </div>
  );
}
