import { WifiOff, Wifi } from 'lucide-react';
import { useOffline } from '../../hooks/useOffline';

export default function OfflineBanner() {
  const { isOnline, queueLength, isSyncing } = useOffline();

  if (isOnline && queueLength === 0) return null;

  return (
    <div className={`px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium ${
      isOnline 
        ? 'bg-blue-600 text-white' 
        : 'bg-yellow-600 text-white'
    }`}>
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          {isSyncing ? (
            <span>Synchronisiere {queueLength} ausstehende Scans...</span>
          ) : queueLength > 0 ? (
            <span>{queueLength} Scans werden synchronisiert</span>
          ) : (
            <span>Alle Daten synchronisiert</span>
          )}
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Offline-Modus</span>
          {queueLength > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
              {queueLength} ausstehend
            </span>
          )}
        </>
      )}
    </div>
  );
}