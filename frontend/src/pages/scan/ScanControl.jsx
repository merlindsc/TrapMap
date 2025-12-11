/* ============================================================
   TRAPMAP – SCAN CONTROL PAGE
   Kontrolle durchführen nach QR-Scan
   ============================================================ */

import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  X, Save, Camera, CheckCircle, AlertCircle, History,
  Package, MapPin, Calendar, ChevronDown, ChevronUp
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function ScanControl() {
  const { boxId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const token = localStorage.getItem("trapmap_token");
  const user = JSON.parse(localStorage.getItem("trapmap_user") || "{}");

  // Box State
  const [box, setBox] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State
  const [status, setStatus] = useState("green");
  const [consumption, setConsumption] = useState(0);
  const [trapState, setTrapState] = useState(0);
  const [quantity, setQuantity] = useState("none");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // UI State
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  // ============================================
  // LOAD BOX
  // ============================================
  useEffect(() => {
    if (!boxId) {
      navigate("/dashboard");
      return;
    }
    loadBox();
    loadHistory();
  }, [boxId]);

  const loadBox = async () => {
    try {
      const res = await fetch(`${API}/boxes/${boxId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Box nicht gefunden");

      const data = await res.json();
      setBox(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API}/scans?box_id=${boxId}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error("History error:", err);
    }
  };

  // ============================================
  // BOX TYPE DETECTION
  // ============================================
  const getBoxType = () => {
    if (!box) return "giftbox";
    
    const name = (box.box_type_name || box.type_name || "").toLowerCase();
    const category = (box.box_type_category || box.category || "").toLowerCase();
    const combined = `${name} ${category}`;

    if (combined.includes("schlag") || combined.includes("snap")) return "schlagfalle";
    if (combined.includes("insekt") || combined.includes("insect") || combined.includes("klebe")) return "insect";
    return "giftbox";
  };

  // ============================================
  // AUTO STATUS CALCULATION
  // ============================================
  const computeStatus = () => {
    const boxType = getBoxType();

    if (boxType === "schlagfalle") {
      if (trapState === 0) return "green";
      if (trapState === 1) return "yellow";
      return "red";
    }

    if (boxType === "giftbox") {
      if (consumption <= 1) return "green";
      if (consumption <= 2) return "yellow";
      return "red";
    }

    if (boxType === "insect") {
      if (quantity === "none") return "green";
      if (quantity === "0-5" || quantity === "5-10") return "yellow";
      return "red";
    }

    return "green";
  };

  // Update status when values change
  useEffect(() => {
    setStatus(computeStatus());
  }, [consumption, trapState, quantity, box]);

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
  // SAVE
  // ============================================
  const handleSave = async () => {
    setSaving(true);

    try {
      const boxType = getBoxType();
      const finalStatus = computeStatus();

      if (photo) {
        // Mit Foto: FormData
        const formData = new FormData();
        formData.append("box_id", boxId);
        formData.append("user_id", user.id);
        formData.append("status", finalStatus);
        formData.append("notes", notes || "");
        
        if (boxType === "schlagfalle") formData.append("trap_state", trapState);
        if (boxType === "giftbox") formData.append("consumption", consumption);
        if (boxType === "insect") formData.append("quantity", quantity);
        
        formData.append("photo", photo);

        const res = await fetch(`${API}/scans`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        if (!res.ok) throw new Error("Kontrolle konnte nicht gespeichert werden");
      } else {
        // Ohne Foto: JSON
        const res = await fetch(`${API}/scans`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            box_id: boxId,
            user_id: user.id,
            status: finalStatus,
            notes: notes || null,
            trap_state: boxType === "schlagfalle" ? trapState : null,
            consumption: boxType === "giftbox" ? consumption : null,
            quantity: boxType === "insect" ? quantity : null
          })
        });

        if (!res.ok) throw new Error("Kontrolle konnte nicht gespeichert werden");
      }

      setSuccess(true);
    } catch (err) {
      console.error("Save error:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // RENDER: LOADING
  // ============================================
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <div style={styles.spinner} />
          <p>Box wird geladen...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: ERROR
  // ============================================
  if (error && !box) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <AlertCircle size={48} />
          <h2>Fehler</h2>
          <p>{error}</p>
          <button style={styles.secondaryButton} onClick={() => navigate("/dashboard")}>
            Zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: SUCCESS
  // ============================================
  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.successBox}>
          <div style={styles.successIcon}>
            <CheckCircle size={64} />
          </div>
          <h1>Kontrolle gespeichert!</h1>
          <p>Box {box?.number}</p>
          
          <div style={styles.successButtons}>
            <button 
              style={styles.primaryButton}
              onClick={() => navigate("/maps")}
            >
              Zur Karte
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
  const boxType = getBoxType();

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate(-1)}>
          <X size={24} />
        </button>
        <h1>📋 Box {box?.number} kontrollieren</h1>
      </div>

      <div style={styles.form}>
        {/* Box Info */}
        <div style={styles.boxCard}>
          <div style={styles.boxHeader}>
            <Package size={24} />
            <div>
              <strong>Box {box?.number}</strong>
              <small>{box?.object_name}</small>
            </div>
          </div>
          <div style={styles.boxMeta}>
            <span>{box?.box_type_name || box?.type_name}</span>
            {box?.last_scan_at && (
              <span>
                <Calendar size={14} />
                Letzte Kontrolle: {new Date(box.last_scan_at).toLocaleDateString("de-DE")}
              </span>
            )}
          </div>
        </div>

        {/* Schlagfalle */}
        {boxType === "schlagfalle" && (
          <div style={styles.fieldGroup}>
            <label>Fallenzustand</label>
            <div style={styles.buttonGroup}>
              {[
                { value: 0, label: "Gespannt", color: "#10b981" },
                { value: 1, label: "Ausgelöst", color: "#eab308" },
                { value: 2, label: "Fang", color: "#dc2626" }
              ].map(opt => (
                <button
                  key={opt.value}
                  style={{
                    ...styles.stateButton,
                    background: trapState === opt.value ? opt.color : "#1a1a1a",
                    borderColor: trapState === opt.value ? opt.color : "#333"
                  }}
                  onClick={() => setTrapState(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Giftbox */}
        {boxType === "giftbox" && (
          <div style={styles.fieldGroup}>
            <label>Köderverbrauch</label>
            <div style={styles.buttonGroup}>
              {[0, 1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  style={{
                    ...styles.consumptionButton,
                    background: consumption === n ? "#6366f1" : "#1a1a1a",
                    borderColor: consumption === n ? "#6366f1" : "#333"
                  }}
                  onClick={() => setConsumption(n)}
                >
                  {n * 25}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Insekten */}
        {boxType === "insect" && (
          <div style={styles.fieldGroup}>
            <label>Insektenmenge</label>
            <select
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={styles.select}
            >
              <option value="none">Keine</option>
              <option value="0-5">0-5</option>
              <option value="5-10">5-10</option>
              <option value="10-20">10-20</option>
              <option value="20+">20+</option>
            </select>
          </div>
        )}

        {/* Status Anzeige */}
        <div style={styles.statusDisplay}>
          <div style={{
            ...styles.statusDot,
            background: status === "green" ? "#10b981" : status === "yellow" ? "#eab308" : "#dc2626"
          }} />
          <span>
            Status: <strong>{status === "green" ? "OK" : status === "yellow" ? "Auffällig" : "Kritisch"}</strong>
          </span>
        </div>

        {/* Notizen */}
        <div style={styles.fieldGroup}>
          <label>Notizen (optional)</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bemerkungen zur Kontrolle..."
            style={styles.textarea}
          />
        </div>

        {/* Foto */}
        <div style={styles.fieldGroup}>
          <label><Camera size={16} /> Foto (optional)</label>
          {photoPreview ? (
            <div style={styles.photoPreview}>
              <img src={photoPreview} alt="Vorschau" />
              <button 
                style={styles.removePhoto}
                onClick={() => { setPhoto(null); setPhotoPreview(null); }}
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <label style={styles.photoUpload}>
              <Camera size={32} />
              <span>Foto aufnehmen</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                style={{ display: "none" }}
              />
            </label>
          )}
        </div>

        {/* History Toggle */}
        {history.length > 0 && (
          <button 
            style={styles.historyToggle}
            onClick={() => setShowHistory(!showHistory)}
          >
            <History size={18} />
            Letzte Kontrollen ({history.length})
            {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        )}

        {/* History List */}
        {showHistory && (
          <div style={styles.historyList}>
            {history.map(scan => (
              <div key={scan.id} style={styles.historyItem}>
                <div style={{
                  ...styles.historyDot,
                  background: scan.status === "green" ? "#10b981" : scan.status === "yellow" ? "#eab308" : "#dc2626"
                }} />
                <div>
                  <strong>{new Date(scan.scanned_at).toLocaleDateString("de-DE")}</strong>
                  <small>{scan.user_name || "Unbekannt"}</small>
                  {scan.notes && <p>{scan.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={styles.errorMessage}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Buttons */}
        <div style={styles.buttons}>
          <button style={styles.cancelButton} onClick={() => navigate(-1)}>
            Abbrechen
          </button>
          <button
            style={{
              ...styles.saveButton,
              opacity: saving ? 0.5 : 1
            }}
            onClick={handleSave}
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
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh"
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #333",
    borderTopColor: "#6366f1",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  boxCard: {
    background: "#1f2937",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "20px"
  },
  boxHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  boxMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    marginTop: "12px",
    fontSize: "13px",
    color: "#9ca3af"
  },
  fieldGroup: {
    marginBottom: "20px"
  },
  buttonGroup: {
    display: "flex",
    gap: "8px",
    marginTop: "8px"
  },
  stateButton: {
    flex: 1,
    padding: "14px 8px",
    border: "2px solid",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer"
  },
  consumptionButton: {
    flex: 1,
    padding: "14px 8px",
    border: "2px solid",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer"
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
  statusDisplay: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    background: "#1a1a1a",
    borderRadius: "12px",
    marginBottom: "20px"
  },
  statusDot: {
    width: "20px",
    height: "20px",
    borderRadius: "50%"
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
    minHeight: "80px"
  },
  photoPreview: {
    position: "relative",
    marginTop: "8px"
  },
  removePhoto: {
    position: "absolute",
    top: "8px",
    right: "8px",
    background: "#dc2626",
    border: "none",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  photoUpload: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    padding: "32px",
    background: "#1a1a1a",
    border: "2px dashed #333",
    borderRadius: "12px",
    cursor: "pointer",
    marginTop: "8px",
    color: "#6b7280"
  },
  historyToggle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "14px 16px",
    background: "#1f2937",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    cursor: "pointer",
    marginBottom: "12px"
  },
  historyList: {
    background: "#1a1a1a",
    borderRadius: "10px",
    padding: "8px",
    marginBottom: "20px",
    maxHeight: "300px",
    overflowY: "auto"
  },
  historyItem: {
    display: "flex",
    gap: "12px",
    padding: "12px",
    borderBottom: "1px solid #333"
  },
  historyDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: "4px"
  },
  errorMessage: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 16px",
    background: "#7f1d1d",
    borderRadius: "10px",
    color: "#fca5a5",
    marginBottom: "16px"
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
    background: "#10b981",
    border: "none",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer"
  },
  errorBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    textAlign: "center",
    color: "#ef4444"
  },
  successBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    textAlign: "center",
    padding: "20px"
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
  successButtons: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "100%",
    maxWidth: "300px",
    marginTop: "24px"
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