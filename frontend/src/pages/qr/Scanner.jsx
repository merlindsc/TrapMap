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

  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    startScanner();
    return () => stopScanner();
  }, []);

  const startScanner = async () => {
    try {
      const codeReader = new BrowserQRCodeReader();

      const devices = await BrowserQRCodeReader.listVideoInputDevices();

      if (devices.length === 0) {
        setError("Keine Kamera gefunden");
        return;
      }

      // Kamera starten - gibt Controls zurück
      controlsRef.current = await codeReader.decodeFromVideoDevice(
        devices[0].deviceId,
        videoRef.current,
        (result, err) => {
          if (result) handleScan(result.getText());
        }
      );
    } catch (e) {
      console.error(e);
      setError("Scanner konnte nicht gestartet werden");
    }
  };

  const stopScanner = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
    }
  };

  const handleScan = async (code) => {
    if (!code || scannedCode === code) return;

    setScannedCode(code);

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
    }
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">QR-Code Scannen</h1>

      {error && (
        <div className="p-4 bg-red-800 rounded mb-4">{error}</div>
      )}

      <video
        ref={videoRef}
        style={{ width: "100%", borderRadius: "12px" }}
      />

      {scannedCode && (
        <p className="mt-4 text-green-400">
          Code erkannt: {scannedCode}
        </p>
      )}
    </div>
  );
}