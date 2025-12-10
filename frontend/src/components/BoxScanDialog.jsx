/* ============================================================
   UNIFIED BOX SCAN DIALOG
   Für Maps UND Lageplan - mit Typ-spezifischen Kontrollen
   ============================================================ */

import { useState, useEffect } from "react";
import { X, CheckCircle, Clock, Camera, AlertCircle, History, Save } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

const STATUS_CONFIG = {
  green: { label: "OK", icon: "✓", color: "#10b981", bg: "#10b98120" },
  yellow: { label: "Auffällig", icon: "!", color: "#eab308", bg: "#eab30820" },
  orange: { label: "Erhöht", icon: "!!", color: "#f97316", bg: "#f9731620" },
  red: { label: "Befall", icon: "✗", color: "#ef4444", bg: "#ef444420" }
};

export default function BoxScanDialog({ box, onClose, onScanCreated, onSave, onEdit }) {
  const token = localStorage.getItem("trapmap_token");
  
  const [activeTab, setActiveTab] = useState("scan");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  // Form State
  const [status, setStatus] = useState("green");
  const [notes, setNotes] = useState("");
  const [findings, setFindings] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  // Type-specific state
  const [consumption, setConsumption] = useState(0);     // Köderverbrauch 0-4 (0%, 25%, 50%, 75%, 100%)
  const [trapState, setTrapState] = useState(0);         // Schlagfalle: 0=nicht ausgelöst, 1=ausgelöst, 2=Tier
  const [quantity, setQuantity] = useState("none");      // Insektenmenge

  // ============================================
  // Determine Box Type
  // ============================================
  const typeName = (box.box_type_name || box.box_types?.name || "").toLowerCase();
  
  let boxType = "default";
  if (typeName.includes("schlag") || typeName.includes("trap") || typeName.includes("falle")) {
    boxType = "schlagfalle";
  } else if (typeName.includes("gift") || typeName.includes("bait") || typeName.includes("köder") || typeName.includes("rodent") || typeName.includes("ratte") || typeName.includes("maus")) {
    boxType = "koeder";
  } else if (typeName.includes("insekt") || typeName.includes("insect") || typeName.includes("fliege") || typeName.includes("schabe")) {
    boxType = "insekt";
  }

  // ============================================
  // Auto-Status Calculation
  // ============================================
  useEffect(() => {
    if (boxType === "schlagfalle") {
      if (trapState === 0) setStatus("green");
      else if (trapState === 1) setStatus("yellow");
      else if (trapState === 2) setStatus("red");
    } else if (boxType === "koeder") {
      if (consumption === 0) setStatus("green");
      else if (consumption === 1) setStatus("yellow");
      else if (consumption === 2) setStatus("orange");
      else setStatus("red");
    } else if (boxType === "insekt") {
      if (quantity === "none") setStatus("green");
      else if (quantity === "0-5") setStatus("yellow");
      else if (quantity === "5-10") setStatus("orange");
      else setStatus("red");
    }
  }, [consumption, trapState, quantity, boxType]);

  // ============================================
  // Load History
  // ============================================
  useEffect(() => {
    loadHistory();
  }, [box.id]);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`${API}/scans?box_id=${box.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ============================================
  // Photo Handling
  // ============================================
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  // ============================================
  // Toast
  // ============================================
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
      if (type === "success") {
        onClose();
        if (onScanCreated) onScanCreated();
        if (onSave) onSave();
      }
    }, 1500);
  };

  // ============================================
  // Submit Scan
  // ============================================
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("box_id", box.id);
      formData.append("status", status);
      if (notes) formData.append("notes", notes);
      if (findings) formData.append("findings", findings);
      if (photo) formData.append("photo", photo);
      
      // Type-specific data
      if (boxType === "koeder") {
        formData.append("consumption", consumption);
      } else if (boxType === "schlagfalle") {
        formData.append("trap_state", trapState);
      } else if (boxType === "insekt") {
        formData.append("quantity", quantity);
      }

      const res = await fetch(`${API}/scans`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Fehler beim Speichern");
      }

      showToast("success", "Kontrolle gespeichert!");
    } catch (err) {
      console.error("Error creating scan:", err);
      showToast("error", err.message || "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Format Time
  // ============================================
  const formatTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("de-DE") + ", " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          padding: "12px 24px", borderRadius: 8, zIndex: 1100,
          background: toast.type === "success" ? "#10b981" : "#ef4444",
          color: "#fff", fontWeight: 500, display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
        }}>
          {toast.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {toast.message}
        </div>
      )}

      <div 
        onClick={(e) => e.target === e.currentTarget && onClose()}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 20
        }}
      >
        <div style={{
          background: "#1e293b", borderRadius: 12, width: "100%", maxWidth: 500,
          maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column"
        }}>
          {/* Header */}
          <div style={{
            padding: "16px 20px", borderBottom: "1px solid #334155",
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: 18 }}>
                ✓ Kontrolle: {box.number || box.box_name || `Box ${box.id}`}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>
                Typ: {box.box_type_name || box.box_types?.name || "Standard"}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {onEdit && (
                <button 
                  onClick={onEdit} 
                  style={{ 
                    background: "#334155", 
                    border: "none", 
                    color: "#e2e8f0", 
                    cursor: "pointer",
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  Bearbeiten
                </button>
              )}
              <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #334155" }}>
            <button 
              onClick={() => setActiveTab("scan")}
              style={{
                flex: 1, padding: 12, background: "transparent", border: "none",
                borderBottom: activeTab === "scan" ? "2px solid #3b82f6" : "2px solid transparent",
                color: activeTab === "scan" ? "#3b82f6" : "#94a3b8",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}
            >
              <CheckCircle size={18} /> Neue Kontrolle
            </button>
            <button 
              onClick={() => setActiveTab("history")}
              style={{
                flex: 1, padding: 12, background: "transparent", border: "none",
                borderBottom: activeTab === "history" ? "2px solid #3b82f6" : "2px solid transparent",
                color: activeTab === "history" ? "#3b82f6" : "#94a3b8",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}
            >
              <History size={18} /> Verlauf ({history.length})
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
            {activeTab === "scan" ? (
              <>
                {/* Current Status Display */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  background: "#0f172a", borderRadius: 8, marginBottom: 20
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: STATUS_CONFIG[status].color
                  }} />
                  <span style={{ color: "#fff", fontWeight: 500 }}>
                    Status: {STATUS_CONFIG[status].label.toUpperCase()}
                  </span>
                </div>

                {/* Type-specific Controls */}
                {boxType === "schlagfalle" && (
                  <>
                    <label style={{ display: "block", color: "#e2e8f0", marginBottom: 8, fontSize: 14 }}>Zustand *</label>
                    <select
                      value={trapState}
                      onChange={(e) => setTrapState(Number(e.target.value))}
                      style={{
                        width: "100%", padding: 12, borderRadius: 8,
                        border: "1px solid #334155", background: "#0f172a",
                        color: "#e2e8f0", fontSize: 14, marginBottom: 20
                      }}
                    >
                      <option value={0}>Nicht ausgelöst</option>
                      <option value={1}>Ausgelöst (leer)</option>
                      <option value={2}>Tier gefunden</option>
                    </select>
                  </>
                )}

                {boxType === "koeder" && (
                  <>
                    <label style={{ display: "block", color: "#e2e8f0", marginBottom: 8, fontSize: 14 }}>Köderverbrauch *</label>
                    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                      {[0, 1, 2, 3, 4].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setConsumption(n)}
                          style={{
                            flex: 1, padding: "12px 8px", borderRadius: 8, cursor: "pointer",
                            border: consumption === n ? `2px solid ${n === 0 ? "#10b981" : n <= 2 ? "#eab308" : "#ef4444"}` : "1px solid #334155",
                            background: consumption === n ? (n === 0 ? "#10b98120" : n <= 2 ? "#eab30820" : "#ef444420") : "#0f172a",
                            color: consumption === n ? (n === 0 ? "#10b981" : n <= 2 ? "#eab308" : "#ef4444") : "#94a3b8",
                            fontSize: 14, fontWeight: 500
                          }}
                        >
                          {n * 25}%
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {boxType === "insekt" && (
                  <>
                    <label style={{ display: "block", color: "#e2e8f0", marginBottom: 8, fontSize: 14 }}>Insektenmenge *</label>
                    <select
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      style={{
                        width: "100%", padding: 12, borderRadius: 8,
                        border: "1px solid #334155", background: "#0f172a",
                        color: "#e2e8f0", fontSize: 14, marginBottom: 20
                      }}
                    >
                      <option value="none">Keine</option>
                      <option value="0-5">1-5 Stück</option>
                      <option value="5-10">5-10 Stück</option>
                      <option value="10-20">10-20 Stück</option>
                      <option value="20+">Mehr als 20</option>
                    </select>
                  </>
                )}

                {boxType === "default" && (
                  <>
                    <label style={{ display: "block", color: "#e2e8f0", marginBottom: 8, fontSize: 14 }}>Status *</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setStatus(key)}
                          style={{
                            padding: "16px 8px", borderRadius: 8, cursor: "pointer",
                            border: status === key ? `2px solid ${cfg.color}` : "1px solid #334155",
                            background: status === key ? cfg.bg : "#0f172a",
                            color: status === key ? cfg.color : "#94a3b8",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 6
                          }}
                        >
                          <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                          <span style={{ fontSize: 12 }}>{cfg.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Notes */}
                <label style={{ display: "block", color: "#e2e8f0", marginBottom: 8, fontSize: 14 }}>Notizen</label>
                <textarea
                  style={{
                    width: "100%", padding: 12, borderRadius: 8, border: "1px solid #334155",
                    background: "#0f172a", color: "#e2e8f0", fontSize: 14, minHeight: 80,
                    marginBottom: 16, resize: "vertical", boxSizing: "border-box"
                  }}
                  placeholder="Bemerkungen zur Kontrolle..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                {/* Photo */}
                <label style={{ display: "block", color: "#e2e8f0", marginBottom: 8, fontSize: 14 }}>Foto (optional)</label>
                {photoPreview ? (
                  <div style={{ position: "relative", marginBottom: 16 }}>
                    <img src={photoPreview} alt="Preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8 }} />
                    <button
                      onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                      style={{
                        position: "absolute", top: 8, right: 8, background: "#ef4444",
                        border: "none", borderRadius: "50%", width: 28, height: 28,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                      }}
                    >
                      <X size={16} color="#fff" />
                    </button>
                  </div>
                ) : (
                  <label style={{
                    width: "100%", padding: 16, border: "2px dashed #334155", borderRadius: 8,
                    background: "#0f172a", color: "#94a3b8", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20
                  }}>
                    <Camera size={20} /> Foto aufnehmen
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} style={{ display: "none" }} />
                  </label>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    width: "100%", padding: 14, borderRadius: 8, border: "none",
                    background: "#3b82f6", color: "#fff", fontSize: 16, fontWeight: 600,
                    cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                  }}
                >
                  <Save size={18} /> {loading ? "Speichern..." : "Kontrolle speichern"}
                </button>
              </>
            ) : (
              /* History Tab */
              <>
                {historyLoading ? (
                  <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Lade Verlauf...</div>
                ) : history.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Noch keine Kontrollen</div>
                ) : (
                  history.map((scan, i) => (
                    <div key={scan.id} style={{ padding: 12, background: "#0f172a", borderRadius: 8, marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            width: 12, height: 12, borderRadius: "50%",
                            background: STATUS_CONFIG[scan.status]?.color || "#94a3b8"
                          }} />
                          <span style={{ color: STATUS_CONFIG[scan.status]?.color || "#94a3b8", fontWeight: 500 }}>
                            {STATUS_CONFIG[scan.status]?.label || scan.status}
                          </span>
                          {i === 0 && (
                            <span style={{ fontSize: 10, background: "#3b82f6", color: "#fff", padding: "2px 6px", borderRadius: 4 }}>
                              Aktuell
                            </span>
                          )}
                        </div>
                        <span style={{ color: "#64748b", fontSize: 12 }}>
                          {formatTime(scan.scanned_at || scan.created_at)}
                        </span>
                      </div>
                      
                      <div style={{ color: "#94a3b8", fontSize: 13 }}>
                        👤 {scan.users?.first_name || "Unbekannt"} {scan.users?.last_name || ""}
                      </div>
                      
                      {/* Type-specific info */}
                      {scan.consumption !== null && scan.consumption !== undefined && (
                        <div style={{ color: "#e2e8f0", fontSize: 13, marginTop: 4 }}>
                          🧀 Köderverbrauch: {scan.consumption * 25}%
                        </div>
                      )}
                      {scan.trap_state !== null && scan.trap_state !== undefined && (
                        <div style={{ color: "#e2e8f0", fontSize: 13, marginTop: 4 }}>
                          🪤 {scan.trap_state === 0 ? "Nicht ausgelöst" : scan.trap_state === 1 ? "Ausgelöst" : "Tier gefunden"}
                        </div>
                      )}
                      {scan.quantity && (
                        <div style={{ color: "#e2e8f0", fontSize: 13, marginTop: 4 }}>
                          🐛 Insekten: {scan.quantity}
                        </div>
                      )}
                      
                      {scan.findings && (
                        <div style={{ color: "#e2e8f0", fontSize: 13, marginTop: 4 }}>📋 {scan.findings}</div>
                      )}
                      {scan.notes && (
                        <div style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic", marginTop: 4 }}>{scan.notes}</div>
                      )}
                      {scan.photo_url && (
                        <img
                          src={scan.photo_url}
                          alt="Scan"
                          onClick={() => window.open(scan.photo_url)}
                          style={{ width: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 6, marginTop: 8, cursor: "pointer" }}
                        />
                      )}
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}