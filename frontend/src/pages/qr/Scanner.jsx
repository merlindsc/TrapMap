/* ============================================================
   TRAPMAP - QR SCANNER
   Mit html5-qrcode Library - schneller & zuverlässiger
   ============================================================ */

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { Camera, X, RotateCcw, Flashlight, SwitchCamera } from "lucide-react";

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

  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    initScanner();
    return () => stopScanner();
  }, []);

  const initScanner = async () => {
    try {
      // Kamera-Berechtigung prüfen
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Kamera wird von diesem Browser nicht unterstützt");
        setPermissionState("unsupported");
        return;
      }

      // Verfügbare Kameras auflisten
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
      // Alten Scanner stoppen falls vorhanden
      if (html5QrCodeRef.current && isScanning) {
        await html5QrCodeRef.current.stop();
      }

      // Neuen Scanner erstellen
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

      // Prüfen ob Taschenlampe unterstützt wird
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
      // Direkt zur URL navigieren
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

  const handleCodeCheck = async (code) => {
    try {
      const res = await axios.get(`${API}/qr/check/${code}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.data || !res.data.box_id) {
        navigate(`/qr/assign/${code}`);
        return;
      }

      const boxData = res.data.boxes;
      const boxId = res.data.box_id;
      const objectId = boxData?.object_id;
      const hasPosition = boxData?.lat && boxData?.lng;
      const positionType = boxData?.position_type;

      if (!objectId) {
        navigate(`/qr/assign-object/${code}?box_id=${boxId}`);
        return;
      }

      if (!hasPosition || positionType === 'none') {
        navigate(`/maps?object_id=${objectId}&openBox=${boxId}&firstSetup=true&flyTo=true`);
        return;
      }

      navigate(`/maps?object_id=${objectId}&openBox=${boxId}&flyTo=true`);

    } catch (err) {
      console.error("QR check error:", err);
      setError("Fehler beim Prüfen des QR-Codes");
      setScannedCode(null);
      if (currentCamera) {
        await startScanner(currentCamera.id);
      }
    }
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
    await initScanner();
  };

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
            {/* Scan Frame */}
            <div className="relative w-64 h-64">
              {/* Ecken */}
              <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
              
              {/* Scan Line Animation */}
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-scan" />
            </div>
          </div>
        )}
      </div>

      {/* Success */}
      {scannedCode && (
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