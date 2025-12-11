/* ============================================================
   UNIFIED BOX SCAN DIALOG
   Für Maps UND Lageplan - mit Typ-spezifischen Kontrollen
   MIT EMOJI ICONS + BEARBEITEN BUTTON
   ============================================================ */

import { useState, useEffect } from "react";
import { X, CheckCircle, Clock, Camera, AlertCircle, History, Save, Edit } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

const STATUS_CONFIG = {
  green: { label: "OK", icon: "✓", color: "#10b981", bg: "#10b98120" },
  yellow: { label: "Auffällig", icon: "!", color: "#eab308", bg: "#eab30820" },
  orange: { label: "Erhöht", icon: "!!", color: "#f97316", bg: "#f9731620" },
  red: { label: "Befall", icon: "✗", color: "#ef4444", bg: "#ef444420" }
};

// ============================================
// BOX TYPE EMOJI ICONS
// ============================================
const BOX_TYPE_EMOJIS = {
  rat: '🐀',
  mouse: '🐁',
  snapTrap: '⚠️',
  tunnel: '🔶',
  bait: '🟢',
  liveTrap: '🔵',
  monitoring: '👁️',
  moth: '🦋',
  cockroach: '🪳',
  beetle: '🪲',
  insect: '🪰',
  uvLight: '☀️',
};

// Bestimme Emojis basierend auf box_type Name
const getBoxTypeEmojis = (boxTypeName) => {
  if (!boxTypeName) return '';
  
  const name = boxTypeName.toLowerCase();
  let icons = [];
  
  // Schlagfallen-Tunnel
  if ((name.includes('schlagfall') || name.includes('snap')) && name.includes('tunnel')) {
    if (name.includes('ratte') || name.includes('rat')) icons = ['rat', 'tunnel'];
    else if (name.includes('maus') || name.includes('mouse')) icons = ['mouse', 'tunnel'];
    else icons = ['tunnel'];
  }
  // Schlagfalle normal
  else if (name.includes('schlagfall') || name.includes('snap')) {
    if (name.includes('ratte') || name.includes('rat')) icons = ['rat', 'snapTrap'];
    else if (name.includes('maus') || name.includes('mouse')) icons = ['mouse', 'snapTrap'];
    else icons = ['snapTrap'];
  }
  // Köderstation
  else if (name.includes('köder') || name.includes('koeder') || name.includes('bait')) {
    if (name.includes('ratte') || name.includes('rat')) icons = ['rat', 'bait'];
    else if (name.includes('maus') || name.includes('mouse')) icons = ['mouse', 'bait'];
    else icons = ['bait'];
  }
  // Lebendfalle
  else if (name.includes('lebend') || name.includes('live')) {
    if (name.includes('ratte') || name.includes('rat')) icons = ['rat', 'liveTrap'];
    else if (name.includes('maus') || name.includes('mouse')) icons = ['mouse', 'liveTrap'];
    else icons = ['liveTrap'];
  }
  // Monitoring (auch "monitor" für "Käfermonitor" etc.)
  else if (name.includes('monitoring') || name.includes('monitor')) {
    if (name.includes('käfer') || name.includes('kaefer') || name.includes('beetle')) icons = ['beetle', 'monitoring'];
    else if (name.includes('motte') || name.includes('moth')) icons = ['moth', 'monitoring'];
    else if (name.includes('schabe') || name.includes('cockroach')) icons = ['cockroach', 'monitoring'];
    else if (name.includes('ratte') || name.includes('rat')) icons = ['rat', 'monitoring'];
    else if (name.includes('maus') || name.includes('mouse')) icons = ['mouse', 'monitoring'];
    else icons = ['monitoring'];
  }
  // Spezial-Monitore
  else if (name.includes('motte') || name.includes('moth')) icons = ['moth'];
  else if (name.includes('schabe') || name.includes('cockroach')) icons = ['cockroach'];
  else if (name.includes('käfer') || name.includes('kaefer') || name.includes('beetle')) icons = ['beetle'];
  else if (name.includes('insekt') || name.includes('insect')) icons = ['insect'];
  else if (name.includes('uv') || name.includes('licht') || name.includes('light')) icons = ['uvLight'];
  // Fallback Tier
  else if (name.includes('ratte') || name.includes('rat')) icons = ['rat'];
  else if (name.includes('maus') || name.includes('mouse')) icons = ['mouse'];
  
  return icons.map(key => BOX_TYPE_EMOJIS[key] || '').join(' ');
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
  const [consumption, setConsumption] = useState(0);
  const [trapState, setTrapState] = useState(0);
  const [quantity, setQuantity] = useState("none");

  // ============================================
  // Get Box Type Name and Emoji
  // ============================================
  const typeName = box.box_type_name || box.box_types?.name || "";
  const typeEmoji = getBoxTypeEmojis(typeName);
  
  // ============================================
  // Determine Box Type Category
  // ============================================
  const typeNameLower = typeName.toLowerCase();
  
  let boxType = "default";
  if (typeNameLower.includes("schlag") || typeNameLower.includes("trap") || typeNameLower.includes("falle")) {
    boxType = "schlagfalle";
  } else if (typeNameLower.includes("gift") || typeNameLower.includes("bait") || typeNameLower.includes("köder") || typeNameLower.includes("koeder") || typeNameLower.includes("rodent") || typeNameLower.includes("ratte") || typeNameLower.includes("maus")) {
    boxType = "koeder";
  } else if (typeNameLower.includes("insekt") || typeNameLower.includes("insect") || typeNameLower.includes("fliege") || typeNameLower.includes("schabe") || typeNameLower.includes("motte") || typeNameLower.includes("käfer") || typeNameLower.includes("kaefer") || typeNameLower.includes("monitor")) {
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

  // ============================================
  // Handle Edit Click
  // ============================================
  const handleEditClick = () => {
    onClose();
    if (onEdit) {
      onEdit(box);
    }
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
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
        }}>
          {toast.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16
        }}
      >
        {/* Dialog */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#1e293b", borderRadius: 12, width: "100%", maxWidth: 420,
            maxHeight: "90vh", display: "flex", flexDirection: "column",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
          }}
        >
          {/* Header */}
          <div style={{
            padding: 16, borderBottom: "1px solid #334155",
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 600, margin: 0 }}>
                  ✓ Kontrolle: {box.number || box.id}
                </h2>
                {/* Bearbeiten Button */}
                {onEdit && (
                  <button
                    onClick={handleEditClick}
                    style={{
                      padding: "6px 12px",
                      background: "#334155",
                      border: "none",
                      borderRadius: 6,
                      color: "#94a3b8",
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    Bearbeiten
                  </button>
                )}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                {typeEmoji && <span style={{ fontSize: 16 }}>{typeEmoji}</span>}
                <span>Typ: {typeName || "Unbekannt"}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", color: "#94a3b8",
                cursor: "pointer", padding: 4
              }}
            >
              <X size={22} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #334155" }}>
            <button
              onClick={() => setActiveTab("scan")}
              style={{
                flex: 1, padding: 12, background: "none", border: "none",
                color: activeTab === "scan" ? "#3b82f6" : "#94a3b8",
                borderBottom: activeTab === "scan" ? "2px solid #3b82f6" : "2px solid transparent",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                fontWeight: activeTab === "scan" ? 600 : 400
              }}
            >
              <CheckCircle size={16} /> Neue Kontrolle
            </button>
            <button
              onClick={() => setActiveTab("history")}
              style={{
                flex: 1, padding: 12, background: "none", border: "none",
                color: activeTab === "history" ? "#3b82f6" : "#94a3b8",
                borderBottom: activeTab === "history" ? "2px solid #3b82f6" : "2px solid transparent",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                fontWeight: activeTab === "history" ? 600 : 400
              }}
            >
              <History size={16} /> Verlauf ({history.length})
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
            {activeTab === "scan" ? (
              <>
                {/* Type-specific controls */}
                {boxType === "koeder" && (
                  <>
                    <label style={{ display: "block", color: "#e2e8f0", marginBottom: 8, fontSize: 14 }}>Köderverbrauch *</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 20 }}>
                      {[0, 1, 2, 3, 4].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setConsumption(val)}
                          style={{
                            padding: "12px 8px", borderRadius: 8, cursor: "pointer",
                            border: consumption === val ? "2px solid #3b82f6" : "1px solid #334155",
                            background: consumption === val ? "#3b82f620" : "#0f172a",
                            color: consumption === val ? "#3b82f6" : "#94a3b8",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 4
                          }}
                        >
                          <span style={{ fontSize: 16, fontWeight: 600 }}>{val * 25}%</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {boxType === "schlagfalle" && (
                  <>
                    <label style={{ display: "block", color: "#e2e8f0", marginBottom: 8, fontSize: 14 }}>Fallenzustand *</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
                      {[
                        { val: 0, label: "Nicht ausgelöst", icon: "✓" },
                        { val: 1, label: "Ausgelöst", icon: "⚠" },
                        { val: 2, label: "Tier gefunden", icon: "🐀" }
                      ].map(({ val, label, icon }) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setTrapState(val)}
                          style={{
                            padding: "12px 8px", borderRadius: 8, cursor: "pointer",
                            border: trapState === val ? "2px solid #3b82f6" : "1px solid #334155",
                            background: trapState === val ? "#3b82f620" : "#0f172a",
                            color: trapState === val ? "#3b82f6" : "#94a3b8",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 4
                          }}
                        >
                          <span style={{ fontSize: 20 }}>{icon}</span>
                          <span style={{ fontSize: 11 }}>{label}</span>
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

                {/* Current Status Display */}
                <div style={{
                  padding: 12, borderRadius: 8, marginBottom: 16,
                  background: STATUS_CONFIG[status]?.bg || "#0f172a",
                  border: `1px solid ${STATUS_CONFIG[status]?.color || "#334155"}`,
                  display: "flex", alignItems: "center", gap: 8
                }}>
                  <span style={{
                    width: 12, height: 12, borderRadius: "50%",
                    background: STATUS_CONFIG[status]?.color || "#94a3b8"
                  }} />
                  <span style={{ color: STATUS_CONFIG[status]?.color || "#94a3b8", fontWeight: 500 }}>
                    Status: {STATUS_CONFIG[status]?.label || status}
                  </span>
                </div>

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