/* ============================================================
   TRAPMAP - QR SCANNER
   Mit html5-qrcode Library - schneller & zuverlässiger
   
   ROUTING LOGIK:
   1. Pool (kein object_id) → Objekt-Zuweisung
   2. Lageplan-Box → Object-Page mit Lageplan-Tab
   3. GPS-Box → Maps mit FlyTo
   4. Zugewiesen aber nicht platziert → Platzierungsauswahl (GPS/Lageplan)
   ============================================================ */

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { 
  Camera, X, RotateCcw, Flashlight, SwitchCamera,
  Map, Layers, Package, Building2, MapPin, Navigation
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function Scanner() {
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  
  const [error, setError] = useState("");
  const [scannedCode, setScannedCode] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionState, setPermissionState] = useState("checking");
  const [cameras, setCameras] = useState([]);
  const [currentCamera, setCurrentCamera] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // NEU: Platzierungsauswahl State
  const [showPlacementChoice, setShowPlacementChoice] = useState(false);
  const [pendingBox, setPendingBox] = useState(null);
  const [objectHasFloorplans, setObjectHasFloorplans] = useState(false);

  const navigate = useNavigate();
  const { token } = useAuth();

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

  const onScanSuccess = async (decodedText, decodedResult) => {
    if (!decodedText || scannedCode === decodedText) return;

    // Vibration Feedback
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    setScannedCode(decodedText);
    await stopScanner();

    // Prüfen ob es eine URL ist
    if (decodedText.includes("trap-map.de/s/")) {
      const code = decodedText.split("/s/")[1];
      if (code) {
        navigate(`/s/${code}`, { replace: true });
        return;
      }
    }

    // Normaler Code-Check
    await handleCodeCheck(decodedText);
  };

  const onScanFailure = (error) => {
    // Stille Fehler - kontinuierliches Scannen
  };

  // ============================================
  // HAUPTLOGIK: CODE PRÜFEN UND WEITERLEITEN
  // ============================================
  const handleCodeCheck = async (code) => {
    try {
      const res = await axios.get(`${API}/qr/check/${code}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Code nicht in DB
      if (!res.data || !res.data.box_id) {
        navigate(`/qr/assign/${code}`);
        return;
      }

      const boxData = res.data.boxes;
      const boxId = res.data.box_id;
      const objectId = boxData?.object_id;
      const positionType = boxData?.position_type;
      const floorPlanId = boxData?.floor_plan_id;
      const hasGPS = boxData?.lat && boxData?.lng;
      const hasFloorplanPosition = floorPlanId && boxData?.pos_x !== null && boxData?.pos_y !== null;

      // ============================================
      // FALL 1: Box im Pool (nicht zugewiesen)
      // → Objekt-Zuweisung
      // ============================================
      if (!objectId) {
        navigate(`/qr/assign-object/${code}?box_id=${boxId}`);
        return;
      }

      // ============================================
      // FALL 2: Box auf LAGEPLAN platziert
      // → Object-Seite mit Lageplan-Tab öffnen
      // ============================================
      if (positionType === 'floorplan' && hasFloorplanPosition) {
        navigate(`/objects/${objectId}?tab=floorplan&openBox=${boxId}`);
        return;
      }

      // ============================================
      // FALL 3: Box mit GPS platziert
      // → Maps mit FlyTo öffnen
      // ============================================
      if ((positionType === 'gps' || positionType === 'map') && hasGPS) {
        navigate(`/maps?object_id=${objectId}&openBox=${boxId}&flyTo=true`);
        return;
      }

      // ============================================
      // FALL 4: Zugewiesen aber NICHT platziert
      // → IMMER Platzierungsauswahl zeigen!
      // User entscheidet: GPS oder Lageplan
      // ============================================
      
      // Prüfen ob das Objekt Lagepläne hat (für UI-Hinweis)
      let floorplans = [];
      try {
        const floorplanRes = await axios.get(`${API}/floorplans/object/${objectId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        floorplans = floorplanRes.data || [];
      } catch (err) {
        console.error("Floorplan check error:", err);
      }
      
      // IMMER Auswahl zeigen - User entscheidet!
      setPendingBox({
        boxId,
        objectId,
        code,
        boxData,
        floorplans
      });
      setObjectHasFloorplans(floorplans.length > 0);
      setShowPlacementChoice(true);

    } catch (err) {
      console.error("QR check error:", err);
      setError("Fehler beim Prüfen des QR-Codes");
      setScannedCode(null);
      if (currentCamera) {
        await startScanner(currentCamera.id);
      }
    }
  };

  // ============================================
  // PLATZIERUNGSAUSWAHL HANDLER
  // ============================================
  const handleChooseGPS = () => {
    if (!pendingBox) return;
    navigate(`/maps?object_id=${pendingBox.objectId}&openBox=${pendingBox.boxId}&firstSetup=true`);
  };

  const handleChooseFloorplan = () => {
    if (!pendingBox) return;
    // Zum Objekt mit Lageplan-Tab, Box öffnen für Platzierung
    navigate(`/objects/${pendingBox.objectId}?tab=floorplan&openBox=${pendingBox.boxId}&place=true`);
  };

  const switchCamera = async () => {
    if (cameras.length < 2) return;
    
    const currentIndex = cameras.findIndex(c => c.id === currentCamera?.id);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    
    setCurrentCamera(nextCamera);
    await startScanner(nextCamera.id);
  };

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

  const retryScanner = async () => {
    setError("");
    setScannedCode(null);
    setPermissionState("checking");
    setShowPlacementChoice(false);
    setPendingBox(null);
    await initScanner();
  };

  // ============================================
  // RENDER: PLATZIERUNGSAUSWAHL
  // ============================================
  if (showPlacementChoice && pendingBox) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#111] border-b border-white/10">
          <button
            onClick={retryScanner}
            className="p-2 text-gray-400 hover:text-white"
          >
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
                <p className="font-semibold">Box #{pendingBox.boxData?.number || pendingBox.boxId}</p>
                <p className="text-sm text-gray-400">
                  {pendingBox.boxData?.qr_code || scannedCode}
                </p>
              </div>
            </div>
            <p className="text-indigo-300 text-sm">
              Diese Box ist zugewiesen, aber noch nicht platziert. Wo möchtest du sie positionieren?
            </p>
          </div>

          {/* Auswahl */}
          <div className="space-y-3">
            {/* GPS Option - immer verfügbar */}
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
                    Box auf der Karte platzieren mit GPS-Koordinaten. 
                    Ideal für Außenbereiche.
                  </p>
                </div>
              </div>
            </button>

            {/* Lageplan Option - nur wenn Pläne vorhanden */}
            {objectHasFloorplans ? (
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
                      Box auf einem Gebäudeplan platzieren mit Grid-Position.
                      Ideal für Innenbereiche.
                    </p>
                    {pendingBox.floorplans && (
                      <p className="text-xs text-blue-400 mt-2">
                        {pendingBox.floorplans.length} Lageplan{pendingBox.floorplans.length > 1 ? 'e' : ''} verfügbar
                      </p>
                    )}
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
                    <p className="text-xs text-gray-600 mt-2">
                      Lagepläne können in den Objekt-Einstellungen hochgeladen werden.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Zurück */}
          <button
            onClick={retryScanner}
            className="w-full py-3 text-gray-400 hover:text-white text-sm"
          >
            ← Anderen Code scannen
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: SCANNER
  // ============================================
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#111] border-b border-white/10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Camera size={20} />
          QR-Scanner
        </h1>
        <div className="flex gap-2">
          {cameras.length > 1 && (
            <button
              onClick={switchCamera}
              className="p-2 text-gray-400 hover:text-white"
              title="Kamera wechseln"
            >
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
            onClick={retryScanner}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Erneut versuchen
          </button>
        </div>
      )}

      {/* Loading */}
      {permissionState === "checking" && !error && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-4" />
          <p className="text-gray-400">Kamera wird aktiviert...</p>
        </div>
      )}

      {/* Scanner */}
      <div className="relative">
        <div 
          id="qr-reader" 
          ref={scannerRef}
          className="w-full"
          style={{ 
            display: permissionState === "granted" ? "block" : "none",
          }}
        />

        {/* Custom Overlay */}
        {isScanning && !scannedCode && (
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

      {/* Success */}
      {scannedCode && !showPlacementChoice && (
        <div className="m-4 p-4 bg-green-900/50 border border-green-500/50 rounded-xl">
          <p className="text-green-400 font-medium flex items-center gap-2">
            <span className="text-xl">✓</span>
            Code erkannt!
          </p>
          <p className="text-sm text-gray-300 mt-1 font-mono">{scannedCode}</p>
          <p className="text-sm text-gray-500 mt-2">Wird verarbeitet...</p>
        </div>
      )}

      {/* Hint */}
      {isScanning && !scannedCode && !error && (
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
        #qr-reader__dashboard {
          display: none !important;
        }
        #qr-reader__dashboard_section_csr {
          display: none !important;
        }
        #qr-reader__dashboard_section_swaplink {
          display: none !important;
        }
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
      `}</style>
    </div>
  );
}