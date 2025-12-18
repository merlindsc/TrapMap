import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

const CURRENT_VERSION = '2024-12-18';
const UPDATE_KEY = `trapmap-update-seen-${CURRENT_VERSION}`;

/**
 * 🎉 Update-Widget für neue Features
 * Zeigt User die neuesten Änderungen
 */
export default function UpdateWidget() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Prüfen ob Update schon gesehen wurde
    const seen = localStorage.getItem(UPDATE_KEY);
    if (!seen) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(UPDATE_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-slide-up">
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-2xl p-1">
        <div className="bg-gray-900 rounded-lg p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <h3 className="font-semibold text-white">Neue Features!</h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Updates */}
          <div className="space-y-3 text-sm">
            {/* Feature 1: Box-Kürzel */}
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-blue-400 font-semibold">📦 Neue Box-Anzeige</span>
              </div>
              <p className="text-gray-300 text-xs">
                Boxen werden jetzt überall mit <span className="font-mono bg-gray-700 px-1.5 py-0.5 rounded">Kürzel-Nummer Name</span> angezeigt.
                <br />
                <span className="text-gray-400">Beispiel: <span className="font-mono text-blue-300">RK-12 Eingang Lager</span></span>
              </p>
            </div>

            {/* Feature 2: Objekt-Farben */}
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-green-400 font-semibold">🎨 Objekt-Status-Farben</span>
              </div>
              <p className="text-gray-300 text-xs mb-2">
                Objekte auf der Karte zeigen jetzt den Befallsstatus in Farbe:
              </p>
              <div className="flex gap-2 flex-wrap text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span className="text-gray-300">Kein Befall</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span className="text-gray-300">Gering</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                  <span className="text-gray-300">Mittel</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="text-gray-300">Hoch</span>
                </span>
              </div>
            </div>

            {/* Feature 3: Offline-Verbesserungen */}
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-purple-400 font-semibold">📴 Offline-Modus verbessert</span>
              </div>
              <p className="text-gray-300 text-xs">
                Die Karte lädt jetzt auch ohne Internet.
                <br />
                <span className="text-gray-400">Pool-Boxen werden automatisch gecacht – Scanner funktioniert komplett offline!</span>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-gray-700">
            <button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all"
            >
              Verstanden! 🚀
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
