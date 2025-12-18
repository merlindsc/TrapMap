/* ============================================================
   TRAPMAP - QR REDIRECT PAGE (OFFLINE-FÄHIG)
   Verarbeitet direkte QR-Code URLs: /s/:code
   
   OFFLINE: Sucht Box im Cache wenn keine Verbindung
   
   Leitet zum richtigen Flow weiter:
   - GPS-Box → Maps
   - Lageplan-Box → Object Page mit Lageplan-Tab
   - Pool-Box → Objekt-Zuweisung (nur online)
   ============================================================ */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { WifiOff, RefreshCw } from "lucide-react";

// 🆕 Offline API Import
import { findBoxByQR, isOnline } from "../../utils/offlineAPI";

const API = import.meta.env.VITE_API_URL;

export default function QRRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    if (!code) {
      setError("Kein Code angegeben");
      setChecking(false);
      return;
    }

    // Wenn nicht eingeloggt → Login mit Redirect
    if (!token || !user) {
      localStorage.setItem("trapmap_pending_qr", code);
      navigate("/login");
      return;
    }

    checkCode();
  }, [code, token, user]);

  const checkCode = async () => {
    const currentlyOffline = !isOnline();
    setIsOfflineMode(currentlyOffline);
    
    try {
      // 🆕 OFFLINE-FÄHIGE Box-Suche
      const result = await findBoxByQR(code);
      
      console.log("🔍 QR Check Result:", result, currentlyOffline ? "(OFFLINE)" : "(online)");

      // Code nicht gefunden
      if (!result.success || result.notFound) {
        if (currentlyOffline) {
          // Offline und nicht im Cache
          setError("📴 Offline - QR-Code nicht im Cache. Bitte online scannen um neue Codes zu erfassen.");
          setChecking(false);
          return;
        } else {
          // Online aber nicht gefunden
          setError("QR-Code nicht gefunden oder nicht für Ihre Organisation");
          setChecking(false);
          return;
        }
      }

      // Box gefunden (online oder aus Cache)
      const boxData = result.data;
      
      const boxId = boxData.id || boxData.box_id;
      const objectId = boxData.object_id;
      const positionType = boxData.position_type;
      const floorPlanId = boxData.floor_plan_id;
      const hasGPS = boxData.lat && boxData.lng;
      const hasFloorplan = floorPlanId && (boxData.pos_x !== null && boxData.pos_x !== undefined);

      console.log("🔍 QR Routing:", { 
        boxId, objectId, positionType, floorPlanId, hasGPS, hasFloorplan, 
        pos_x: boxData.pos_x,
        fromCache: result.offline || result.cached
      });

      // ============================================
      // ROUTING LOGIK
      // ============================================

      // Fall 1: Box im Pool (nicht zugewiesen)
      if (!objectId) {
        if (currentlyOffline) {
          // Offline: Kann nicht zuweisen
          setError("📴 Offline - Box muss zuerst online einem Objekt zugewiesen werden.");
          setChecking(false);
          return;
        }
        navigate(`/qr/assign-object?code=${code}&box_id=${boxId}`, { replace: true });
        return;
      }

      // Fall 2: Box auf LAGEPLAN → Direkt zum Lageplan-Editor!
      if (hasFloorplan) {
        navigate(`/layouts/${objectId}?fp=${floorPlanId}&openBox=${boxId}`, { replace: true });
        return;
      }

      // Fall 3: Box mit GPS
      if (hasGPS || positionType === 'gps' || positionType === 'map') {
        navigate(`/maps?object_id=${objectId}&openBox=${boxId}&flyTo=true`, { replace: true });
        return;
      }

      // Fall 4: Zugewiesen aber NICHT platziert
      if (currentlyOffline) {
        // Offline: Zum Scanner für Ersteinrichtung (offline möglich)
        navigate(`/qr/scanner?code=${code}&boxId=${boxId}&objectId=${objectId}&firstSetup=true`, { replace: true });
        return;
      }
      
      // Online: Maps für Ersteinrichtung
      navigate(`/maps?object_id=${objectId}&openBox=${boxId}&firstSetup=true`, { replace: true });

    } catch (err) {
      console.error("QR check error:", err);
      
      if (err.response?.status === 404) {
        setError("QR-Code nicht gefunden");
      } else if (err.response?.status === 403) {
        setError("Keine Berechtigung für diesen QR-Code");
      } else if (currentlyOffline) {
        setError("📴 Offline - QR-Code konnte nicht geprüft werden. Bitte Internetverbindung herstellen.");
      } else {
        setError("Fehler beim Prüfen des QR-Codes");
      }
      setChecking(false);
    }
  };

  // Retry Handler
  const handleRetry = () => {
    setError(null);
    setChecking(true);
    checkCode();
  };

  // Loading
  if (checking) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            QR-Code wird geprüft...
          </h2>
          <p className="text-gray-400">{code}</p>
          {isOfflineMode && (
            <div className="mt-4 flex items-center justify-center gap-2 text-yellow-400 text-sm">
              <WifiOff size={16} />
              Suche im Offline-Cache...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    const isOfflineError = error.includes("📴");
    
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className={`w-16 h-16 ${isOfflineError ? 'bg-yellow-500/20' : 'bg-red-500/20'} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
            {isOfflineError ? (
              <WifiOff size={32} className="text-yellow-400" />
            ) : (
              <span className="text-3xl">❌</span>
            )}
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            {isOfflineError ? "Offline" : "Fehler"}
          </h2>
          <p className="text-gray-400 mb-6">{error.replace("📴 ", "")}</p>
          <p className="text-sm text-gray-500 mb-6">Code: {code}</p>
          
          <div className="flex flex-col gap-3">
            {/* Retry Button */}
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              Erneut versuchen
            </button>
            
            {/* Zum Scanner */}
            <button
              onClick={() => navigate("/qr/scanner")}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
            >
              Zum Scanner
            </button>
            
            {/* Dashboard */}
            <button
              onClick={() => navigate("/dashboard")}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Zum Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}