import React, { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";

export default function Scanner() {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState("");
  const [scannedCode, setScannedCode] = useState(null);
  const [permissionState, setPermissionState] = useState("checking"); // checking, granted, denied, unsupported

  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    requestCameraPermission();
    return () => stopScanner();
  }, []);

  // Erst Berechtigung anfragen, dann Scanner starten
  const requestCameraPermission = async () => {
    try {
      // Prüfen ob Kamera-API verfügbar
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Kamera wird von diesem Browser nicht unterstützt");
        setPermissionState("unsupported");
        return;
      }

      // Explizit Berechtigung anfragen
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } // Back-Kamera bevorzugen
      });
      
      // Stream sofort stoppen - wir brauchen ihn nur für die Berechtigung
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionState("granted");
      startScanner();
      
    } catch (err) {
      console.error("Camera permission error:", err);
      
      if (err.name === "NotAllowedError") {
        setError("Kamera-Zugriff verweigert. Bitte erlaube den Kamera-Zugriff in deinen Browser-Einstellungen.");
        setPermissionState("denied");
      } else if (err.name === "NotFoundError") {
        setError("Keine Kamera gefunden");
        setPermissionState("unsupported");
      } else {
        setError(`Kamera-Fehler: ${err.message}`);
        setPermissionState("denied");
      }
    }
  };

  const startScanner = async () => {
    try {
      const codeReader = new BrowserQRCodeReader();
      const devices = await BrowserQRCodeReader.listVideoInputDevices();

      if (devices.length === 0) {
        setError("Keine Kamera gefunden");
        return;
      }

      // Back-Kamera finden (für Handys)
      let selectedDevice = devices[0];
      
      // Suche nach "back", "rear", "environment" im Label
      const backCamera = devices.find(device => 
        device.label.toLowerCase().includes("back") ||
        device.label.toLowerCase().includes("rear") ||
        device.label.toLowerCase().includes("environment") ||
        device.label.toLowerCase().includes("rück")
      );
      
      if (backCamera) {
        selectedDevice = backCamera;
      } else if (devices.length > 1) {
        // Bei 2 Kameras ist die zweite oft die Back-Kamera
        selectedDevice = devices[devices.length - 1];
      }

      console.log("Using camera:", selectedDevice.label || selectedDevice.deviceId);

      // Scanner starten
      controlsRef.current = await codeReader.decodeFromVideoDevice(
        selectedDevice.deviceId,
        videoRef.current,
        (result, err) => {
          if (result) {
            handleScan(result.getText());
          }
          // Ignoriere kontinuierliche Scan-Fehler (normal)
        }
      );
    } catch (e) {
      console.error("Scanner start error:", e);
      setError("Scanner konnte nicht gestartet werden: " + e.message);
    }
  };

  const stopScanner = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
    }
  };

  const handleScan = async (code) => {
    if (!code || scannedCode === code) return;

    // Vibration Feedback (wenn verfügbar)
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    setScannedCode(code);
    stopScanner(); // Scanner stoppen nach erfolgreichem Scan

    try {
      const res = await axios.get(`/api/qr/check/${code}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.assigned === false) {
        navigate(`/qr/assign/${code}`);
      } else {
        navigate(`/boxes/${res.data.box_id}`);
      }
    } catch (err) {
      console.error("QR check error:", err);
      setError("Fehler beim Prüfen des QR-Codes");
      // Scanner neu starten für nächsten Versuch
      setScannedCode(null);
      startScanner();
    }
  };

  const retryPermission = () => {
    setError("");
    setPermissionState("checking");
    requestCameraPermission();
  };

  return (
    <div className="p-6 text-white min-h-screen bg-gray-900">
      <h1 className="text-2xl font-bold mb-4">QR-Code Scannen</h1>

      {/* Fehler-Anzeige */}
      {error && (
        <div className="p-4 bg-red-800/50 border border-red-600 rounded-lg mb-4">
          <p className="mb-3">{error}</p>
          {permissionState === "denied" && (
            <div className="text-sm text-gray-300 space-y-2">
              <p>So aktivierst du die Kamera:</p>
              <ul className="list-disc list-inside text-gray-400">
                <li>Tippe auf das 🔒 Symbol in der Adressleiste</li>
                <li>Wähle "Website-Einstellungen"</li>
                <li>Erlaube "Kamera"</li>
                <li>Lade die Seite neu</li>
              </ul>
              <button
                onClick={retryPermission}
                className="mt-3 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Erneut versuchen
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {permissionState === "checking" && !error && (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Kamera wird aktiviert...</p>
        </div>
      )}

      {/* Video Element */}
      <div className={`relative ${permissionState !== "granted" ? "hidden" : ""}`}>
        <video
          ref={videoRef}
          className="w-full rounded-xl border-2 border-gray-700"
          playsInline
          muted
        />
        
        {/* Scan-Rahmen Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 border-2 border-white/50 rounded-2xl">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
          </div>
        </div>
      </div>

      {/* Erfolg */}
      {scannedCode && (
        <div className="mt-4 p-4 bg-green-800/50 border border-green-600 rounded-lg">
          <p className="text-green-400 font-medium">
            ✓ Code erkannt: {scannedCode}
          </p>
          <p className="text-sm text-gray-400 mt-1">Wird verarbeitet...</p>
        </div>
      )}

      {/* Hinweis */}
      {permissionState === "granted" && !scannedCode && (
        <p className="text-center text-gray-400 mt-4 text-sm">
          Halte den QR-Code in den Rahmen
        </p>
      )}
    </div>
  );
}