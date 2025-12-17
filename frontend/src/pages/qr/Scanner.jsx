/* ============================================================
   TRAPMAP - QR SCANNER V10
   
   Saubere Version mit @zxing/browser
   ============================================================ */

import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { 
  Camera, X, RotateCcw, Flashlight, SwitchCamera,
  Package, Navigation, Layers, AlertTriangle,
  MapPin, CheckCircle
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
  const streamRef = useRef(null);
  const lastScannedCodeRef = useRef(null);
  const isPausedRef = useRef(false);
  const processingRef = useRef(false);
  const autoSwitchTimerRef = useRef(null);
  const cameraTriesRef = useRef(0);
  const dialogOpenRef = useRef(false);
  const camerasRef = useRef([]);
  
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
  
  // dialogOpenRef mit State synchronisieren
  useEffect(() => {
    dialogOpenRef.current = hasActiveDialog;
  }, [hasActiveDialog]);

  // camerasRef synchronisieren
  useEffect(() => {
    camerasRef.current = cameras;
  }, [cameras]);

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
      // Versuche beide Endpunkte
      let res;
      try {
        res = await axios.get(`${API}/boxtypes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        res = await axios.get(`${API}/box-types`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setBoxTypes(Array.isArray(res.data) ? res.data : res.data?.data || []);
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
      
      if (!devices || devices.length === 0) {
        setError("Keine Kamera gefunden");
        return;
      }

      // Kameras sortieren: Beste zuerst
      const sortedCameras = sortCamerasByQuality(devices);
      
      setCameras(sortedCameras);
      setCurrentCameraIndex(0);
      cameraTriesRef.current = 0;
      
      await startScanning(sortedCameras[0].deviceId);
      
      // Auto-Switch Timer starten (wechselt nach 6 Sek ohne Scan)
      startAutoSwitchTimer();
      
    } catch (err) {
      console.error("Init error:", err);
      setError("Kamera konnte nicht gestartet werden");
    }
  };

  // Kameras nach Qualität sortieren (beste für QR-Scanning zuerst)
  const sortCamerasByQuality = (devices) => {
    // Scoring-System: höher = besser
    const getScore = (device) => {
      const label = device.label.toLowerCase();
      
      // Frontkamera = -100 (nie verwenden)
      if (label.includes("front") || label.includes("user") || label.includes("selfie") || label.includes("facetime")) {
        return -100;
      }
      
      let score = 0;
      
      // Hauptkamera / Wide = beste Wahl
      if (label.includes("wide") && !label.includes("ultra")) score += 50;
      if (label.includes("back camera") || label.includes("rear camera")) score += 40;
      if (label.includes("0") && label.includes("back")) score += 30; // "Back Camera 0" ist oft die Hauptkamera
      
      // Ultra-Wide = schlecht für QR (zu viel Verzerrung)
      if (label.includes("ultra")) score -= 30;
      
      // Telephoto = schlecht für QR (zu nah)
      if (label.includes("tele") || label.includes("zoom")) score -= 20;
      
      // Macro = sehr schlecht
      if (label.includes("macro")) score -= 40;
      
      // Generische Rückkamera = okay
      if (label.includes("back") || label.includes("rear") || label.includes("environment")) score += 10;
      
      return score;
    };

    return [...devices]
      .map(d => ({ device: d, score: getScore(d) }))
      .filter(d => d.score > -100) // Frontkameras rausfiltern
      .sort((a, b) => b.score - a.score) // Höchster Score zuerst
      .map(d => d.device);
  };

  // Auto-Switch: Wechselt Kamera wenn nach 6 Sekunden kein QR erkannt
  const startAutoSwitchTimer = () => {
    // Alten Timer löschen
    if (autoSwitchTimerRef.current) {
      clearTimeout(autoSwitchTimerRef.current);
    }
    
    autoSwitchTimerRef.current = setTimeout(() => {
      // Nur wechseln wenn noch am scannen und kein Dialog offen
      const cams = camerasRef.current;
      if (!dialogOpenRef.current && !processingRef.current && cams.length > 1) {
        const nextTry = cameraTriesRef.current + 1;
        
        // Maximal 3 Versuche
        if (nextTry < cams.length && nextTry < 3) {
          cameraTriesRef.current = nextTry;
          switchToCamera(nextTry);
        }
      }
    }, 6000); // 6 Sekunden
  };

  // Zu bestimmter Kamera wechseln
  const switchToCamera = async (index) => {
    const cams = camerasRef.current;
    if (index >= cams.length) return;
    
    setCurrentCameraIndex(index);
    setTorchOn(false);
    
    // Aktuellen Stream stoppen
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch (e) {}
    }
    
    // Neuen Stream starten
    await startScanning(cams[index].deviceId);
    
    // Timer neu starten
    startAutoSwitchTimer();
  };

  // ============================================
  // SCANNING STARTEN
  // ============================================
  const startScanning = async (deviceId) => {
    if (!codeReaderRef.current || !videoRef.current) return;
    
    try {
      isPausedRef.current = false;
      processingRef.current = false;
      
      await codeReaderRef.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error) => {
          if (isPausedRef.current) return;
          if (processingRef.current) return;
          if (result) {
            handleScan(result.getText());
          }
        }
      );
      
      // Stream für Torch speichern
      if (videoRef.current.srcObject) {
        streamRef.current = videoRef.current.srcObject;
        checkTorchSupport();
      }
      
      setIsScanning(true);
      setError("");
      
    } catch (err) {
      console.error("Start error:", err);
      setError("Scanner konnte nicht gestartet werden: " + err.message);
    }
  };

  const stopScanner = () => {
    // Auto-Switch Timer stoppen
    if (autoSwitchTimerRef.current) {
      clearTimeout(autoSwitchTimerRef.current);
      autoSwitchTimerRef.current = null;
    }
    
    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch (e) {}
      codeReaderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
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
  // SCAN HANDLER
  // ============================================
  const handleScan = async (decodedText) => {
    if (!decodedText) return;
    
    // Code extrahieren
    let code = decodedText;
    if (decodedText.includes("trap-map.de/s/")) {
      code = decodedText.split("/s/")[1];
    }
    
    // Gleicher Code?
    if (code === lastScannedCodeRef.current) {
      return;
    }
    
    // Auto-Switch Timer stoppen (erfolgreicher Scan!)
    if (autoSwitchTimerRef.current) {
      clearTimeout(autoSwitchTimerRef.current);
    }
    
    // Lock setzen
    isPausedRef.current = true;
    processingRef.current = true;
    lastScannedCodeRef.current = code;
    setScannedCode(code);
    
    // Vibration
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    // Code prüfen
    setBoxLoading(true);
    setError("");

    try {
      const res = await axios.get(`${API}/qr/check/${code}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Code nicht in DB
      if (!res.data || !res.data.box_id) {
        navigate(`/qr/assign-code?code=${code}`);
        return;
      }

      // Box im Pool (kein Objekt)
      if (!res.data.object_id) {
        navigate(`/qr/assign-object?code=${code}&box_id=${res.data.box_id}`);
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

      // NICHT PLATZIERT → Platzierungsauswahl
      if (!isPlaced) {
        try {
          const fpRes = await axios.get(`${API}/floorplans/object/${boxData.object_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setObjectFloorplans(fpRes.data || []);
        } catch (err) {}
        
        setPendingPlacement({
          code: boxData.qr_code,
          boxId: boxData.id,
          objectId: boxData.object_id
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
          const distance = calculateDistance(position.lat, position.lng, boxData.lat, boxData.lng);
          setGpsDistance(distance);
          setBoxLoading(false);

          if (distance > 10) {
            setShowGPSWarning(true);
          } else {
            setShowScanDialog(true);
          }
          return;
        } catch (err) {
          // GPS error - continue without GPS
        }
      }

      // Direkt zum Dialog
      setBoxLoading(false);
      setShowScanDialog(true);

    } catch (err) {
      console.error("❌ API Error:", err.response?.status || err.message);
      console.error("Response:", err.response?.data);
      
      setBoxLoading(false);
      
      // Bei 401 → Token ungültig
      if (err.response?.status === 401) {
        setError("Session abgelaufen - bitte neu einloggen");
        return;
      }
      
      // Sonstiger Fehler → Anzeigen, NICHT zurücksetzen!
      setError("Fehler: " + (err.response?.data?.message || err.message));
      
      // Scanner nach 3 Sekunden wieder freigeben
      setTimeout(() => {
        lastScannedCodeRef.current = null;
        processingRef.current = false;
        isPausedRef.current = false;
        setError("");
      }, 3000);
    }
  };

  // ============================================
  // RESET - Scanner fortsetzen
  // ============================================
  const resetScanner = () => {
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
    
    // Camera-Tries zurücksetzen
    cameraTriesRef.current = 0;
    
    // Cooldown dann entsperren
    setTimeout(() => {
      lastScannedCodeRef.current = null;
      processingRef.current = false;
      isPausedRef.current = false;
      
      // Auto-Switch Timer neu starten
      startAutoSwitchTimer();
      
    }, 800);
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
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          reject,
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
      
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
      console.error("GPS error:", err);
      setGpsLoading(false);
      setError("GPS nicht verfügbar");
    }
  };

  const handleChooseFloorplan = () => {
    if (!pendingPlacement) return;
    
    // GEÄNDERT: Direkt zum Lageplan-Editor navigieren
    if (objectFloorplans.length === 1) {
      navigate(`/layouts/${pendingPlacement.objectId}?fp=${objectFloorplans[0].id}&placeBox=${pendingPlacement.boxId}`);
    } else {
      navigate(`/layouts/${pendingPlacement.objectId}?placeBox=${pendingPlacement.boxId}`);
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
  // Manueller Kamera-Wechsel (Button)
  const switchCamera = async () => {
    const cams = camerasRef.current;
    if (cams.length < 2) return;
    
    const nextIndex = (currentCameraIndex + 1) % cams.length;
    
    // Bei manuellem Wechsel: Tries zurücksetzen
    cameraTriesRef.current = 0;
    
    await switchToCamera(nextIndex);
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-black dark:bg-gray-950 text-white">

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle size={20} />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* ========== GPS WARNING ========== */}
      {showGPSWarning && currentBox && (
        <div className="fixed inset-0 z-[100] bg-black dark:bg-gray-950 overflow-auto">
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

      {/* ========== BOX SCAN DIALOG ========== */}
      {showScanDialog && currentBox && (
        <div className="fixed inset-0 z-[100] bg-black dark:bg-gray-950">
          <BoxScanDialog
            box={currentBox}
            onClose={resetScanner}
            onSave={handleScanCompleted}
            onScanCreated={handleScanCompleted}
            onShowDetails={() => {
              // GEÄNDERT: Bessere Lageplan-Erkennung
              const isFloorplan = currentBox.floor_plan_id && (currentBox.pos_x !== null && currentBox.pos_x !== undefined);
              if (isFloorplan) {
                // GEÄNDERT: Direkt zum Lageplan-Editor
                navigate(`/layouts/${currentBox.object_id}?fp=${currentBox.floor_plan_id}&openBox=${currentBox.id}`);
              } else {
                navigate(`/maps?object_id=${currentBox.object_id}&openBox=${currentBox.id}&flyTo=true`);
              }
            }}
          />
        </div>
      )}

      {/* ========== ERSTEINRICHTUNG ========== */}
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

      {/* ========== PLATZIERUNGSAUSWAHL ========== */}
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
                className="w-full bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-300 dark:border-white/10 hover:border-green-500 dark:hover:border-green-500/50 rounded-xl p-5 text-left"
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
                  className="w-full bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-300 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-500/50 rounded-xl p-5 text-left"
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
            {/* Kamera-Wechsel nur bei mehreren Rückkameras */}
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
            {scannedCode && (
              <p className="text-xs text-gray-500 mt-2 font-mono">Code: {scannedCode}</p>
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