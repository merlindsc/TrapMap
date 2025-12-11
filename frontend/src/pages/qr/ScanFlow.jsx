/* ============================================================
   TRAPMAP – SCAN FLOW V2
   Intelligenter QR-Scanner mit:
   - GPS-Integration für Maps
   - FloorPlan-Unterstützung (ohne GPS)
   - Echtzeit-Position vom Handy
   ============================================================ */

import React, { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  X, Save, MapPin, Package, Calendar, FileText, Camera, QrCode,
  CheckCircle, Navigation, Crosshair, Map, Layers, RefreshCw,
  AlertCircle, Wifi, WifiOff
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function ScanFlowV2() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Context: Woher kommt der Scan?
  const context = searchParams.get("context") || "maps"; // maps | floorplan
  const floorplanId = searchParams.get("floorplan");
  const objectId = searchParams.get("object");

  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const token = localStorage.getItem("trapmap_token");
  const user = JSON.parse(localStorage.getItem("trapmap_user") || "{}");

  // Scanner State
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState("");
  const [scannedCode, setScannedCode] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Flow State
  const [mode, setMode] = useState("scanning"); // scanning | setup | control | success
  const [boxData, setBoxData] = useState(null);

  // GPS State (nur für Maps-Context)
  const [gpsPosition, setGpsPosition] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [watchId, setWatchId] = useState(null);

  // Setup Form State
  const [objects, setObjects] = useState([]);
  const [boxTypes, setBoxTypes] = useState([]);
  const [selectedObject, setSelectedObject] = useState(objectId || "");
  const [boxTypeId, setBoxTypeId] = useState("");
  const [notes, setNotes] = useState("");
  const [intervalType, setIntervalType] = useState("fixed");
  const [intervalFixed, setIntervalFixed] = useState(30);
  const [intervalRangeStart, setIntervalRangeStart] = useState(20);
  const [intervalRangeEnd, setIntervalRangeEnd] = useState(30);
  const [saving, setSaving] = useState(false);

  // Control Form State
  const [status, setStatus] = useState("green");
  const [consumption, setConsumption] = useState(0);
  const [quantity, setQuantity] = useState("none");
  const [trapState, setTrapState] = useState(0);
  const [controlNotes, setControlNotes] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // ============================================
  // GPS TRACKING (nur für Maps)
  // ============================================
  useEffect(() => {
    if (context === "maps") {
      startGPSTracking();
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [context]);

  const startGPSTracking = () => {
    if (!navigator.geolocation) {
      setGpsError("GPS nicht verfügbar");
      return;
    }

    setGpsLoading(true);

    // Einmalige Position holen
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setGpsAccuracy(pos.coords.accuracy);
        setGpsLoading(false);
        setGpsError(null);
      },
      (err) => {
        console.error("GPS error:", err);
        setGpsError(getGPSErrorMessage(err));
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

    // Kontinuierliches Tracking
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setGpsAccuracy(pos.coords.accuracy);
        setGpsError(null);
      },
      (err) => {
        console.error("GPS watch error:", err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    setWatchId(id);
  };

  const getGPSErrorMessage = (err) => {
    switch (err.code) {
      case 1: return "GPS-Berechtigung verweigert";
      case 2: return "Position nicht verfügbar";
      case 3: return "GPS-Timeout";
      default: return "GPS-Fehler";
    }
  };

  const refreshGPS = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setGpsAccuracy(pos.coords.accuracy);
        setGpsLoading(false);
        setGpsError(null);
      },
      (err) => {
        setGpsError(getGPSErrorMessage(err));
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ============================================
  // SCANNER
  // ============================================
  useEffect(() => {
    if (scanning) {
      startScanner();
    }
    return () => stopScanner();
  }, [scanning]);

  const startScanner = async () => {
    try {
      const codeReader = new BrowserQRCodeReader();
      const devices = await BrowserQRCodeReader.listVideoInputDevices();

      if (devices.length === 0) {
        setError("Keine Kamera gefunden");
        return;
      }

      // Bevorzuge Rückkamera
      const backCamera = devices.find(d =>
        d.label.toLowerCase().includes("back") ||
        d.label.toLowerCase().includes("rück") ||
        d.label.toLowerCase().includes("environment")
      ) || devices[0];

      controlsRef.current = await codeReader.decodeFromVideoDevice(
        backCamera.deviceId,
        videoRef.current,
        (result, err) => {
          if (result) handleScan(result.getText());
        }
      );

      setCameraReady(true);
    } catch (e) {
      console.error(e);
      setError("Scanner konnte nicht gestartet werden");
    }
  };

  const stopScanner = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
    }
    setCameraReady(false);
  };

  // ============================================
  // SCAN HANDLING
  // ============================================
  const handleScan = async (code) => {
    if (!code || scannedCode === code) return;

    // Vibration feedback
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    setScannedCode(code);
    stopScanner();
    setScanning(false);

    try {
      const res = await fetch(`${API}/qr/check/${code}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (data.assigned && data.box_id) {
        // Code ist zugewiesen → Box laden und Kontrolle öffnen
        const boxRes = await fetch(`${API}/boxes/${data.box_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (boxRes.ok) {
          const box = await boxRes.json();
          setBoxData(box);
          setMode("control");
        } else {
          setError("Box konnte nicht geladen werden");
          resetScanner();
        }
      } else {
        // Code nicht zugewiesen → Setup
        setMode("setup");
        loadSetupData();
      }
    } catch (err) {
      console.error("QR check error:", err);
      setMode("setup");
      loadSetupData();
    }
  };

  // ============================================
  // SETUP DATA
  // ============================================
  const loadSetupData = async () => {
    try {
      const [objRes, typeRes] = await Promise.all([
        fetch(`${API}/objects`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/boxtypes`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (objRes.ok) {
        const objData = await objRes.json();
        setObjects(Array.isArray(objData) ? objData : objData.data || []);
      }

      if (typeRes.ok) {
        const typeData = await typeRes.json();
        setBoxTypes(Array.isArray(typeData) ? typeData : typeData.data || []);
      }
    } catch (err) {
      console.error("Setup data error:", err);
    }
  };

  // ============================================
  // CREATE BOX
  // ============================================
  const handleCreateBox = async () => {
    if (!selectedObject || !boxTypeId) {
      alert("Bitte Objekt und Box-Typ auswählen!");
      return;
    }

    // Für Maps brauchen wir GPS
    if (context === "maps" && !gpsPosition) {
      alert("GPS-Position wird noch ermittelt...");
      return;
    }

    setSaving(true);

    const interval = intervalType === "fixed"
      ? intervalFixed
      : Math.floor((intervalRangeStart + intervalRangeEnd) / 2);

    try {
      // Box erstellen
      const boxPayload = {
        object_id: selectedObject,
        box_type_id: parseInt(boxTypeId),
        notes,
        control_interval_days: interval
      };

      // GPS-Position hinzufügen (nur für Maps)
      if (context === "maps" && gpsPosition) {
        boxPayload.lat = gpsPosition.lat;
        boxPayload.lng = gpsPosition.lng;
      }

      const boxRes = await fetch(`${API}/boxes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(boxPayload)
      });

      if (!boxRes.ok) {
        const err = await boxRes.json();
        alert("Fehler: " + (err.error || "Box konnte nicht erstellt werden"));
        setSaving(false);
        return;
      }

      const newBox = await boxRes.json();

      // QR-Code mit Box verknüpfen
      await fetch(`${API}/qr/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          qr_code: scannedCode,
          box_id: newBox.id
        })
      });

      // Falls FloorPlan-Context: Box auf Plan platzieren
      if (context === "floorplan" && floorplanId) {
        // Position wird vom FloorPlanEditor gesetzt
        // Hier nur zurück navigieren
      }

      setBoxData(newBox);
      setMode("success");

    } catch (e) {
      console.error("Create box error:", e);
      alert("Fehler beim Erstellen der Box");
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // SAVE CONTROL
  // ============================================
  const getBoxType = () => {
    const rawName = (boxData?.box_type_name || boxData?.type_name || "") + "";
    const rawCategory = (boxData?.box_type_category || boxData?.category || "") + "";
    const typeSource = `${rawName} ${rawCategory}`.toLowerCase();

    if (typeSource.includes("schlag") || typeSource.includes("snap")) return "schlagfalle";
    if (typeSource.includes("gift") || typeSource.includes("bait") || typeSource.includes("köder")) return "giftbox";
    if (typeSource.includes("insekt") || typeSource.includes("insect")) return "monitoring_insect";
    return "giftbox";
  };

  const computeStatus = () => {
    const boxType = getBoxType();

    if (boxType === "schlagfalle") {
      if (trapState === 0) return "green";
      if (trapState === 1) return "yellow";
      return "red";
    }

    if (boxType === "giftbox" || boxType === "monitoring_rodent") {
      if (consumption <= 1) return "green";
      if (consumption <= 2) return "yellow";
      return "red";
    }

    if (boxType === "monitoring_insect") {
      if (quantity === "none") return "green";
      if (quantity === "0-5" || quantity === "5-10") return "yellow";
      return "red";
    }

    return "green";
  };

  const handleSaveControl = async () => {
    setSaving(true);
    const boxType = getBoxType();
    const finalStatus = computeStatus();

    try {
      const scanData = {
        box_id: boxData.id,
        user_id: user.id,
        status: finalStatus,
        notes: controlNotes || null,
        trap_state: boxType === "schlagfalle" ? trapState : null,
        consumption: boxType === "giftbox" ? consumption : null,
        quantity: boxType === "monitoring_insect" ? quantity : null
      };

      // GPS-Position zum Scan hinzufügen (nur für Maps)
      if (context === "maps" && gpsPosition) {
        scanData.scan_lat = gpsPosition.lat;
        scanData.scan_lng = gpsPosition.lng;
      }

      if (photo) {
        const formData = new FormData();
        Object.entries(scanData).forEach(([key, value]) => {
          if (value !== null) formData.append(key, value);
        });
        formData.append("photo", photo);

        const res = await fetch(`${API}/scans`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        if (!res.ok) throw new Error("Scan konnte nicht gespeichert werden");
      } else {
        const res = await fetch(`${API}/scans`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(scanData)
        });

        if (!res.ok) throw new Error("Scan konnte nicht gespeichert werden");
      }

      setMode("success");
    } catch (e) {
      console.error("Save control error:", e);
      alert("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // PHOTO HANDLING
  // ============================================
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // ============================================
  // RESET
  // ============================================
  const resetScanner = () => {
    setScannedCode(null);
    setMode("scanning");
    setScanning(true);
    setBoxData(null);
    setError("");
    setSelectedObject(objectId || "");
    setBoxTypeId("");
    setNotes("");
    setControlNotes("");
    setPhoto(null);
    setPhotoPreview(null);
    setConsumption(0);
    setQuantity("none");
    setTrapState(0);
  };

  // ============================================
  // RENDER: SCANNING
  // ============================================
  if (mode === "scanning") {
    return (
      <div className="scan-flow-container">
        <style>{scanFlowStyles}</style>

        {/* Header */}
        <div className="scan-header">
          <button onClick={() => navigate(-1)} className="scan-back-btn">
            <X size={24} />
          </button>
          <h1><QrCode size={24} /> QR-Code Scannen</h1>
          <div className="scan-context-badge">
            {context === "maps" ? <Map size={16} /> : <Layers size={16} />}
            {context === "maps" ? "GPS-Modus" : "Lageplan-Modus"}
          </div>
        </div>

        {/* GPS Status (nur für Maps) */}
        {context === "maps" && (
          <div className={`gps-status ${gpsPosition ? "gps-active" : gpsError ? "gps-error" : "gps-loading"}`}>
            {gpsLoading ? (
              <>
                <Navigation size={18} className="animate-pulse" />
                <span>GPS wird ermittelt...</span>
              </>
            ) : gpsPosition ? (
              <>
                <Navigation size={18} />
                <span>
                  {gpsPosition.lat.toFixed(6)}, {gpsPosition.lng.toFixed(6)}
                  {gpsAccuracy && <small> (±{Math.round(gpsAccuracy)}m)</small>}
                </span>
                <button onClick={refreshGPS} className="gps-refresh">
                  <RefreshCw size={14} />
                </button>
              </>
            ) : (
              <>
                <AlertCircle size={18} />
                <span>{gpsError || "GPS nicht verfügbar"}</span>
                <button onClick={startGPSTracking} className="gps-refresh">
                  <RefreshCw size={14} />
                </button>
              </>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="scan-error">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Video */}
        <div className="scan-video-container">
          <video ref={videoRef} className="scan-video" />
          
          {/* Scan Frame */}
          <div className="scan-frame">
            <div className="scan-corner scan-corner-tl" />
            <div className="scan-corner scan-corner-tr" />
            <div className="scan-corner scan-corner-bl" />
            <div className="scan-corner scan-corner-br" />
          </div>

          {/* Scan Line Animation */}
          {cameraReady && <div className="scan-line" />}
        </div>

        <p className="scan-hint">
          Halte den QR-Code der Box vor die Kamera
        </p>
      </div>
    );
  }

  // ============================================
  // RENDER: SETUP
  // ============================================
  if (mode === "setup") {
    return (
      <div className="scan-flow-container">
        <style>{scanFlowStyles}</style>

        <div className="scan-header">
          <button onClick={resetScanner} className="scan-back-btn">
            <X size={24} />
          </button>
          <h1><Package size={24} /> Neue Box einrichten</h1>
        </div>

        <div className="scan-form">
          {/* QR-Code Info */}
          <div className="info-card info-blue">
            <QrCode size={20} />
            <div>
              <small>Gescannter Code</small>
              <strong>{scannedCode}</strong>
            </div>
          </div>

          {/* GPS Status (nur für Maps) */}
          {context === "maps" && (
            <div className={`info-card ${gpsPosition ? "info-green" : "info-orange"}`}>
              <MapPin size={20} />
              <div>
                <small>{gpsLoading ? "GPS wird ermittelt..." : gpsPosition ? "Position erfasst" : "Keine GPS-Position"}</small>
                {gpsPosition && (
                  <strong>{gpsPosition.lat.toFixed(6)}, {gpsPosition.lng.toFixed(6)}</strong>
                )}
              </div>
              {!gpsLoading && (
                <button onClick={refreshGPS} className="icon-btn">
                  <RefreshCw size={16} />
                </button>
              )}
            </div>
          )}

          {/* FloorPlan Info */}
          {context === "floorplan" && (
            <div className="info-card info-purple">
              <Layers size={20} />
              <div>
                <small>Lageplan-Modus</small>
                <strong>Position wird auf dem Plan festgelegt</strong>
              </div>
            </div>
          )}

          {/* Objekt */}
          <div className="form-group">
            <label>Objekt *</label>
            <select
              value={selectedObject}
              onChange={(e) => setSelectedObject(e.target.value)}
            >
              <option value="">Bitte auswählen...</option>
              {objects.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.name} {obj.city ? `(${obj.city})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Box-Typ */}
          <div className="form-group">
            <label>Box-Typ *</label>
            <select
              value={boxTypeId}
              onChange={(e) => setBoxTypeId(e.target.value)}
            >
              <option value="">Bitte auswählen...</option>
              {boxTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Intervall */}
          <div className="form-group">
            <label><Calendar size={16} /> Kontrollintervall</label>
            <div className="interval-toggle">
              <button
                className={intervalType === "fixed" ? "active" : ""}
                onClick={() => setIntervalType("fixed")}
              >
                Fix
              </button>
              <button
                className={intervalType === "range" ? "active" : ""}
                onClick={() => setIntervalType("range")}
              >
                Bereich
              </button>
            </div>

            {intervalType === "fixed" ? (
              <div className="interval-input">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={intervalFixed}
                  onChange={(e) => setIntervalFixed(parseInt(e.target.value) || 30)}
                />
                <span>Tage</span>
              </div>
            ) : (
              <div className="interval-range">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={intervalRangeStart}
                  onChange={(e) => setIntervalRangeStart(parseInt(e.target.value) || 20)}
                />
                <span>bis</span>
                <input
                  type="number"
                  min={intervalRangeStart}
                  max="365"
                  value={intervalRangeEnd}
                  onChange={(e) => setIntervalRangeEnd(parseInt(e.target.value) || 30)}
                />
                <span>Tage</span>
              </div>
            )}
          </div>

          {/* Notizen */}
          <div className="form-group">
            <label><FileText size={16} /> Notizen (optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zusätzliche Informationen..."
            />
          </div>

          {/* Buttons */}
          <div className="form-buttons">
            <button className="btn-secondary" onClick={resetScanner}>
              Abbrechen
            </button>
            <button
              className="btn-primary"
              onClick={handleCreateBox}
              disabled={saving || !selectedObject || !boxTypeId || (context === "maps" && !gpsPosition)}
            >
              <Save size={20} />
              {saving ? "Erstelle..." : "Box erstellen"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: CONTROL
  // ============================================
  if (mode === "control" && boxData) {
    const boxType = getBoxType();

    return (
      <div className="scan-flow-container">
        <style>{scanFlowStyles}</style>

        <div className="scan-header">
          <button onClick={resetScanner} className="scan-back-btn">
            <X size={24} />
          </button>
          <h1>📋 Box {boxData.number} kontrollieren</h1>
        </div>

        <div className="scan-form">
          {/* Box Info */}
          <div className="box-info-card">
            <div className="box-number">Box {boxData.number}</div>
            <div className="box-details">
              <span>{boxData.object_name}</span>
              <span>{boxData.box_type_name || boxData.type_name}</span>
            </div>
          </div>

          {/* Schlagfalle */}
          {boxType === "schlagfalle" && (
            <div className="form-group">
              <label>Fallenzustand *</label>
              <div className="trap-state-buttons">
                {[
                  { value: 0, label: "Gespannt", color: "#10b981" },
                  { value: 1, label: "Ausgelöst", color: "#eab308" },
                  { value: 2, label: "Fang", color: "#dc2626" }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    className={trapState === opt.value ? "active" : ""}
                    style={{ "--btn-color": opt.color }}
                    onClick={() => setTrapState(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Giftbox / Monitoring */}
          {(boxType === "giftbox" || boxType === "monitoring_rodent") && (
            <div className="form-group">
              <label>Köderverbrauch *</label>
              <div className="consumption-buttons">
                {[0, 1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    className={consumption === n ? "active" : ""}
                    onClick={() => setConsumption(n)}
                  >
                    {n * 25}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Insekten */}
          {boxType === "monitoring_insect" && (
            <div className="form-group">
              <label>Insektenmenge *</label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              >
                <option value="none">Keine</option>
                <option value="0-5">0–5</option>
                <option value="5-10">5–10</option>
                <option value="10-20">10–20</option>
                <option value="20+">20+</option>
              </select>
            </div>
          )}

          {/* Status */}
          <div className="status-display">
            <div className={`status-dot status-${computeStatus()}`} />
            <span>
              Status: <strong>
                {computeStatus() === "green" ? "OK" :
                 computeStatus() === "yellow" ? "Auffällig" : "Kritisch"}
              </strong>
            </span>
          </div>

          {/* Notizen */}
          <div className="form-group">
            <label>Notizen (optional)</label>
            <textarea
              rows={3}
              value={controlNotes}
              onChange={(e) => setControlNotes(e.target.value)}
              placeholder="Bemerkungen zur Kontrolle..."
            />
          </div>

          {/* Foto */}
          <div className="form-group">
            <label><Camera size={16} /> Foto (optional)</label>
            {photoPreview ? (
              <div className="photo-preview">
                <img src={photoPreview} alt="Vorschau" />
                <button onClick={() => { setPhoto(null); setPhotoPreview(null); }}>
                  <X size={18} />
                </button>
              </div>
            ) : (
              <label className="photo-upload">
                <Camera size={32} />
                <span>Foto aufnehmen</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                />
              </label>
            )}
          </div>

          {/* Buttons */}
          <div className="form-buttons">
            <button className="btn-secondary" onClick={resetScanner}>
              Abbrechen
            </button>
            <button
              className="btn-success"
              onClick={handleSaveControl}
              disabled={saving}
            >
              <Save size={20} />
              {saving ? "Speichere..." : "Kontrolle speichern"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: SUCCESS
  // ============================================
  if (mode === "success") {
    return (
      <div className="scan-flow-container scan-success">
        <style>{scanFlowStyles}</style>

        <div className="success-icon">
          <CheckCircle size={64} />
        </div>

        <h1>Erfolgreich gespeichert!</h1>

        {boxData && (
          <p>Box {boxData.number} wurde aktualisiert</p>
        )}

        <div className="success-buttons">
          <button className="btn-primary" onClick={resetScanner}>
            <QrCode size={24} />
            Nächsten Code scannen
          </button>

          <button
            className="btn-secondary"
            onClick={() => navigate(context === "maps" ? "/maps" : -1)}
          >
            Zurück
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ============================================
// STYLES
// ============================================
const scanFlowStyles = `
  .scan-flow-container {
    min-height: 100vh;
    background: #0a0a0a;
    color: #fff;
    padding-bottom: env(safe-area-inset-bottom);
  }

  .scan-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: #111;
    border-bottom: 1px solid #222;
  }

  .scan-header h1 {
    flex: 1;
    font-size: 18px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .scan-back-btn {
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    padding: 8px;
  }

  .scan-context-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #1e3a5f;
    color: #60a5fa;
    border-radius: 20px;
    font-size: 12px;
  }

  .gps-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    font-size: 13px;
  }

  .gps-active { background: #14532d; color: #86efac; }
  .gps-loading { background: #1e3a5f; color: #93c5fd; }
  .gps-error { background: #7f1d1d; color: #fca5a5; }

  .gps-refresh {
    margin-left: auto;
    background: rgba(255,255,255,0.1);
    border: none;
    color: inherit;
    padding: 6px;
    border-radius: 4px;
    cursor: pointer;
  }

  .scan-error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: #7f1d1d;
    color: #fca5a5;
  }

  .scan-video-container {
    position: relative;
    margin: 16px;
    border-radius: 16px;
    overflow: hidden;
    background: #1a1a1a;
  }

  .scan-video {
    width: 100%;
    display: block;
  }

  .scan-frame {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 250px;
    height: 250px;
  }

  .scan-corner {
    position: absolute;
    width: 30px;
    height: 30px;
    border-color: #6366f1;
    border-style: solid;
    border-width: 0;
  }

  .scan-corner-tl { top: 0; left: 0; border-top-width: 4px; border-left-width: 4px; border-radius: 8px 0 0 0; }
  .scan-corner-tr { top: 0; right: 0; border-top-width: 4px; border-right-width: 4px; border-radius: 0 8px 0 0; }
  .scan-corner-bl { bottom: 0; left: 0; border-bottom-width: 4px; border-left-width: 4px; border-radius: 0 0 0 8px; }
  .scan-corner-br { bottom: 0; right: 0; border-bottom-width: 4px; border-right-width: 4px; border-radius: 0 0 8px 0; }

  .scan-line {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 230px;
    height: 2px;
    background: linear-gradient(90deg, transparent, #6366f1, transparent);
    animation: scanLine 2s ease-in-out infinite;
  }

  @keyframes scanLine {
    0%, 100% { transform: translate(-50%, -125px); opacity: 0; }
    50% { transform: translate(-50%, 125px); opacity: 1; }
  }

  .scan-hint {
    text-align: center;
    color: #9ca3af;
    font-size: 14px;
    padding: 16px;
  }

  .scan-form {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .info-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 12px;
  }

  .info-card small { display: block; font-size: 11px; opacity: 0.7; }
  .info-card strong { display: block; font-family: monospace; }

  .info-blue { background: #1e3a5f; color: #93c5fd; }
  .info-green { background: #14532d; color: #86efac; }
  .info-orange { background: #78350f; color: #fcd34d; }
  .info-purple { background: #3b0764; color: #c4b5fd; }

  .icon-btn {
    background: rgba(255,255,255,0.1);
    border: none;
    color: inherit;
    padding: 8px;
    border-radius: 6px;
    cursor: pointer;
    margin-left: auto;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group label {
    font-size: 14px;
    color: #d1d5db;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .form-group select,
  .form-group textarea,
  .form-group input {
    padding: 14px;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 10px;
    color: #fff;
    font-size: 16px;
  }

  .form-group textarea {
    resize: vertical;
    min-height: 80px;
  }

  .interval-toggle {
    display: flex;
    gap: 8px;
  }

  .interval-toggle button {
    flex: 1;
    padding: 12px;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    color: #fff;
    cursor: pointer;
  }

  .interval-toggle button.active {
    background: #6366f1;
    border-color: #6366f1;
  }

  .interval-input,
  .interval-range {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .interval-input input,
  .interval-range input {
    flex: 1;
    text-align: center;
  }

  .interval-input span,
  .interval-range span {
    color: #9ca3af;
  }

  .form-buttons {
    display: flex;
    gap: 12px;
    margin-top: 8px;
  }

  .btn-primary,
  .btn-secondary,
  .btn-success {
    flex: 1;
    padding: 16px;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .btn-primary {
    background: #6366f1;
    color: #fff;
  }

  .btn-primary:disabled {
    background: #374151;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #374151;
    color: #fff;
  }

  .btn-success {
    background: #10b981;
    color: #fff;
    flex: 2;
  }

  .box-info-card {
    padding: 16px;
    background: #1a1a1a;
    border-radius: 12px;
  }

  .box-number {
    font-size: 20px;
    font-weight: 700;
  }

  .box-details {
    display: flex;
    gap: 8px;
    margin-top: 4px;
    font-size: 13px;
    color: #9ca3af;
  }

  .box-details span:not(:last-child)::after {
    content: "•";
    margin-left: 8px;
  }

  .trap-state-buttons,
  .consumption-buttons {
    display: flex;
    gap: 8px;
  }

  .trap-state-buttons button,
  .consumption-buttons button {
    flex: 1;
    padding: 14px 8px;
    background: #1a1a1a;
    border: 2px solid #333;
    border-radius: 10px;
    color: #fff;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
  }

  .trap-state-buttons button.active {
    background: var(--btn-color);
    border-color: var(--btn-color);
  }

  .consumption-buttons button.active {
    background: #6366f1;
    border-color: #6366f1;
  }

  .status-display {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: #1a1a1a;
    border-radius: 12px;
  }

  .status-dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
  }

  .status-green { background: #10b981; }
  .status-yellow { background: #eab308; }
  .status-red { background: #dc2626; }

  .photo-preview {
    position: relative;
    display: inline-block;
  }

  .photo-preview img {
    max-width: 100%;
    max-height: 200px;
    border-radius: 12px;
  }

  .photo-preview button {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #dc2626;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .photo-upload {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 32px;
    background: #1a1a1a;
    border: 2px dashed #333;
    border-radius: 12px;
    cursor: pointer;
    color: #6b7280;
  }

  .photo-upload input {
    display: none;
  }

  .scan-success {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 32px;
  }

  .success-icon {
    width: 100px;
    height: 100px;
    background: #14532d;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #4ade80;
    margin-bottom: 24px;
  }

  .scan-success h1 {
    font-size: 24px;
    margin-bottom: 8px;
  }

  .scan-success p {
    color: #9ca3af;
    margin-bottom: 32px;
  }

  .success-buttons {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    max-width: 300px;
  }
`;