/* ============================================================
   TRAPMAP - QR SCANNER V6
   
   KRITISCH: Scanner wird NIE gestoppt!
   - Scanner läuft kontinuierlich im Hintergrund
   - Dialoge werden als Overlays darüber angezeigt
   - Code-Blocking verhindert Mehrfach-Scans
   
   FEATURES:
   - Schnellkontrolle: BoxScanDialog direkt im Scanner
   - GPS-Distanz Check bei GPS-Boxen (>10m Warnung)
   - Platzierungsauswahl für nicht-platzierte Boxen
   - Nach Speichern → Scanner sofort wieder aktiv
   
   FLOW:
   1. Platziert (GPS/Lageplan) → BoxScanDialog → Speichern → Weiter scannen
   2. Zugewiesen, nicht platziert → Platzierungsauswahl
   3. Pool → Objekt-Zuweisung
   ============================================================ */

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { 
  Camera, X, RotateCcw, Flashlight, SwitchCamera,
  Package, Navigation, Layers, AlertTriangle,
  MapPin, CheckCircle, ArrowRight
} from "lucide-react";

// BoxScanDialog und BoxEditDialog importieren
import BoxScanDialog from "../../components/BoxScanDialog";
import BoxEditDialog from "../maps/BoxEditDialog";

const API = import.meta.env.VITE_API_URL;

// Distanz zwischen zwei GPS-Koordinaten berechnen (in Metern)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Erdradius in Metern
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

// Distanz formatieren: >500m in km, sonst in m
function formatDistance(meters) {
  if (meters >= 500) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)}m`;
}

export default function Scanner() {
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  
  // Scanner State
  const [error, setError] = useState("");
  const [scannedCode, setScannedCode] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionState, setPermissionState] = useState("checking");
  const [cameras, setCameras] = useState([]);
  const [currentCamera, setCurrentCamera] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // Box State
  const [currentBox, setCurrentBox] = useState(null);
  const [boxLoading, setBoxLoading] = useState(false);
  
  // KRITISCH: Refs für sofortige Updates (kein Re-Render nötig!)
  const isProcessingRef = useRef(false);
  const lastScannedCodeRef = useRef(null);
  const [blockedCode, setBlockedCode] = useState(null); // Für UI-Anzeige
  
  // Mobile Detection (einmal berechnen)
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);

  // View States
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [showPlacementChoice, setShowPlacementChoice] = useState(false);
  const [showGPSWarning, setShowGPSWarning] = useState(false);
  const [showFirstSetup, setShowFirstSetup] = useState(false);
  
  // GPS State
  const [currentGPS, setCurrentGPS] = useState(null);
  const [gpsDistance, setGpsDistance] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Platzierungsauswahl State
  const [pendingPlacement, setPendingPlacement] = useState(null);
  const [objectFloorplans, setObjectFloorplans] = useState([]);
  const [boxTypes, setBoxTypes] = useState([]);

  // Success Toast
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();
  const { token } = useAuth();

  // Helper: Prüfen ob ein Dialog aktiv ist
  const hasActiveDialog = showScanDialog || showGPSWarning || showPlacementChoice || showFirstSetup;

  // ============================================
  // SCANNER INIT
  // ============================================
  useEffect(() => {
    initScanner();
    
    return () => {
      // Cleanup nur beim Unmount
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().then(() => {
            html5QrCodeRef.current.clear();
          }).catch(() => {});
        } catch (e) {}
      }
    };
  }, []);

  const initScanner = async () => {
    setPermissionState("checking");
    setError("");

    try {
      // Prüfe ob bereits eine Instanz läuft
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (e) {}
      }

      const devices = await Html5Qrcode.getCameras();
      
      if (!devices || devices.length === 0) {
        setPermissionState("denied");
        setError("Keine Kamera gefunden. Bitte erlaube den Kamera-Zugriff.");
        return;
      }

      setCameras(devices);
      setPermissionState("granted");

      // Bevorzuge Rückkamera auf Mobile
      const backCamera = devices.find(d => 
        d.label.toLowerCase().includes("back") || 
        d.label.toLowerCase().includes("rück") ||
        d.label.toLowerCase().includes("environment")
      ) || devices[devices.length - 1];

      setCurrentCamera(backCamera);
      await startScanner(backCamera.id);

    } catch (err) {
      console.error("Camera init error:", err);
      setPermissionState("denied");
      
      if (err.name === "NotAllowedError") {
        setError("Kamera-Zugriff wurde verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.");
      } else {
        setError("Kamera konnte nicht gestartet werden: " + (err.message || err));
      }
    }
  };

  const startScanner = async (cameraId) => {
    try {
      // Falls Scanner-Instanz existiert und läuft, erst stoppen
      if (html5QrCodeRef.current) {
        try {
          const state = html5QrCodeRef.current.getState();
          if (state === 2) { // SCANNING
            await html5QrCodeRef.current.stop();
          }
        } catch (e) {}
      }

      // Neue Instanz erstellen
      html5QrCodeRef.current = new Html5Qrcode("qr-reader");

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      console.log("🎥 Starting scanner with camera:", cameraId);
      
      await html5QrCodeRef.current.start(
        cameraId,
        config,
        onScanSuccess,
        onScanFailure
      );

      setIsScanning(true);
      setError("");
      console.log("✅ Scanner gestartet");

      // Torch-Fähigkeit prüfen
      try {
        const capabilities = html5QrCodeRef.current.getRunningTrackCapabilities();
        setTorchSupported(capabilities?.torch === true);
      } catch (e) {
        setTorchSupported(false);
      }

    } catch (err) {
      console.error("Scanner start error:", err);
      setError("Scanner konnte nicht gestartet werden: " + (err.message || err));
    }
  };

  // Stopp-Helper: stoppt html5-qrcode, clear() und alle lingering video tracks
  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current) {
        try {
          const state = html5QrCodeRef.current.getState();
          if (state === 2) {
            await html5QrCodeRef.current.stop();
            console.log('⏹️ html5QrCode stopped');
          }
        } catch (e) {
          console.warn('stopScanner: error stopping instance', e?.message || e);
        }

        try {
          html5QrCodeRef.current.clear();
        } catch (e) { /* ignore */ }
        html5QrCodeRef.current = null;
      }

      // Stop any remaining video tracks on the page (best-effort)
      try {
        const vids = document.querySelectorAll('#qr-reader video');
        vids.forEach(v => {
          try {
            const s = v.srcObject;
            if (s && typeof s.getTracks === 'function') {
              s.getTracks().forEach(t => {
                try { t.stop(); console.log('🛑 stopped track', t.kind, t.id); } catch (e) {}
              });
            }
            try { v.srcObject = null; } catch (e) {}
          } catch (e) { /* ignore per video */ }
        });
      } catch (e) {
        console.warn('stopScanner: error stopping tracks', e?.message || e);
      }

      setIsScanning(false);
    } catch (err) {
      console.error('stopScanner general error:', err);
    }
  };

  // ============================================
  // GPS POSITION HOLEN
  // ============================================
  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation nicht unterstützt"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  // ============================================
  // SCAN SUCCESS - HAUPTLOGIK
  // Scanner läuft IMMER weiter!
  // ============================================
  const onScanSuccess = async (decodedText, decodedResult) => {
    // SOFORT prüfen mit Ref (kein Re-Render nötig!)
    if (!decodedText || isProcessingRef.current) return;
    
    // URL-Format prüfen und Code extrahieren
    let code = decodedText;
    if (decodedText.includes("trap-map.de/s/")) {
      code = decodedText.split("/s/")[1];
    }
    
    // Gleicher Code wie letzter? IGNORIEREN!
    if (code === lastScannedCodeRef.current) {
      return;
    }
    
    // NEUER CODE! Lock setzen SOFORT mit Ref
    isProcessingRef.current = true;
    lastScannedCodeRef.current = code;
    setBlockedCode(code);
    setScannedCode(decodedText);
    
    console.log(`📱 Neuer Scan: ${code} (isMobile: ${isMobile})`);

    // Vibration Feedback
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    // WICHTIG: Scanner NICHT stoppen! Er läuft weiter im Hintergrund.
    await handleCodeCheck(code);
  };

  const onScanFailure = (error) => {
    // Stille Fehler - kontinuierliches Scannen
  };

  // ============================================
  // CODE PRÜFEN UND ROUTING
  // ============================================
  const handleCodeCheck = async (code) => {
    setBoxLoading(true);
    setError("");

    try {
      console.log(`🔍 Prüfe Code: ${code}`);
      const res = await axios.get(`${API}/qr/check/${code}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("📦 API Response:", JSON.stringify(res.data, null, 2));

      // Code nicht in DB → Zur Registrierung
      if (!res.data || !res.data.box_id) {
        navigate(`/qr/assign-code?code=${code}`);
        return;
      }

      // Box im Pool (kein Objekt zugewiesen) → Objekt-Zuweisung
      if (!res.data.object_id) {
        navigate(`/qr/assign-object?code=${code}&boxId=${res.data.box_id}`);
        return;
      }

      // Box mit Objekt gefunden - Daten aufbereiten
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

      // Position-Check: Hat die Box eine Position?
      const positionType = boxData.position_type;
      const hasGPS = boxData.lat && boxData.lng;
      const hasFloorplanPosition = boxData.floor_plan_id && (boxData.pos_x || boxData.grid_position);
      
      // GPS-Box erkennen (auch ohne position_type)
      const isGPSBox = (positionType === 'gps' || positionType === 'map') || 
                       (hasGPS && !hasFloorplanPosition);
      
      const isPlaced = hasGPS || hasFloorplanPosition;
      
      console.log(`📊 Box-Status: positionType=${positionType}, hasGPS=${hasGPS}, hasFloorplan=${hasFloorplanPosition}, isPlaced=${isPlaced}`);

      // CASE 1: Box ist NICHT platziert → Platzierungsauswahl
      if (!isPlaced) {
        console.log("📍 Box nicht platziert → Platzierungsauswahl");
        await loadPlacementData(boxData);
        return;
      }

      // CASE 2: GPS-Box auf Mobile → Distanz prüfen
      if (isGPSBox && hasGPS && isMobile) {
        console.log("📍 GPS-Box erkannt, starte Distanz-Check...");
        await checkGPSDistance(boxData);
        return;
      }

      // CASE 3: Direkt zum Scan-Dialog
      console.log("✅ Direkt zum BoxScanDialog");
      setBoxLoading(false);
      await stopScanner();
      setShowScanDialog(true);

    } catch (err) {
      console.error("Code check error:", err);
      setError("Fehler beim Laden: " + (err.response?.data?.message || err.message));
      setBoxLoading(false);
      isProcessingRef.current = false;
    }
  };

  // ============================================
  // GPS DISTANZ PRÜFEN
  // ============================================
  const checkGPSDistance = async (boxData) => {
    try {
      console.log("📍 Hole aktuelle GPS-Position...");
      const currentPos = await getCurrentPosition();
      setCurrentGPS(currentPos);

      const distance = calculateDistance(
        currentPos.lat, currentPos.lng,
        boxData.lat, boxData.lng
      );
      
      console.log(`📍 Berechnete Distanz: ${Math.round(distance)}m`);
      setGpsDistance(distance);
      setBoxLoading(false);

      // >10m Abweichung → Warnung anzeigen
      if (distance > 10) {
        console.log("⚠️ Distanz > 10m → GPS-Warnung");
        await stopScanner();
        setShowGPSWarning(true);
      } else {
        console.log("✅ Distanz OK → BoxScanDialog");
        await stopScanner();
        setShowScanDialog(true);
      }

    } catch (err) {
      console.error("GPS error:", err);
      // Bei GPS-Fehler trotzdem zum Dialog
      setBoxLoading(false);
      await stopScanner();
      setShowScanDialog(true);
    }
  };

  // ============================================
  // PLATZIERUNGSDATEN LADEN
  // ============================================
  const loadPlacementData = async (boxData) => {
    try {
      // Lagepläne für das Objekt laden
      const fpRes = await axios.get(`${API}/floorplans/object/${boxData.object_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setObjectFloorplans(fpRes.data || []);
      console.log(`📋 ${fpRes.data?.length || 0} Lagepläne gefunden`);

      // Box-Typen laden (für Ersteinrichtung)
      const btRes = await axios.get(`${API}/box-types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBoxTypes(btRes.data || []);

    } catch (err) {
      console.error("Load placement data error:", err);
      setObjectFloorplans([]);
    }

    setPendingPlacement({
      code: boxData.qr_code,
      boxId: boxData.id,
      objectId: boxData.object_id
    });
    setBoxLoading(false);
    await stopScanner();
    setShowPlacementChoice(true);
  };

  // ============================================
  // DIALOG SCHLIESSEN - Scanner läuft weiter!
  // ============================================
  const resetScanner = async () => {
    console.log("🔄 resetScanner - Dialoge schließen");
    console.log(`🔒 Code "${lastScannedCodeRef.current}" wird freigegeben`);

    // States zurücksetzen
    setScannedCode(null);
    setCurrentBox(null);
    setGpsDistance(0);
    setCurrentGPS(null);
    setShowGPSWarning(false);
    setShowPlacementChoice(false);
    setShowScanDialog(false);
    setShowFirstSetup(false);
    setPendingPlacement(null);
    setError("");

    // Lock aufheben
    isProcessingRef.current = false;

    // Letzten Code freigeben (wichtig damit direkt weitergescannt werden kann)
    lastScannedCodeRef.current = null;
    setBlockedCode(null);

    // Vollständig stoppen (clear tracks), dann neu starten
    try {
      await stopScanner();
      // Kleiner Delay damit Kamera freigegeben wird
      await new Promise(r => setTimeout(r, 300));
      if (currentCamera) {
        await startScanner(currentCamera.id);
      } else {
        await initScanner();
      }
    } catch (e) {
      console.error('resetScanner restart error:', e);
    }
  };

  // Code entsperren (für UI-Button)
  const unlockLastCode = () => {
    console.log("🔓 Code entsperrt");
    lastScannedCodeRef.current = null;
    setBlockedCode(null);
  };

  // ============================================
  // HANDLER: SCAN DIALOG
  // ============================================
  const handleScanDialogClose = () => {
    console.log("❌ BoxScanDialog geschlossen");
    resetScanner();
  };

  const handleScanCompleted = () => {
    console.log("✅ handleScanCompleted - Kontrolle gespeichert");
    setSuccessMessage("Kontrolle gespeichert!");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
    resetScanner();
  };

  // ============================================
  // HANDLER: GPS WARNING
  // ============================================
  const handleIgnoreGPSWarning = async () => {
    console.log("📍 GPS-Warnung ignoriert → BoxScanDialog");
    setShowGPSWarning(false);
    await stopScanner();
    setShowScanDialog(true);
  };

  const handleUpdateGPSPosition = async () => {
    if (!currentGPS || !currentBox) return;
    
    setGpsLoading(true);
    console.log("📍 Aktualisiere GPS-Position...", currentGPS);
    
    try {
      // Versuche PUT /boxes/:id/position
      await axios.put(`${API}/boxes/${currentBox.id}/position`, {
        lat: currentGPS.lat,
        lng: currentGPS.lng,
        position_type: 'gps'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("✅ GPS-Position aktualisiert");
      
      // Box-Daten aktualisieren
      setCurrentBox(prev => ({
        ...prev,
        lat: currentGPS.lat,
        lng: currentGPS.lng,
        position_type: 'gps'
      }));
      
      setGpsLoading(false);
      setShowGPSWarning(false);
      await stopScanner();
      setShowScanDialog(true);

    } catch (err) {
      console.error("GPS update error:", err);
      setGpsLoading(false);
      // Bei Fehler trotzdem zum Dialog
      setShowGPSWarning(false);
      await stopScanner();
      setShowScanDialog(true);
    }
  };

  // ============================================
  // HANDLER: PLATZIERUNGSAUSWAHL
  // ============================================
  const handleChooseGPS = async () => {
    if (!pendingPlacement) return;
    
    // Desktop → Zur Karte navigieren
    if (!isMobile) {
      navigate(`/maps?object_id=${pendingPlacement.objectId}&placeBox=${pendingPlacement.boxId}`);
      return;
    }

    // Mobile → GPS-Position automatisch setzen
    setGpsLoading(true);
    console.log("📍 Mobile: Setze GPS-Position...");
    
    try {
      const position = await getCurrentPosition();
      console.log("📍 GPS-Position erhalten:", position);
      
      await axios.put(`${API}/boxes/${pendingPlacement.boxId}/position`, {
        lat: position.lat,
        lng: position.lng,
        position_type: 'gps'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("✅ Box platziert, öffne Ersteinrichtung");
      
      // Box-Daten aktualisieren
      setCurrentBox(prev => ({
        ...prev,
        lat: position.lat,
        lng: position.lng,
        position_type: 'gps'
      }));
      
      setGpsLoading(false);
      setShowPlacementChoice(false);
      await stopScanner();
      setShowFirstSetup(true);

    } catch (err) {
      console.error("GPS placement error:", err);
      setGpsLoading(false);
      setError("GPS-Position konnte nicht ermittelt werden: " + err.message);
    }
  };

  const handleChooseFloorplan = () => {
    if (!pendingPlacement) return;
    
    // Navigiere zum Lageplan
    if (objectFloorplans.length === 1) {
      navigate(`/objects/${pendingPlacement.objectId}?tab=floorplan&fp=${objectFloorplans[0].id}&placeBox=${pendingPlacement.boxId}`);
    } else {
      navigate(`/objects/${pendingPlacement.objectId}?tab=floorplan&placeBox=${pendingPlacement.boxId}`);
    }
  };

  // ============================================
  // HANDLER: ERSTEINRICHTUNG
  // ============================================
  const handleFirstSetupClose = () => {
    console.log("❌ Ersteinrichtung abgebrochen");
    resetScanner();
  };

  const handleFirstSetupCompleted = () => {
    console.log("✅ Ersteinrichtung abgeschlossen");
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
    
    const currentIndex = cameras.findIndex(c => c.id === currentCamera?.id);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    
    setCurrentCamera(nextCamera);
    await startScanner(nextCamera.id);
  };

  // ============================================
  // TASCHENLAMPE
  // ============================================
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !torchSupported) return;
    
    try {
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: !torchOn }]
      });
      setTorchOn(!torchOn);
    } catch (e) {
      console.error("Torch toggle error:", e);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle size={20} />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* ========================================
          OVERLAY: GPS WARNUNG
          ======================================== */}
      {showGPSWarning && currentBox && (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a] text-white overflow-auto">
          {/* Header */}
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

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Warning Box */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={24} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-300">Position stimmt nicht überein</h3>
                  <p className="text-yellow-200/80 text-sm mt-1">
                    Du bist <strong>{formatDistance(gpsDistance)}</strong> von der gespeicherten Position entfernt.
                  </p>
                </div>
              </div>
            </div>

            {/* Box Info */}
            <div className="bg-[#111] border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                  <Package size={24} className="text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold">Box #{currentBox.display_number || currentBox.number || currentBox.id}</p>
                  <p className="text-sm text-gray-400">{currentBox.qr_code || currentBox.code}</p>
                </div>
              </div>
              
              {currentBox.grid_position && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <MapPin size={14} />
                  <span>Position: {currentBox.grid_position}</span>
                </div>
              )}
            </div>

            {/* Gründe */}
            <div className="bg-[#111] border border-white/10 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-2">Mögliche Gründe:</p>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Box wurde verschoben</li>
                <li>• GPS-Signal ungenau</li>
                <li>• Ursprüngliche Position war falsch</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleUpdateGPSPosition}
                disabled={gpsLoading}
                className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
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
                className="flex-1 py-4 bg-[#222] hover:bg-[#333] border border-white/10 rounded-xl font-semibold transition-colors"
              >
                Trotzdem kontrollieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          OVERLAY: PLATZIERUNGSAUSWAHL
          ======================================== */}
      {showPlacementChoice && pendingPlacement && (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a] text-white overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-[#111] border-b border-white/10">
            <button onClick={resetScanner} className="p-2 text-gray-400 hover:text-white">
              <X size={24} />
            </button>
            <h1 className="text-lg font-semibold">Box platzieren</h1>
            <div className="w-10" />
          </div>

          <div className="p-4 space-y-4">
            {/* Info */}
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Package size={24} className="text-indigo-400" />
                <div>
                  <p className="font-semibold">{pendingPlacement.code}</p>
                  <p className="text-indigo-300 text-sm">
                    Diese Box ist zugewiesen, aber noch nicht platziert. Wo soll sie positioniert werden?
                  </p>
                </div>
              </div>
            </div>

            {/* Auswahl */}
            <div className="space-y-3">
              {/* GPS Option */}
              <button
                onClick={handleChooseGPS}
                disabled={gpsLoading}
                className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-white/10 hover:border-green-500/50 rounded-xl p-5 text-left transition-all disabled:opacity-70"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    {gpsLoading ? (
                      <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Navigation size={28} className="text-green-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-white">
                      {gpsLoading 
                        ? "GPS wird ermittelt..." 
                        : isMobile 
                          ? "GPS-Position" 
                          : "Karte öffnen"
                      }
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {gpsLoading 
                        ? "Box wird an deiner aktuellen Position platziert"
                        : isMobile
                          ? "Automatisch an deiner aktuellen GPS-Position platzieren"
                          : "Zur Karte navigieren und Position manuell wählen"
                      }
                    </p>
                  </div>
                </div>
              </button>

              {/* Lageplan Option */}
              {objectFloorplans.length > 0 ? (
                <button
                  onClick={handleChooseFloorplan}
                  className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-white/10 hover:border-blue-500/50 rounded-xl p-5 text-left transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Layers size={28} className="text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-white">Auf Lageplan platzieren</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {objectFloorplans.length} Lageplan{objectFloorplans.length > 1 ? "e" : ""} verfügbar
                      </p>
                    </div>
                    <ArrowRight size={20} className="text-gray-400" />
                  </div>
                </button>
              ) : (
                <div className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl p-5 opacity-50">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Layers size={28} className="text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-400">Lageplan</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Kein Lageplan für dieses Objekt vorhanden.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Zurück */}
            <button
              onClick={resetScanner}
              className="w-full py-3 text-gray-400 hover:text-white text-sm"
            >
              ← Anderen Code scannen
            </button>
          </div>
        </div>
      )}

      {/* ========================================
          OVERLAY: BOX SCAN DIALOG
          ======================================== */}
      {showScanDialog && currentBox && (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a]">
          <BoxScanDialog
            box={currentBox}
            onClose={handleScanDialogClose}
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

      {/* ========================================
          OVERLAY: ERSTEINRICHTUNG (BoxEditDialog)
          ======================================== */}
      {showFirstSetup && currentBox && (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a]">
          <BoxEditDialog
            box={currentBox}
            boxTypes={boxTypes}
            isFirstSetup={true}
            onClose={handleFirstSetupClose}
            onSave={handleFirstSetupCompleted}
          />
        </div>
      )}

      {/* ========================================
          SCANNER - IMMER IM DOM!
          Nur visibility:hidden wenn Dialog offen
          ======================================== */}
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
              <button onClick={switchCamera} className="p-2 text-gray-400 hover:text-white" title="Kamera wechseln">
                <SwitchCamera size={20} />
              </button>
            )}
            {torchSupported && (
              <button
                onClick={toggleTorch}
                className={`p-2 ${torchOn ? "text-yellow-400" : "text-gray-400"} hover:text-white`}
                title="Taschenlampe"
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
            {permissionState === "denied" && (
              <div className="text-sm text-gray-400 space-y-2">
                <p>So aktivierst du die Kamera:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Tippe auf das 🔒 in der Adressleiste</li>
                  <li>Wähle "Website-Einstellungen"</li>
                  <li>Erlaube "Kamera"</li>
                </ul>
              </div>
            )}
            <button
              onClick={initScanner}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2"
            >
              <RotateCcw size={16} />
              Erneut versuchen
            </button>
          </div>
        )}

        {/* Loading */}
        {(permissionState === "checking" || boxLoading) && !error && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-4" />
            <p className="text-gray-400">
              {boxLoading ? "Box wird geladen..." : "Kamera wird aktiviert..."}
            </p>
          </div>
        )}

        {/* Scanner Container - IMMER IM DOM! */}
        <div className="relative">
          <div 
            id="qr-reader" 
            ref={scannerRef}
            className="w-full"
            style={{ 
              display: permissionState === "granted" && !boxLoading ? "block" : "none",
            }}
          />
          
          {/* Hinweis: Letzter Code ist geblockt */}
          {permissionState === "granted" && isScanning && blockedCode && !hasActiveDialog && (
            <div className="absolute bottom-4 left-4 right-4 bg-yellow-900/90 border border-yellow-600/50 rounded-xl p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0" />
                  <p className="text-yellow-200 text-sm truncate">
                    <strong>{blockedCode}</strong> wird ignoriert
                  </p>
                </div>
                <button
                  onClick={unlockLastCode}
                  className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-medium rounded-lg flex-shrink-0 transition-colors"
                >
                  Entsperren
                </button>
              </div>
            </div>
          )}

          {/* Custom Overlay */}
          {isScanning && !scannedCode && !boxLoading && !hasActiveDialog && (
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
        {isScanning && !scannedCode && !error && !boxLoading && !hasActiveDialog && (
          <p className="text-center text-gray-500 text-sm py-4">
            Halte den QR-Code in den grünen Rahmen
          </p>
        )}
      </div>

      {/* Styles */}
      <style>{`
        #qr-reader {
          border: none !important;
          background: #0a0a0a !important;
        }
        #qr-reader video {
          border-radius: 0 !important;
        }
        #qr-reader__scan_region {
          background: transparent !important;
        }
        #qr-reader__dashboard,
        #qr-reader__dashboard_section_csr,
        #qr-reader__dashboard_section_swaplink,
        #qr-reader__header_message {
          display: none !important;
        }
        @keyframes scan {
          0%, 100% { top: 0; opacity: 0; }
          50% { top: calc(100% - 2px); opacity: 1; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}