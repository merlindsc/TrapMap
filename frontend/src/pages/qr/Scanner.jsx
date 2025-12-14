/* ============================================================
   TRAPMAP - QR SCANNER V8
   
   Neu mit @zxing/browser - zuverlässiger und einfacher!
   
   FEATURES:
   - Schnellkontrolle: BoxScanDialog direkt im Scanner
   - GPS-Distanz Check bei GPS-Boxen (>10m Warnung)
   - Platzierungsauswahl für nicht-platzierte Boxen
   - Nach Speichern → Scanner sofort wieder aktiv
   ============================================================ */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { 
  Camera, X, RotateCcw, Flashlight, SwitchCamera,
  Package, Navigation, Layers, AlertTriangle,
  MapPin, CheckCircle, ArrowRight
} from "lucide-react";

import BoxScanDialog from "../../components/BoxScanDialog";
import BoxEditDialog from "../maps/BoxEditDialog";

const API = import.meta.env.VITE_API_URL;

// Distanz berechnen (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function formatDistance(meters) {
  if (meters >= 500) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)}m`;
}

export default function Scanner() {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  // Refs
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const lastScannedCodeRef = useRef(null);
  const isPausedRef = useRef(false);
  
  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");
  const [cameras, setCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [blockedCode, setBlockedCode] = useState(null);

  // Box State
  const [currentBox, setCurrentBox] = useState(null);
  const [boxLoading, setBoxLoading] = useState(false);
  
  // Dialog States
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [showPlacementChoice, setShowPlacementChoice] = useState(false);
  const [showGPSWarning, setShowGPSWarning] = useState(false);
  const [showFirstSetup, setShowFirstSetup] = useState(false);
  
  // GPS State
  const [currentGPS, setCurrentGPS] = useState(null);
  const [gpsDistance, setGpsDistance] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Placement State
  const [pendingPlacement, setPendingPlacement] = useState(null);
  const [objectFloorplans, setObjectFloorplans] = useState([]);
  const [boxTypes, setBoxTypes] = useState([]);

  // Success Toast
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Mobile Detection
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);

  // Helper
  const hasActiveDialog = showScanDialog || showGPSWarning || showPlacementChoice || showFirstSetup;

  // ============================================
  // SCANNER INITIALISIEREN
  // ============================================
  useEffect(() => {
    initScanner();
    
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
      }
    };
  }, []);

  const initScanner = async () => {
    try {
      setError("");
      
      // Code Reader erstellen
      codeReaderRef.current = new BrowserMultiFormatReader();
      
      // Kameras auflisten
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      console.log("📷 Kameras gefunden:", devices.length);
      
      if (!devices || devices.length === 0) {
        setError("Keine Kamera gefunden");
        return;
      }

      setCameras(devices);
      
      // Bevorzuge Rückkamera
      let cameraIndex = devices.length - 1; // Default: letzte (meist Rückkamera)
      const backIndex = devices.findIndex(d => 
        d.label.toLowerCase().includes("back") || 
        d.label.toLowerCase().includes("rück") ||
        d.label.toLowerCase().includes("environment")
      );
      if (backIndex !== -1) cameraIndex = backIndex;
      
      setCurrentCameraIndex(cameraIndex);
      await startScanning(devices[cameraIndex].deviceId);
      
    } catch (err) {
      console.error("Init error:", err);
      setError("Kamera konnte nicht gestartet werden: " + err.message);
    }
  };

  // ============================================
  // SCANNING STARTEN
  // ============================================
  const startScanning = async (deviceId) => {
    if (!codeReaderRef.current || !videoRef.current) return;
    
    try {
      console.log("🎥 Starte Scanner mit Kamera:", deviceId);
      isPausedRef.current = false;
      
      await codeReaderRef.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error) => {
          // Ignorieren wenn pausiert
          if (isPausedRef.current) return;
          
          if (result) {
            handleScanResult(result.getText());
          }
          // Fehler ignorieren (kontinuierliches Scannen)
        }
      );
      
      setIsScanning(true);
      setError("");
      console.log("✅ Scanner läuft");
      
    } catch (err) {
      console.error("Start error:", err);
      setError("Scanner konnte nicht gestartet werden");
    }
  };

  // ============================================
  // SCAN RESULT HANDLER
  // ============================================
  const handleScanResult = useCallback(async (decodedText) => {
    if (!decodedText) return;
    
    // Code extrahieren
    let code = decodedText;
    if (decodedText.includes("trap-map.de/s/")) {
      code = decodedText.split("/s/")[1];
    }
    
    // Gleicher Code? Ignorieren!
    if (code === lastScannedCodeRef.current) {
      return;
    }
    
    // NEUER CODE!
    console.log(`📱 Scan: ${code}`);
    
    // Scanner pausieren (nicht stoppen!)
    isPausedRef.current = true;
    lastScannedCodeRef.current = code;
    setBlockedCode(code);
    
    // Vibration
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    // Code verarbeiten
    await handleCodeCheck(code);
  }, []);

  // ============================================
  // CODE PRÜFEN
  // ============================================
  const handleCodeCheck = async (code) => {
    setBoxLoading(true);
    setError("");

    try {
      const res = await axios.get(`${API}/qr/check/${code}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("📦 Response:", res.data);

      // Code nicht in DB
      if (!res.data || !res.data.box_id) {
        navigate(`/qr/assign-code?code=${code}`);
        return;
      }

      // Box im Pool
      if (!res.data.object_id) {
        navigate(`/qr/assign-object?code=${code}&boxId=${res.data.box_id}`);
        return;
      }

      const boxData = {
        id: res.data.box_id,
        qr_code: code,
        code: code,
        object_id: res.data.object_id,
        object_name: res.data.object_name,
        position_type: res.data.position_type,
        lat: res.data.lat,
        lng: res.data.lng,
        floor_plan_id: res.data.floor_plan_id,
        pos_x: res.data.pos_x,
        pos_y: res.data.pos_y,
        grid_position: res.data.grid_position,
        number: res.data.number,
        display_number: res.data.display_number,
        name: res.data.name,
        box_type_id: res.data.box_type_id,
        box_type_name: res.data.box_type_name,
      };

      setCurrentBox(boxData);

      const hasGPS = boxData.lat && boxData.lng;
      const hasFloorplan = boxData.floor_plan_id && (boxData.pos_x || boxData.grid_position);
      const isPlaced = hasGPS || hasFloorplan;
      const isGPSBox = (boxData.position_type === 'gps' || boxData.position_type === 'map') || 
                       (hasGPS && !hasFloorplan);

      // NICHT PLATZIERT
      if (!isPlaced) {
        await loadPlacementData(boxData);
        return;
      }

      // GPS-Box auf Mobile
      if (isGPSBox && hasGPS && isMobile) {
        await checkGPSDistance(boxData);
        return;
      }

      // Direkt zum Dialog
      setBoxLoading(false);
      setShowScanDialog(true);

    } catch (err) {
      console.error("Check error:", err);
      setError("Fehler: " + (err.response?.data?.message || err.message));
      setBoxLoading(false);
      isPausedRef.current = false;
    }
  };

  // ============================================
  // GPS DISTANZ PRÜFEN
  // ============================================
  const checkGPSDistance = async (boxData) => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          reject,
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });

      setCurrentGPS(position);
      const distance = calculateDistance(position.lat, position.lng, boxData.lat, boxData.lng);
      setGpsDistance(distance);
      setBoxLoading(false);

      if (distance > 10) {
        setShowGPSWarning(true);
      } else {
        setShowScanDialog(true);
      }

    } catch (err) {
      console.log("GPS Error:", err.message);
      setBoxLoading(false);
      setShowScanDialog(true);
    }
  };

  // ============================================
  // PLATZIERUNGSDATEN LADEN
  // ============================================
  const loadPlacementData = async (boxData) => {
    try {
      const [fpRes, btRes] = await Promise.all([
        axios.get(`${API}/floorplans/object/${boxData.object_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/box-types`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setObjectFloorplans(fpRes.data || []);
      setBoxTypes(btRes.data || []);
    } catch (err) {
      console.error("Load placement error:", err);
    }

    setPendingPlacement({
      code: boxData.qr_code,
      boxId: boxData.id,
      objectId: boxData.object_id
    });
    setBoxLoading(false);
    setShowPlacementChoice(true);
  };

  // ============================================
  // GPS POSITION HOLEN
  // ============================================
  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        reject,
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // ============================================
  // DIALOG SCHLIESSEN - Scanner fortsetzen
  // ============================================
  const resetScanner = () => {
    console.log("🔄 Reset - Scanner fortsetzen");
    
    setCurrentBox(null);
    setShowScanDialog(false);
    setShowGPSWarning(false);
    setShowPlacementChoice(false);
    setShowFirstSetup(false);
    setPendingPlacement(null);
    setGpsDistance(0);
    setCurrentGPS(null);
    setError("");
    setBoxLoading(false);
    
    // Scanner fortsetzen!
    isPausedRef.current = false;
  };

  const unlockLastCode = () => {
    lastScannedCodeRef.current = null;
    setBlockedCode(null);
  };

  // ============================================
  // HANDLER: SCAN DIALOG
  // ============================================
  const handleScanCompleted = () => {
    setSuccessMessage("Kontrolle gespeichert!");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
    resetScanner();
  };

  // ============================================
  // HANDLER: GPS WARNING
  // ============================================
  const handleIgnoreGPSWarning = () => {
    setShowGPSWarning(false);
    setShowScanDialog(true);
  };

  const handleUpdateGPSPosition = async () => {
    if (!currentGPS || !currentBox) return;
    
    setGpsLoading(true);
    try {
      await axios.put(`${API}/boxes/${currentBox.id}/position`, {
        lat: currentGPS.lat,
        lng: currentGPS.lng,
        position_type: 'gps'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCurrentBox(prev => ({ ...prev, lat: currentGPS.lat, lng: currentGPS.lng }));
      setGpsLoading(false);
      setShowGPSWarning(false);
      setShowScanDialog(true);

    } catch (err) {
      console.error("GPS update error:", err);
      setGpsLoading(false);
      setShowGPSWarning(false);
      setShowScanDialog(true);
    }
  };

  // ============================================
  // HANDLER: PLATZIERUNGSAUSWAHL
  // ============================================
  const handleChooseGPS = async () => {
    if (!pendingPlacement) return;
    
    if (!isMobile) {
      navigate(`/maps?object_id=${pendingPlacement.objectId}&placeBox=${pendingPlacement.boxId}`);
      return;
    }

    setGpsLoading(true);
    try {
      const position = await getCurrentPosition();
      
      await axios.put(`${API}/boxes/${pendingPlacement.boxId}/position`, {
        lat: position.lat,
        lng: position.lng,
        position_type: 'gps'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCurrentBox(prev => ({ ...prev, lat: position.lat, lng: position.lng, position_type: 'gps' }));
      setGpsLoading(false);
      setShowPlacementChoice(false);
      setShowFirstSetup(true);

    } catch (err) {
      console.error("GPS placement error:", err);
      setGpsLoading(false);
      setError("GPS-Position konnte nicht ermittelt werden");
    }
  };

  const handleChooseFloorplan = () => {
    if (!pendingPlacement) return;
    
    if (objectFloorplans.length === 1) {
      navigate(`/objects/${pendingPlacement.objectId}?tab=floorplan&fp=${objectFloorplans[0].id}&placeBox=${pendingPlacement.boxId}`);
    } else {
      navigate(`/objects/${pendingPlacement.objectId}?tab=floorplan&placeBox=${pendingPlacement.boxId}`);
    }
  };

  // ============================================
  // HANDLER: ERSTEINRICHTUNG
  // ============================================
  const handleFirstSetupCompleted = () => {
    setSuccessMessage("Box eingerichtet!");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
    resetScanner();
  };

  // ============================================
  // KAMERA WECHSELN
  // ============================================
  const switchCamera = async () => {
    if (cameras.length < 2) return;
    
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    
    // Scanner neu starten mit neuer Kamera
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      await startScanning(cameras[nextIndex].deviceId);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle size={20} />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* ========== OVERLAY: GPS WARNING ========== */}
      {showGPSWarning && currentBox && (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a] overflow-auto">
          <div className="flex items-center justify-between p-4 bg-[#111] border-b border-white/10">
            <button onClick={resetScanner} className="p-2 text-gray-400 hover:text-white">
              <X size={24} />
            </button>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle size={20} className="text-yellow-400" />
              Position prüfen
            </h1>
            <div className="w-10" />
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={24} className="text-yellow-400 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-yellow-300">Position stimmt nicht überein</h3>
                  <p className="text-yellow-200/80 text-sm mt-1">
                    Du bist <strong>{formatDistance(gpsDistance)}</strong> von der gespeicherten Position entfernt.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-[#111] border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                  <Package size={24} className="text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold">Box #{currentBox.display_number || currentBox.number || currentBox.id}</p>
                  <p className="text-sm text-gray-400">{currentBox.qr_code}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleUpdateGPSPosition}
                disabled={gpsLoading}
                className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                {gpsLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Navigation size={20} />
                )}
                Position aktualisieren
              </button>
              <button
                onClick={handleIgnoreGPSWarning}
                className="flex-1 py-4 bg-[#222] hover:bg-[#333] border border-white/10 rounded-xl font-semibold"
              >
                Trotzdem prüfen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== OVERLAY: BOX SCAN DIALOG ========== */}
      {showScanDialog && currentBox && (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a]">
          <BoxScanDialog
            box={currentBox}
            onClose={resetScanner}
            onSave={handleScanCompleted}
            onScanCreated={handleScanCompleted}
            onShowDetails={() => {
              const isFloorplan = currentBox.position_type === 'floorplan' && currentBox.floor_plan_id;
              if (isFloorplan) {
                navigate(`/objects/${currentBox.object_id}?tab=floorplan&openBox=${currentBox.id}`);
              } else {
                navigate(`/maps?object_id=${currentBox.object_id}&openBox=${currentBox.id}&flyTo=true`);
              }
            }}
          />
        </div>
      )}

      {/* ========== OVERLAY: ERSTEINRICHTUNG ========== */}
      {showFirstSetup && currentBox && (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a]">
          <BoxEditDialog
            box={currentBox}
            boxTypes={boxTypes}
            isFirstSetup={true}
            onClose={resetScanner}
            onSave={handleFirstSetupCompleted}
          />
        </div>
      )}

      {/* ========== OVERLAY: PLATZIERUNGSAUSWAHL ========== */}
      {showPlacementChoice && pendingPlacement && (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a] overflow-auto">
          <div className="flex items-center justify-between p-4 bg-[#111] border-b border-white/10">
            <button onClick={resetScanner} className="p-2 text-gray-400 hover:text-white">
              <X size={24} />
            </button>
            <h1 className="text-lg font-semibold">Box platzieren</h1>
            <div className="w-10" />
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Package size={24} className="text-indigo-400" />
                <div>
                  <p className="font-semibold">{pendingPlacement.code}</p>
                  <p className="text-indigo-300 text-sm">Box ist zugewiesen aber nicht platziert.</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleChooseGPS}
                disabled={gpsLoading}
                className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-white/10 hover:border-green-500/50 rounded-xl p-5 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center">
                    {gpsLoading ? (
                      <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Navigation size={28} className="text-green-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{isMobile ? "GPS-Position" : "Karte öffnen"}</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {isMobile ? "An aktueller Position platzieren" : "Zur Karte navigieren"}
                    </p>
                  </div>
                </div>
              </button>
              {objectFloorplans.length > 0 && (
                <button
                  onClick={handleChooseFloorplan}
                  className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-white/10 hover:border-blue-500/50 rounded-xl p-5 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <Layers size={28} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Auf Lageplan</h3>
                      <p className="text-sm text-gray-400 mt-1">{objectFloorplans.length} Lageplan(e)</p>
                    </div>
                  </div>
                </button>
              )}
            </div>
            <button onClick={resetScanner} className="w-full py-3 text-gray-400 hover:text-white text-sm">
              ← Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* ========== SCANNER ========== */}
      <div style={{ visibility: hasActiveDialog ? 'hidden' : 'visible' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#111] border-b border-white/10">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-white">
            <X size={24} />
          </button>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Camera size={20} />
            QR-Scanner
          </h1>
          <div className="flex gap-2">
            {cameras.length > 1 && (
              <button onClick={switchCamera} className="p-2 text-gray-400 hover:text-white">
                <SwitchCamera size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="m-4 p-4 bg-red-900/50 border border-red-500/50 rounded-xl">
            <p className="text-red-300 mb-3">{error}</p>
            <button
              onClick={initScanner}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2"
            >
              <RotateCcw size={16} />
              Erneut versuchen
            </button>
          </div>
        )}

        {/* Loading */}
        {boxLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-4" />
            <p className="text-gray-400">Box wird geladen...</p>
          </div>
        )}

        {/* Video Container */}
        <div className="relative bg-black">
          <video 
            ref={videoRef} 
            className="w-full"
            style={{ display: isScanning && !boxLoading ? 'block' : 'none' }}
          />
          
          {/* Blocked Code Hinweis */}
          {isScanning && blockedCode && !hasActiveDialog && !boxLoading && (
            <div className="absolute bottom-4 left-4 right-4 bg-yellow-900/90 border border-yellow-600/50 rounded-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0" />
                  <p className="text-yellow-200 text-sm truncate">
                    <strong>{blockedCode}</strong> wird ignoriert
                  </p>
                </div>
                <button
                  onClick={unlockLastCode}
                  className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-medium rounded-lg"
                >
                  Entsperren
                </button>
              </div>
            </div>
          )}

          {/* Scan Overlay */}
          {isScanning && !boxLoading && !hasActiveDialog && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-64 h-64">
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-scan" />
              </div>
            </div>
          )}
        </div>

        {/* Hint */}
        {isScanning && !boxLoading && !error && !hasActiveDialog && (
          <p className="text-center text-gray-500 text-sm py-4">
            Halte den QR-Code in den grünen Rahmen
          </p>
        )}

        {/* Kamera-Info */}
        {cameras.length > 0 && isScanning && (
          <p className="text-center text-gray-600 text-xs py-2">
            Kamera {currentCameraIndex + 1}/{cameras.length}: {cameras[currentCameraIndex]?.label || 'Unbekannt'}
          </p>
        )}
      </div>

      {/* Styles */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 0; opacity: 0; }
          50% { top: calc(100% - 2px); opacity: 1; }
        }
        .animate-scan { animation: scan 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}