/* ============================================================
   TRAPMAP - QR SCANNER V2
   
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

// BoxScanDialog importieren
import BoxScanDialog from "../../components/BoxScanDialog";

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

  // View States
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [showPlacementChoice, setShowPlacementChoice] = useState(false);
  const [showGPSWarning, setShowGPSWarning] = useState(false);
  
  // GPS State
  const [currentGPS, setCurrentGPS] = useState(null);
  const [gpsDistance, setGpsDistance] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Platzierungsauswahl State
  const [pendingPlacement, setPendingPlacement] = useState(null);
  const [objectFloorplans, setObjectFloorplans] = useState([]);

  // Success Toast
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();
  const { token } = useAuth();

  // ============================================
  // SCANNER INIT
  // ============================================
  useEffect(() => {
    initScanner();
    return () => stopScanner();
  }, []);

  const initScanner = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Kamera wird von diesem Browser nicht unterstützt");
        setPermissionState("unsupported");
        return;
      }

      const devices = await Html5Qrcode.getCameras();
      
      if (!devices || devices.length === 0) {
        setError("Keine Kamera gefunden");
        setPermissionState("unsupported");
        return;
      }

      setCameras(devices);

      // Back-Kamera bevorzugen
      let selectedCamera = devices[0];
      const backCamera = devices.find(d => 
        d.label.toLowerCase().includes("back") ||
        d.label.toLowerCase().includes("rear") ||
        d.label.toLowerCase().includes("rück") ||
        d.label.toLowerCase().includes("environment")
      );
      
      if (backCamera) {
        selectedCamera = backCamera;
      } else if (devices.length > 1) {
        selectedCamera = devices[devices.length - 1];
      }

      setCurrentCamera(selectedCamera);
      setPermissionState("granted");
      
      await startScanner(selectedCamera.id);

    } catch (err) {
      console.error("Scanner init error:", err);
      
      if (err.name === "NotAllowedError" || err.message?.includes("Permission")) {
        setError("Kamera-Zugriff verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.");
        setPermissionState("denied");
      } else {
        setError(`Kamera-Fehler: ${err.message || err}`);
        setPermissionState("denied");
      }
    }
  };

  const startScanner = async (cameraId) => {
    try {
      if (html5QrCodeRef.current && isScanning) {
        await html5QrCodeRef.current.stop();
      }

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

      await html5QrCodeRef.current.start(
        cameraId,
        config,
        onScanSuccess,
        onScanFailure
      );

      setIsScanning(true);
      setError("");

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

  const stopScanner = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.error("Stop scanner error:", e);
      }
    }
    setIsScanning(false);
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
  // ============================================
  const onScanSuccess = async (decodedText, decodedResult) => {
    if (!decodedText || scannedCode === decodedText) return;

    // Vibration Feedback
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    setScannedCode(decodedText);
    await stopScanner();

    // URL-Format prüfen
    let code = decodedText;
    if (decodedText.includes("trap-map.de/s/")) {
      code = decodedText.split("/s/")[1];
    }

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
      const res = await axios.get(`${API}/qr/check/${code}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Code nicht in DB → Zur Registrierung
      if (!res.data || !res.data.box_id) {
        navigate(`/qr/assign/${code}`);
        return;
      }

      const boxData = res.data.boxes || res.data;
      const boxId = res.data.box_id;
      const objectId = boxData?.object_id;
      const positionType = boxData?.position_type;
      const floorPlanId = boxData?.floor_plan_id;
      const hasGPS = boxData?.lat && boxData?.lng;
      const hasFloorplanPosition = floorPlanId && boxData?.pos_x !== null && boxData?.pos_y !== null;

      // Box-Daten speichern
      setCurrentBox({
        ...boxData,
        id: boxId,
        code: code
      });

      // ============================================
      // FALL 1: Pool (nicht zugewiesen)
      // ============================================
      if (!objectId) {
        setBoxLoading(false);
        navigate(`/qr/assign-object/${code}?box_id=${boxId}`);
        return;
      }

      // ============================================
      // FALL 2: Auf LAGEPLAN platziert
      // → BoxScanDialog öffnen (kein GPS-Check)
      // ============================================
      if (positionType === 'floorplan' && hasFloorplanPosition) {
        setBoxLoading(false);
        setShowScanDialog(true);
        return;
      }

      // ============================================
      // FALL 3: Mit GPS platziert
      // → GPS-Distanz prüfen, dann BoxScanDialog
      // ============================================
      if ((positionType === 'gps' || positionType === 'map') && hasGPS) {
        await checkGPSDistance(boxData);
        return;
      }

      // ============================================
      // FALL 4: Zugewiesen aber NICHT platziert
      // → Platzierungsauswahl
      // ============================================
      await showPlacementOptions(boxId, objectId, boxData, code);

    } catch (err) {
      console.error("QR check error:", err);
      setError("Fehler beim Prüfen des QR-Codes");
      setBoxLoading(false);
      resetScanner();
    }
  };

  // ============================================
  // GPS-DISTANZ PRÜFEN
  // ============================================
  const checkGPSDistance = async (boxData) => {
    setGpsLoading(true);
    
    try {
      const currentPos = await getCurrentPosition();
      setCurrentGPS(currentPos);

      const distance = calculateDistance(
        currentPos.lat, currentPos.lng,
        parseFloat(boxData.lat), parseFloat(boxData.lng)
      );

      setGpsDistance(Math.round(distance));
      setBoxLoading(false);
      setGpsLoading(false);

      // Wenn > 10m Abweichung → Warnung zeigen
      if (distance > 10) {
        setShowGPSWarning(true);
      } else {
        // Alles OK → BoxScanDialog öffnen
        setShowScanDialog(true);
      }

    } catch (err) {
      console.error("GPS error:", err);
      // GPS-Fehler → Trotzdem BoxScanDialog öffnen
      setBoxLoading(false);
      setGpsLoading(false);
      setShowScanDialog(true);
    }
  };

  // ============================================
  // PLATZIERUNGSOPTIONEN LADEN
  // ============================================
  const showPlacementOptions = async (boxId, objectId, boxData, code) => {
    try {
      // Lagepläne des Objekts laden
      const floorplanRes = await axios.get(`${API}/floorplans/object/${objectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const floorplans = floorplanRes.data || [];
      
      setObjectFloorplans(floorplans);
      setPendingPlacement({
        boxId,
        objectId,
        boxData,
        code
      });
      setBoxLoading(false);
      setShowPlacementChoice(true);

    } catch (err) {
      console.error("Floorplan load error:", err);
      setObjectFloorplans([]);
      setPendingPlacement({
        boxId,
        objectId,
        boxData,
        code
      });
      setBoxLoading(false);
      setShowPlacementChoice(true);
    }
  };

  // ============================================
  // HANDLER
  // ============================================
  
  // GPS-Position aktualisieren
  const handleUpdateGPSPosition = async () => {
    if (!currentBox || !currentGPS) return;

    setGpsLoading(true);

    try {
      await axios.put(`${API}/boxes/${currentBox.id}/position`, {
        lat: currentGPS.lat,
        lng: currentGPS.lng
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Position aktualisiert → BoxScanDialog öffnen
      setCurrentBox(prev => ({
        ...prev,
        lat: currentGPS.lat,
        lng: currentGPS.lng
      }));
      
      setShowGPSWarning(false);
      setGpsLoading(false);
      setShowScanDialog(true);

    } catch (err) {
      console.error("Update GPS error:", err);
      setError("Position konnte nicht aktualisiert werden");
      setGpsLoading(false);
    }
  };

  // Trotzdem kontrollieren (ohne Position-Update)
  const handleIgnoreGPSWarning = () => {
    setShowGPSWarning(false);
    setShowScanDialog(true);
  };

  // Platzierungsauswahl: GPS
  const handleChooseGPS = () => {
    if (!pendingPlacement) return;
    navigate(`/maps?object_id=${pendingPlacement.objectId}&openBox=${pendingPlacement.boxId}&firstSetup=true`);
  };

  // Platzierungsauswahl: Lageplan
  const handleChooseFloorplan = () => {
    if (!pendingPlacement) return;
    
    if (objectFloorplans.length === 1) {
      // Nur 1 Lageplan → direkt dahin
      navigate(`/objects/${pendingPlacement.objectId}?tab=floorplan&openBox=${pendingPlacement.boxId}&place=true`);
    } else {
      // Mehrere Lagepläne → User muss wählen (in ObjectDetail)
      navigate(`/objects/${pendingPlacement.objectId}?tab=floorplan&openBox=${pendingPlacement.boxId}&place=true`);
    }
  };

  // Scan abgeschlossen → Scanner wieder aktivieren
  const handleScanCompleted = () => {
    setShowScanDialog(false);
    showSuccessToast("✓ Kontrolle gespeichert");
    resetScanner();
  };

  // ScanDialog schließen ohne Speichern
  const handleScanDialogClose = () => {
    setShowScanDialog(false);
    resetScanner();
  };

  // Success Toast anzeigen
  const showSuccessToast = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  };

  // Scanner zurücksetzen und neu starten
  const resetScanner = async () => {
    setScannedCode(null);
    setCurrentBox(null);
    setGpsDistance(0);
    setCurrentGPS(null);
    setShowGPSWarning(false);
    setShowPlacementChoice(false);
    setPendingPlacement(null);
    setError("");
    
    if (currentCamera) {
      await startScanner(currentCamera.id);
    }
  };

  // Kamera wechseln
  const switchCamera = async () => {
    if (cameras.length < 2) return;
    
    const currentIndex = cameras.findIndex(c => c.id === currentCamera?.id);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    
    setCurrentCamera(nextCamera);
    await startScanner(nextCamera.id);
  };

  // Taschenlampe toggle
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
  // RENDER: GPS WARNUNG
  // ============================================
  if (showGPSWarning && currentBox) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
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
                  Du bist <strong>{gpsDistance}m</strong> von der gespeicherten Position entfernt.
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
                <p className="font-semibold">Box #{currentBox.number || currentBox.display_number || currentBox.id}</p>
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
              <li>• GPS-Ungenauigkeit (Gebäude, Wetter)</li>
              <li>• Falsche Box gescannt</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4">
            <button
              onClick={handleUpdateGPSPosition}
              disabled={gpsLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl p-4 flex items-center justify-center gap-3 font-semibold transition-all"
            >
              {gpsLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <MapPin size={20} />
              )}
              Position aktualisieren
            </button>

            <button
              onClick={handleIgnoreGPSWarning}
              className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-white/10 text-white rounded-xl p-4 flex items-center justify-center gap-3 transition-all"
            >
              <ArrowRight size={20} />
              Trotzdem kontrollieren
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: PLATZIERUNGSAUSWAHL
  // ============================================
  if (showPlacementChoice && pendingPlacement) {
    const hasFloorplans = objectFloorplans.length > 0;

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#111] border-b border-white/10">
          <button onClick={resetScanner} className="p-2 text-gray-400 hover:text-white">
            <X size={24} />
          </button>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Package size={20} />
            Box platzieren
          </h1>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Info */}
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-500/30 rounded-lg flex items-center justify-center">
                <Package size={20} className="text-indigo-400" />
              </div>
              <div>
                <p className="font-semibold">Box #{pendingPlacement.boxData?.number || pendingPlacement.boxId}</p>
                <p className="text-sm text-gray-400">{pendingPlacement.code}</p>
              </div>
            </div>
            <p className="text-indigo-300 text-sm">
              Diese Box ist zugewiesen, aber noch nicht platziert. Wo soll sie positioniert werden?
            </p>
          </div>

          {/* Auswahl */}
          <div className="space-y-3">
            {/* GPS Option */}
            <button
              onClick={handleChooseGPS}
              className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-white/10 hover:border-green-500/50 rounded-xl p-5 text-left transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Navigation size={28} className="text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-white">GPS-Karte</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Auf der Karte platzieren mit GPS-Koordinaten.
                    Ideal für Außenbereiche.
                  </p>
                </div>
              </div>
            </button>

            {/* Lageplan Option */}
            {hasFloorplans ? (
              <button
                onClick={handleChooseFloorplan}
                className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-white/10 hover:border-blue-500/50 rounded-xl p-5 text-left transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Layers size={28} className="text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-white">Lageplan</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Auf einem Gebäudeplan platzieren mit Grid-Position.
                      Ideal für Innenbereiche.
                    </p>
                    <p className="text-xs text-blue-400 mt-2">
                      {objectFloorplans.length} Lageplan{objectFloorplans.length > 1 ? 'e' : ''} verfügbar
                    </p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="w-full bg-[#111] border border-white/5 rounded-xl p-5 opacity-50">
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
    );
  }

  // ============================================
  // RENDER: BOX SCAN DIALOG
  // ============================================
  if (showScanDialog && currentBox) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <BoxScanDialog
          box={currentBox}
          onClose={handleScanDialogClose}
          onSave={handleScanCompleted}
          onScanCreated={handleScanCompleted}
          // Für Details-Button
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
    );
  }

  // ============================================
  // RENDER: SCANNER
  // ============================================
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle size={20} />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

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

      {/* Scanner */}
      <div className="relative">
        <div 
          id="qr-reader" 
          ref={scannerRef}
          className="w-full"
          style={{ 
            display: permissionState === "granted" && !boxLoading ? "block" : "none",
          }}
        />

        {/* Custom Overlay */}
        {isScanning && !scannedCode && !boxLoading && (
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
      {isScanning && !scannedCode && !error && !boxLoading && (
        <p className="text-center text-gray-500 text-sm py-4">
          Halte den QR-Code in den grünen Rahmen
        </p>
      )}

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