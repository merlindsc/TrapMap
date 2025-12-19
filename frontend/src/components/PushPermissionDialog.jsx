/* ============================================================
   TRAPMAP - PUSH PERMISSION DIALOG
   Popup zur Anfrage der Push-Berechtigung
   ============================================================ */

import { useState, useEffect } from 'react';
import { Bell, X, Clock, CheckCircle, Shield } from 'lucide-react';
import { 
  isPushSupported, 
  getPermissionStatus, 
  subscribeToPush,
  isSubscribed
} from '../utils/pushService';

export default function PushPermissionDialog() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkShouldShow();
  }, []);

  const checkShouldShow = async () => {
    // Nicht anzeigen wenn nicht unterstützt
    if (!isPushSupported()) return;
    
    // Nicht anzeigen wenn bereits berechtigt oder abgelehnt
    const permission = getPermissionStatus();
    if (permission === 'granted' || permission === 'denied') return;
    
    // Nicht anzeigen wenn bereits subscribed
    const subscribed = await isSubscribed();
    if (subscribed) return;
    
    // Nicht anzeigen wenn bereits dismissed (localStorage)
    const dismissedAt = localStorage.getItem('trapmap_push_dismissed');
    if (dismissedAt) {
      // Nach 7 Tagen wieder anzeigen
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return;
    }
    
    // Nicht anzeigen auf Login-Seite
    if (window.location.pathname === '/login') return;
    
    // Nach 3 Sekunden anzeigen
    setTimeout(() => setVisible(true), 3000);
  };

  const handleAccept = async () => {
    setLoading(true);
    try {
      await subscribeToPush({
        reminderEnabled: true,
        reminderDaysBefore: 1,
        reminderTime: '08:00'
      });
      setVisible(false);
    } catch (error) {
      console.error('Push subscribe error:', error);
      // Bei Fehler schließen (z.B. wenn User in Browser ablehnt)
      setVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('trapmap_push_dismissed', new Date().toISOString());
    setVisible(false);
    setDismissed(true);
  };

  const handleRemindLater = () => {
    // Nur für diese Session ausblenden
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
        onClick={handleRemindLater}
      />
      
      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-[90%] max-w-md">
        <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center">
              <Bell size={28} className="text-indigo-400" />
            </div>
            <button 
              onClick={handleRemindLater}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <h2 className="text-xl font-bold text-white mb-2">
            Erinnerungen aktivieren?
          </h2>
          <p className="text-gray-400 mb-6">
            Erhalte Push-Benachrichtigungen wenn Kontrollen fällig sind.
          </p>

          {/* Features */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock size={16} className="text-green-400" />
              </div>
              <span className="text-gray-300">
                <strong className="text-white">Rechtzeitig erinnert:</strong> "In 1 Tag müssen 5 Boxen kontrolliert werden"
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle size={16} className="text-blue-400" />
              </div>
              <span className="text-gray-300">
                <strong className="text-white">Keine verpassten Kontrollen</strong> mehr
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield size={16} className="text-purple-400" />
              </div>
              <span className="text-gray-300">
                <strong className="text-white">Jederzeit deaktivierbar</strong> in den Einstellungen
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-colors"
            >
              Nicht jetzt
            </button>
            <button
              onClick={handleAccept}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Bell size={18} />
                  Aktivieren
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Du kannst die Einstellungen jederzeit unter Einstellungen → Push-Benachrichtigungen ändern.
          </p>
        </div>
      </div>
    </>
  );
}
