/* ============================================================
   TRAPMAP - QR SCANNER V12 (OFFLINE-FÄHIG, KEIN AUTO-SWITCH)
   
   ÄNDERUNGEN V12:
   - Auto-Switch komplett entfernt (nervte)
   - Reset-Bug gefixt
   - Bessere Offline-Behandlung
   ============================================================ */

import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { 
  Camera, X, RotateCcw, Flashlight, SwitchCamera,
  Package, Navigation, Layers, AlertTriangle,
  CheckCircle, WifiOff
} from "lucide-react";

import BoxScanDialog from "../../components/BoxScanDialog";
import BoxEditDialog from "../maps/BoxEditDialog";

// Offline API Imports
import { 
  findBoxByQR, 
  getBoxTypes,
  getLayouts,
  isOnline 
} from "../../utils/offlineAPI";
import { useOffline } from "../../context/OfflineContext";

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
  
  // Offline Context
  const offlineCtx = useOffline();
  const pendingCount = offlineCtx?.pendingCount || 0;
  const currentlyOffline = !isOnline();
  
  // Refs
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const streamRef = useRef(null);
  const lastScannedCodeRef = useRef(null);
  const scanningActiveRef = useRef(false);
  
  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");
  const [cameras, setCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [scannedCode, setScannedCode] = useState(null);
  
  // Torch State
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

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
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Helper
  const hasActiveDialog = showScanDialog || showGPSWarning || showPlacementChoice || showFirstSetup;

  // ============================================
  // INIT
  // ============================================
  useEffect(() => {
    initScanner();
    loadBoxTypes();
    
    return () => {
      stopScanner();
    };
  }, []);

  const loadBoxTypes = async () => {
    try {
      const result = await getBoxTypes();
      if (result.success) {
        setBoxTypes(result.data || []);
        console.log("✅ BoxTypes geladen:", result.data?.length);
      }
    } catch (err) {
      console.error("Load box types error:", err);
    }
  };

  // ============================================
  // SCANNER INITIALISIEREN
  // ============================================
  const initScanner = async () => {
    try {
      setError("");
      
      codeReaderRef.current = new BrowserMultiFormatReader();
      
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      console.log("📷 Kameras gefunden:", devices.length);
      
      if (!devices || devices.length === 0) {
        setError("Keine Kamera gefunden");
        return;
      }

      // Kameras sortieren: Rückkamera bevorzugen
      const sortedCameras = sortCamerasByQuality(devices);
      setCameras(sortedCameras);
      setCurrentCameraIndex(0);
      
      await startScanning(sortedCameras[0].deviceId);
      
    } catch (err) {
      console.error("Init error:", err);
      setError("Kamera konnte nicht gestartet werden");
    }
  };

  // Kameras sortieren (Rückkamera zuerst, Frontkamera raus)
  const sortCamerasByQuality = (devices) => {
    const getScore = (device) => {
      const label = device.label.toLowerCase();
      
      // Frontkamera ausschließen
      if (label.includes("front") || label.includes("user") || label.includes("selfie") || label.includes("facetime")) {
        return -100;
      }
      
      let score = 0;
      if (label.includes("back") || label.includes("rear") || label.includes("environment")) score += 20;
      if (label.includes("wide") && !label.includes("ultra")) score += 10;
      if (label.includes("ultra")) score -= 10;
      if (label.includes("tele") || label.includes("zoom")) score -= 5;
      if (label.includes("macro")) score -= 15;
      
      return score;
    };

    return [...devices]
      .map(d => ({ device: d, score: getScore(d) }))
      .filter(d => d.score > -100)
      .sort((a, b) => b.score - a.score)
      .map(d => d.device);
  };

  // Manuell Kamera wechseln
  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    setTorchOn(false);
    
    // Aktuellen Stream stoppen
    stopCurrentStream();
    
    // Neuen Stream starten
    await startScanning(cameras[nextIndex].deviceId);
  };

  const stopCurrentStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch (e) {}
    }
  };

  // ============================================
  // SCANNING
  // ============================================
  const startScanning = async (deviceId) => {
    if (!codeReaderRef.current || !videoRef.current) return;
    
    try {
      console.log("🎥 Starte Scanner...");
      scanningActiveRef.current = true;
      
      await codeReaderRef.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error) => {
          // Nur verarbeiten wenn Scanner aktiv
          if (!scanningActiveRef.current) return;
          
          if (result) {
            handleScan(result.getText());
          }
        }
      );
      
      if (videoRef.current.srcObject) {
        streamRef.current = videoRef.current.srcObject;
        checkTorchSupport();
      }
      
      setIsScanning(true);
      setError("");
      console.log("✅ Scanner läuft");
      
    } catch (err) {
      console.error("Start error:", err);
      setError("Scanner konnte nicht gestartet werden: " + err.message);
    }
  };

  const stopScanner = () => {
    console.log("🛑 Stoppe Scanner");
    scanningActiveRef.current = false;
    stopCurrentStream();
    setIsScanning(false);
  };

  // ============================================
  // TORCH
  // ============================================
  const checkTorchSupport = () => {
    if (!streamRef.current) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && track.getCapabilities) {
        const capabilities = track.getCapabilities();
        setTorchSupported(capabilities?.torch === true);
      }
    } catch (e) {}
  };

  const toggleTorch = async () => {
    if (!streamRef.current || !torchSupported) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
        setTorchOn(!torchOn);
      }
    } catch (err) {}
  };

  // ============================================
  // SCAN HANDLER - OFFLINE-FÄHIG
  // ============================================
  const handleScan = async (decodedText) => {
    if (!decodedText) return;
    
    // Code extrahieren
    let code = decodedText;
    if (decodedText.includes("trap-map.de/s/")) {
      code = decodedText.split("/s/")[1];
    }
    
    // Gleicher Code? Ignorieren
    if (code === lastScannedCodeRef.current) {
      return;
    }
    
    // Bereits am Verarbeiten? Ignorieren
    if (!scanningActiveRef.current) {
      return;
    }
    
    console.log("📱 Scan:", code, currentlyOffline ? "(OFFLINE)" : "(online)");
    
    // Scanner pausieren
    scanningActiveRef.current = false;
    lastScannedCodeRef.current = code;
    setScannedCode(code);
    
    // Vibration
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    setBoxLoading(true);
    setError("");

    try {
      // OFFLINE-FÄHIGE BOX-SUCHE
      const result = await findBoxByQR(code);
      
      console.log("📦 findBoxByQR Result:", result);

      // Code nicht gefunden
      if (!result.success || result.notFound) {
        if (currentlyOffline) {
          setBoxLoading(false);
          setError("📴 Offline - Box nicht im Cache");
          setTimeout(() => resetForNextScan(), 3000);
          return;
        } else {
          // Direkt zur Objekt-Zuweisung (Box wird dort erstellt)
          navigate(`/qr/assign-object?code=${code}&newBox=true`);
          return;
        }
      }

      const boxData = result.data;

      // Box im Pool (kein Objekt)
      if (!boxData.object_id) {
        if (currentlyOffline) {
          setBoxLoading(false);
          setError("📴 Offline - Box muss erst online zugewiesen werden");
          setTimeout(() => resetForNextScan(), 3000);
          return;
        }
        navigate(`/qr/assign-object?code=${code}&box_id=${boxData.id}`);
        return;
      }

      // Box-Daten normalisieren
      const normalizedBox = {
        id: boxData.id || boxData.box_id,
        qr_code: code,
        code: code,
        object_id: boxData.object_id,
        object_name: boxData.object_name || boxData.objects?.name,
        position_type: boxData.position_type,
        lat: boxData.lat,
        lng: boxData.lng,
        floor_plan_id: boxData.floor_plan_id,
        pos_x: boxData.pos_x,
        pos_y: boxData.pos_y,
        grid_position: boxData.grid_position,
        number: boxData.number || boxData.display_number,
        display_number: boxData.display_number || boxData.number,
        name: boxData.name || boxData.box_name,
        box_type_id: boxData.box_type_id,
        box_type_name: boxData.box_type_name || boxData.box_types?.name,
        current_status: boxData.current_status,
      };

      setCurrentBox(normalizedBox);

      const hasGPS = normalizedBox.lat && normalizedBox.lng;
      const hasFloorplan = normalizedBox.floor_plan_id && (normalizedBox.pos_x !== null || normalizedBox.grid_position);
      const isPlaced = hasGPS || hasFloorplan;
      const isGPSBox = (normalizedBox.position_type === 'gps' || normalizedBox.position_type === 'map') || 
                       (hasGPS && !hasFloorplan);

      // NICHT PLATZIERT
      if (!isPlaced) {
        if (currentlyOffline) {
          setBoxLoading(false);
          setShowFirstSetup(true);
          return;
        }
        
        try {
          const layoutResult = await getLayouts(normalizedBox.object_id);
          setObjectFloorplans(layoutResult.data || []);
        } catch (err) {}
        
        setPendingPlacement({
          code: normalizedBox.qr_code,
          boxId: normalizedBox.id,
          objectId: normalizedBox.object_id
        });
        setBoxLoading(false);
        setShowPlacementChoice(true);
        return;
      }

      // GPS-Box auf Mobile → Distanz prüfen
      if (isGPSBox && hasGPS && isMobile) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              reject,
              { enableHighAccuracy: true, timeout: 10000 }
            );
          });

          setCurrentGPS(position);
          const distance = calculateDistance(position.lat, position.lng, normalizedBox.lat, normalizedBox.lng);
          setGpsDistance(distance);
          setBoxLoading(false);

          if (distance > 10) {
            setShowGPSWarning(true);
          } else {
            setShowScanDialog(true);
          }
          return;
        } catch (err) {
          console.log("GPS Error:", err.message);
        }
      }

      // Direkt zum Dialog
      setBoxLoading(false);
      setShowScanDialog(true);

    } catch (err) {
      console.error("❌ Scan Error:", err);
      setBoxLoading(false);
      
      if (err.response?.status === 401) {
        setError("Session abgelaufen - bitte neu einloggen");
        return;
      }
      
      setError("Fehler: " + (err.message || "Unbekannter Fehler"));
      setTimeout(() => resetForNextScan(), 3000);
    }
  };

  // ============================================
  // RESET FUNKTIONEN
  // ============================================
  
  // Reset für nächsten Scan (nach Fehler)
  const resetForNextScan = () => {
    console.log("🔄 Reset für nächsten Scan");
    lastScannedCodeRef.current = null;
    scanningActiveRef.current = true;
    setError("");
    setScannedCode(null);
    setBoxLoading(false);
  };

  // Vollständiger Reset (nach Dialog schließen)
  const resetScanner = () => {
    console.log("🔄 Vollständiger Reset");
    
    // State zurücksetzen
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
    setScannedCode(null);
    
    // Scanner wieder aktivieren nach kurzer Pause
    setTimeout(() => {
      lastScannedCodeRef.current = null;
      scanningActiveRef.current = true;
      console.log("✅ Scanner bereit für nächsten Scan");
    }, 500);
  };

  // ============================================
  // HANDLER: DIALOGE
  // ============================================
  const handleScanCompleted = () => {
    setSuccessMessage(currentlyOffline ? "📴 Offline gespeichert!" : "✅ Kontrolle gespeichert!");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
    resetScanner();
  };

  const handleFirstSetupCompleted = () => {
    setSuccessMessage(currentlyOffline ? "📴 Offline eingerichtet!" : "✅ Box eingerichtet!");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
    resetScanner();
  };

  // ============================================
  // HANDLER: GPS WARNING
  // ============================================
  const handleUpdateGPS = async () => {
    if (!currentBox) return;
    
    setGpsLoading(true);
    
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          reject,
          { enableHighAccuracy: true, timeout: 15000 }
        );
      });

      const { updateBoxPosition } = await import("../../utils/offlineAPI");
      await updateBoxPosition(currentBox.id, position.lat, position.lng, 'gps');
      
      setCurrentBox(prev => ({ ...prev, lat: position.lat, lng: position.lng }));
      setShowGPSWarning(false);
      setShowScanDialog(true);
      
    } catch (err) {
      console.error("GPS Update error:", err);
      setError("GPS konnte nicht aktualisiert werden");
    }
    
    setGpsLoading(false);
  };

  const handleIgnoreGPSWarning = () => {
    setShowGPSWarning(false);
    setShowScanDialog(true);
  };

  // ============================================
  // HANDLER: PLATZIERUNG
  // ============================================
  const handleChooseGPS = async () => {
    if (!pendingPlacement) return;

    if (isMobile) {
      setGpsLoading(true);
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            reject,
            { enableHighAccuracy: true, timeout: 15000 }
          );
        });

        const { updateBoxPosition } = await import("../../utils/offlineAPI");
        await updateBoxPosition(pendingPlacement.boxId, position.lat, position.lng, 'gps');

        setGpsLoading(false);
        setShowPlacementChoice(false);
        setShowFirstSetup(true);
        
      } catch (err) {
        console.error("GPS error:", err);
        setGpsLoading(false);
        navigate(`/maps?object_id=${pendingPlacement.objectId}&openBox=${pendingPlacement.boxId}&firstSetup=true`);
      }
    } else {
      navigate(`/maps?object_id=${pendingPlacement.objectId}&openBox=${pendingPlacement.boxId}&firstSetup=true`);
    }
  };

  const handleChooseFloorplan = () => {
    if (!pendingPlacement) return;
    navigate(`/layouts/${pendingPlacement.objectId}?placeBox=${pendingPlacement.boxId}`);
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="fixed inset-0 bg-black text-white z-50 overflow-hidden">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-green-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg">
          <CheckCircle size={20} />
          {successMessage}
        </div>
      )}

      {/* Offline Banner */}
      {currentlyOffline && !hasActiveDialog && (
        <div className="fixed top-16 left-4 right-4 z-[150] bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-3 flex items-center gap-3">
          <WifiOff size={20} className="text-yellow-400" />
          <div className="flex-1">
            <p className="text-yellow-400 font-medium text-sm">Offline-Modus</p>
            <p className="text-yellow-400/60 text-xs">Scans werden lokal gespeichert</p>
          </div>
          {pendingCount > 0 && (
            <div className="px-2 py-1 bg-yellow-500/30 rounded text-yellow-400 text-xs">
              {pendingCount} pending
            </div>
          )}
        </div>
      )}

      {/* GPS WARNING DIALOG */}
      {showGPSWarning && currentBox && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4">
          <div className="bg-[#111] rounded-2xl max-w-sm w-full overflow-hidden border border-white/10">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">Entfernung: {formatDistance(gpsDistance)}</h2>
              <p className="text-gray-400 text-sm mb-4">
                Du bist {formatDistance(gpsDistance)} von der Box entfernt.
              </p>
            </div>
            <div className="p-4 bg-black/50 flex gap-3">
              <button
                onClick={handleUpdateGPS}
                disabled={gpsLoading}
                className="flex-1 py-4 bg-green-600 hover:bg-green-700 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                {gpsLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Navigation size={18} />
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

      {/* BOX SCAN DIALOG */}
      {showScanDialog && currentBox && (
        <div className="fixed inset-0 z-[100] bg-black dark:bg-gray-950">
          <BoxScanDialog
            box={currentBox}
            onClose={resetScanner}
            onSave={handleScanCompleted}
            onScanCreated={handleScanCompleted}
            onShowDetails={() => {
              const isFloorplan = currentBox.floor_plan_id && currentBox.pos_x !== null;
              if (isFloorplan) {
                navigate(`/layouts/${currentBox.object_id}?fp=${currentBox.floor_plan_id}&openBox=${currentBox.id}`);
              } else {
                navigate(`/maps?object_id=${currentBox.object_id}&openBox=${currentBox.id}&flyTo=true`);
              }
            }}
          />
        </div>
      )}

      {/* ERSTEINRICHTUNG */}
      {showFirstSetup && currentBox && (
        <div className="fixed inset-0 z-[100] bg-black dark:bg-gray-950">
          <BoxEditDialog
            box={currentBox}
            boxTypes={boxTypes}
            isFirstSetup={true}
            onClose={resetScanner}
            onSave={handleFirstSetupCompleted}
          />
        </div>
      )}

      {/* PLATZIERUNGSAUSWAHL */}
      {showPlacementChoice && pendingPlacement && (
        <div className="fixed inset-0 z-[100] bg-black dark:bg-gray-950 overflow-auto">
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

      {/* SCANNER */}
      <div style={{ visibility: hasActiveDialog ? 'hidden' : 'visible' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#111] border-b border-white/10">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-white">
            <X size={24} />
          </button>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Camera size={20} />
            QR-Scanner
            {currentlyOffline && <WifiOff size={14} className="text-yellow-400" />}
          </h1>
          <div className="flex gap-2">
            {cameras.length > 1 && (
              <button onClick={switchCamera} className="p-2 text-gray-400 hover:text-white">
                <SwitchCamera size={20} />
              </button>
            )}
            {torchSupported && (
              <button
                onClick={toggleTorch}
                className={`p-2 ${torchOn ? "text-yellow-400" : "text-gray-400"} hover:text-white`}
              >
                <Flashlight size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="m-4 p-4 bg-red-900/50 border border-red-500/50 rounded-xl">
            <p className="text-red-300 mb-3">{error}</p>
            <button
              onClick={() => {
                setError("");
                resetForNextScan();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2"
            >
              <RotateCcw size={16} />
              Weiter scannen
            </button>
          </div>
        )}

        {/* Loading */}
        {boxLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-4" />
            <p className="text-gray-400">Box wird geladen...</p>
            {scannedCode && (
              <p className="text-xs text-gray-500 mt-2 font-mono">Code: {scannedCode}</p>
            )}
            {currentlyOffline && (
              <p className="text-xs text-yellow-400 mt-2">📴 Suche im Offline-Cache...</p>
            )}
          </div>
        )}

        {/* Video */}
        <div className="relative bg-black">
          <video 
            ref={videoRef} 
            className="w-full"
            style={{ display: isScanning && !boxLoading ? 'block' : 'none' }}
          />
          
          {/* Scan Overlay */}
          {isScanning && !boxLoading && !hasActiveDialog && !error && (
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