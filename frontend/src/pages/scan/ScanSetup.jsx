/* ============================================================
   TRAPMAP – SCAN SETUP PAGE
   Neue Box einrichten nach QR-Scan
   ============================================================ */

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  X, Save, MapPin, Package, Calendar, FileText, QrCode,
  Navigation, RefreshCw, AlertCircle, CheckCircle, Loader
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function ScanSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Code aus State oder Session
  const code = location.state?.code || sessionStorage.getItem("trapmap_pending_scan");
  
  const token = localStorage.getItem("trapmap_token");
  const user = JSON.parse(localStorage.getItem("trapmap_user") || "{}");

  // Form State
  const [objects, setObjects] = useState([]);
  const [boxTypes, setBoxTypes] = useState([]);
  const [selectedObject, setSelectedObject] = useState("");
  const [boxTypeId, setBoxTypeId] = useState("");
  const [notes, setNotes] = useState("");
  const [intervalDays, setIntervalDays] = useState(30);
  
  // GPS State
  const [gpsPosition, setGpsPosition] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsError, setGpsError] = useState(null);

  // UI State
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [createdBox, setCreatedBox] = useState(null);

  // ============================================
  // INIT
  // ============================================
  useEffect(() => {
    if (!code) {
      navigate("/dashboard");
      return;
    }

    loadData();
    getGPSPosition();
  }, []);

  const loadData = async () => {
    try {
      const [objRes, typeRes] = await Promise.all([
        fetch(`${API}/objects`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/boxtypes`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (objRes.ok) {
        const data = await objRes.json();
        setObjects(Array.isArray(data) ? data : data.data || []);
      }

      if (typeRes.ok) {
        const data = await typeRes.json();
        setBoxTypes(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error("Load data error:", err);
    }
  };

  // ============================================
  // GPS
  // ============================================
  const getGPSPosition = () => {
    if (!navigator.geolocation) {
      setGpsError("GPS nicht verfügbar");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setGpsLoading(false);
        setGpsError(null);
      },
      (err) => {
        setGpsError(
          err.code === 1 ? "GPS-Berechtigung verweigert" :
          err.code === 2 ? "Position nicht verfügbar" :
          "GPS-Timeout"
        );
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // ============================================
  // SAVE
  // ============================================
  const handleSave = async () => {
    if (!selectedObject || !boxTypeId) {
      setError("Bitte Objekt und Box-Typ auswählen");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Box erstellen
      const boxPayload = {
        object_id: selectedObject,
        box_type_id: parseInt(boxTypeId),
        notes: notes || null,
        control_interval_days: intervalDays
      };

      // GPS hinzufügen wenn verfügbar
      if (gpsPosition) {
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
        throw new Error(err.error || "Box konnte nicht erstellt werden");
      }

      const newBox = await boxRes.json();

      // 2. QR-Code mit Box verknüpfen
      await fetch(`${API}/qr/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          qr_code: code,
          box_id: newBox.id
        })
      });

      // 3. Erfolg
      setCreatedBox(newBox);
      setSuccess(true);
      sessionStorage.removeItem("trapmap_pending_scan");

    } catch (err) {
      console.error("Save error:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // RENDER: SUCCESS
  // ============================================
  if (success && createdBox) {
    return (
      <div style={styles.container}>
        <div style={styles.successCard}>
          <div style={styles.successIcon}>
            <CheckCircle size={64} />
          </div>
          
          <h1>Box erfolgreich erstellt!</h1>
          
          <div style={styles.boxInfo}>
            <strong>Box {createdBox.number}</strong>
            <span>{code}</span>
          </div>

          <div style={styles.successButtons}>
            <button 
              style={styles.primaryButton}
              onClick={() => navigate(`/scan/control/${createdBox.id}`, { 
                state: { fromSetup: true } 
              })}
            >
              Jetzt Kontrolle durchführen
            </button>
            
            <button 
              style={styles.secondaryButton}
              onClick={() => navigate("/dashboard")}
            >
              Zum Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: FORM
  // ============================================
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate("/dashboard")}>
          <X size={24} />
        </button>
        <h1><Package size={24} /> Neue Box einrichten</h1>
      </div>

      <div style={styles.form}>
        {/* Code Info */}
        <div style={styles.infoCard}>
          <QrCode size={24} />
          <div>
            <small>Gescannter Code</small>
            <strong>{code}</strong>
          </div>
        </div>

        {/* GPS Info */}
        <div style={{
          ...styles.infoCard,
          background: gpsPosition ? "#14532d" : gpsError ? "#7f1d1d" : "#1e3a5f"
        }}>
          {gpsLoading ? (
            <>
              <Loader size={24} style={{ animation: "spin 1s linear infinite" }} />
              <div>
                <small>GPS wird ermittelt...</small>
              </div>
            </>
          ) : gpsPosition ? (
            <>
              <Navigation size={24} />
              <div>
                <small>GPS Position erfasst (±{gpsAccuracy}m)</small>
                <strong>{gpsPosition.lat.toFixed(6)}, {gpsPosition.lng.toFixed(6)}</strong>
              </div>
              <button style={styles.iconButton} onClick={getGPSPosition}>
                <RefreshCw size={18} />
              </button>
            </>
          ) : (
            <>
              <AlertCircle size={24} />
              <div>
                <small>{gpsError || "GPS nicht verfügbar"}</small>
                <strong>Position wird nicht gespeichert</strong>
              </div>
              <button style={styles.iconButton} onClick={getGPSPosition}>
                <RefreshCw size={18} />
              </button>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Objekt */}
        <div style={styles.formGroup}>
          <label>Objekt *</label>
          <select
            value={selectedObject}
            onChange={(e) => setSelectedObject(e.target.value)}
            style={styles.select}
          >
            <option value="">Bitte auswählen...</option>
            {objects.map(obj => (
              <option key={obj.id} value={obj.id}>
                {obj.name} {obj.city ? `(${obj.city})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Box-Typ */}
        <div style={styles.formGroup}>
          <label>Box-Typ *</label>
          <select
            value={boxTypeId}
            onChange={(e) => setBoxTypeId(e.target.value)}
            style={styles.select}
          >
            <option value="">Bitte auswählen...</option>
            {boxTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        {/* Intervall */}
        <div style={styles.formGroup}>
          <label><Calendar size={16} /> Kontrollintervall (Tage)</label>
          <input
            type="number"
            min={1}
            max={365}
            value={intervalDays}
            onChange={(e) => setIntervalDays(parseInt(e.target.value) || 30)}
            style={styles.input}
          />
        </div>

        {/* Notizen */}
        <div style={styles.formGroup}>
          <label><FileText size={16} /> Notizen (optional)</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Standort-Beschreibung, Besonderheiten..."
            style={styles.textarea}
          />
        </div>

        {/* Buttons */}
        <div style={styles.buttons}>
          <button 
            style={styles.cancelButton}
            onClick={() => navigate("/dashboard")}
          >
            Abbrechen
          </button>
          <button
            style={{
              ...styles.saveButton,
              opacity: saving || !selectedObject || !boxTypeId ? 0.5 : 1
            }}
            onClick={handleSave}
            disabled={saving || !selectedObject || !boxTypeId}
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
// STYLES
// ============================================
const styles = {
  container: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#fff"
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 20px",
    background: "#111",
    borderBottom: "1px solid #222"
  },
  backButton: {
    background: "none",
    border: "none",
    color: "#9ca3af",
    cursor: "pointer"
  },
  form: {
    padding: "20px",
    maxWidth: "500px",
    margin: "0 auto"
  },
  infoCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px",
    background: "#1e3a5f",
    borderRadius: "12px",
    marginBottom: "16px",
    color: "#93c5fd"
  },
  iconButton: {
    marginLeft: "auto",
    background: "rgba(255,255,255,0.1)",
    border: "none",
    borderRadius: "8px",
    padding: "8px",
    color: "inherit",
    cursor: "pointer"
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 16px",
    background: "#7f1d1d",
    borderRadius: "12px",
    marginBottom: "16px",
    color: "#fca5a5"
  },
  formGroup: {
    marginBottom: "20px"
  },
  select: {
    width: "100%",
    padding: "14px 16px",
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "16px",
    marginTop: "8px"
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "16px",
    marginTop: "8px"
  },
  textarea: {
    width: "100%",
    padding: "14px 16px",
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "16px",
    marginTop: "8px",
    resize: "vertical",
    minHeight: "100px"
  },
  buttons: {
    display: "flex",
    gap: "12px",
    marginTop: "24px"
  },
  cancelButton: {
    flex: 1,
    padding: "16px",
    background: "#374151",
    border: "none",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer"
  },
  saveButton: {
    flex: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "16px",
    background: "#6366f1",
    border: "none",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer"
  },
  successCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: "40px 20px",
    textAlign: "center"
  },
  successIcon: {
    width: "100px",
    height: "100px",
    background: "#14532d",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#4ade80",
    marginBottom: "24px"
  },
  boxInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "16px 24px",
    background: "#1f2937",
    borderRadius: "12px",
    margin: "24px 0"
  },
  successButtons: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "100%",
    maxWidth: "300px"
  },
  primaryButton: {
    padding: "16px",
    background: "#6366f1",
    border: "none",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer"
  },
  secondaryButton: {
    padding: "16px",
    background: "#374151",
    border: "none",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer"
  }
};