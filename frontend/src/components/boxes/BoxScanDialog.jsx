/* ============================================================
   UNIFIED BOX SCAN DIALOG
   Für Maps UND Lageplan - mit Typ-spezifischen Kontrollen
   
   WICHTIG: GPS wird NUR für Boxen OHNE floor_plan_id geholt!
   Lageplan-Boxen behalten ihre Position.
   ============================================================ */

import { useState, useEffect } from "react";
import { X, CheckCircle, Clock, Camera, AlertCircle, History, Save, MapPin, Navigation } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

const STATUS_CONFIG = {
  green: { label: "OK", icon: "✔", color: "#10b981", bg: "#10b98120" },
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
  
  // GPS State - NUR für Boxen ohne floor_plan_id
  const [gpsPosition, setGpsPosition] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [updateGps, setUpdateGps] = useState(false); // User entscheidet ob GPS aktualisiert wird
  
  // Type-specific state
  const [consumption, setConsumption] = useState(0);
  const [trapState, setTrapState] = useState(0);
  const [quantity, setQuantity] = useState("none");

  // ============================================
  // Check if this is a GPS box (not on floor plan)
  // ============================================
  const isGpsBox = !box.floor_plan_id;
  const isFloorPlanBox = !!box.floor_plan_id;

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
  // Get GPS Position - Manuell aufrufen!
  // ============================================
  const fetchGpsPosition = () => {
    if (!("geolocation" in navigator)) {
      setGpsError("GPS nicht verfügbar");
      return;
    }
    
    setGpsLoading(true);
    setGpsError(null);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setGpsLoading(false);
        setUpdateGps(true); // Aktiviere GPS-Update
        console.log("📍 GPS Position erhalten:", position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.warn("📍 GPS Fehler:", error.message);
        setGpsError(error.message);
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

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

      // GPS NUR senden wenn User es aktiviert hat
      if (isGpsBox && updateGps && gpsPosition) {
        formData.append("latitude", gpsPosition.latitude);
        formData.append("longitude", gpsPosition.longitude);
        console.log("📍 Sende GPS mit Scan:", gpsPosition.latitude, gpsPosition.longitude);
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
          padding: "12px 24px", borderRadius: 8, zIndex: 10001,
          background: toast.type === "success" ? "#10b981" : "#ef4444",
          color: "#fff", fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
        }}>
          {toast.message}
        </div>
      )}

      {/* Spinner Animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Dialog */}
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        zIndex: 10000, padding: 0
      }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={{
          width: "100%", maxWidth: 500, maxHeight: "90vh",
          background: "#1e293b", borderRadius: "16px 16px 0 0",
          display: "flex", flexDirection: "column", overflow: "hidden"
        }} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={{
            padding: 16, borderBottom: "1px solid #334155",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 12, height: 12, borderRadius: "50%",
                  background: STATUS_CONFIG[box.current_status]?.color || "#6b7280"
                }} />
                <span style={{ color: "#fff", fontWeight: 600, fontSize: 18 }}>
                  Box {box.number}
                </span>
                {/* Position Info */}
                {isFloorPlanBox && box.grid_position && (
                  <span style={{
                    background: "#3b82f6", color: "#fff", padding: "2px 8px",
                    borderRadius: 4, fontSize: 12, fontFamily: "monospace"
                  }}>
                    📍 {box.grid_position}
                  </span>
                )}
                {isGpsBox && (
                  <span style={{
                    background: "#22c55e", color: "#fff", padding: "2px 8px",
                    borderRadius: 4, fontSize: 12
                  }}>
                    🛰️ GPS
                  </span>
                )}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                {box.box_types?.name || box.box_type_name || "Unbekannter Typ"}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", color: "#94a3b8",
                cursor: "pointer", padding: 4
              }}
            >
              <X size={24} />
            </button>
          </div>

          {/* GPS Button für GPS-Boxen (optional) */}
          {isGpsBox && (
            <div style={{
              padding: "8px 16px",
              background: updateGps && gpsPosition ? "#22c55e20" : gpsError ? "#ef444420" : "#1e293b",
              borderBottom: "1px solid #334155",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                {gpsLoading ? (
                  <>
                    <div style={{ width: 14, height: 14, border: "2px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                    <span style={{ color: "#93c5fd", fontSize: 13 }}>GPS wird ermittelt...</span>
                  </>
                ) : gpsError ? (
                  <>
                    <AlertCircle size={14} style={{ color: "#f87171", flexShrink: 0 }} />
                    <span style={{ color: "#fca5a5", fontSize: 12 }}>GPS-Fehler: {gpsError}</span>
                  </>
                ) : updateGps && gpsPosition ? (
                  <>
                    <Navigation size={14} style={{ color: "#22c55e", flexShrink: 0 }} />
                    <span style={{ color: "#86efac", fontSize: 12 }}>
                      Neu: {gpsPosition.latitude.toFixed(5)}, {gpsPosition.longitude.toFixed(5)}
                      {gpsPosition.accuracy && ` (±${Math.round(gpsPosition.accuracy)}m)`}
                    </span>
                  </>
                ) : (
                  <span style={{ color: "#94a3b8", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    📍 {box.latitude ? `${box.latitude.toFixed(5)}, ${box.longitude.toFixed(5)}` : "Keine Position"}
                  </span>
                )}
              </div>
              
              {!gpsLoading && (
                <button
                  onClick={() => {
                    if (updateGps) {
                      setUpdateGps(false);
                      setGpsPosition(null);
                      setGpsError(null);
                    } else {
                      fetchGpsPosition();
                    }
                  }}
                  style={{
                    padding: "6px 10px",
                    background: updateGps ? "#ef4444" : "#3b82f6",
                    border: "none",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 11,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    whiteSpace: "nowrap",
                    flexShrink: 0
                  }}
                >
                  {updateGps ? (
                    <>
                      <X size={12} /> Abbrechen
                    </>
                  ) : (
                    <>
                      <Navigation size={12} /> GPS neu
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Lageplan-Info für Floorplan-Boxen */}
          {isFloorPlanBox && (
            <div style={{
              padding: "8px 16px",
              background: "#3b82f620",
              borderBottom: "1px solid #334155",
              display: "flex", alignItems: "center", gap: 8
            }}>
              <MapPin size={16} style={{ color: "#60a5fa" }} />
              <span style={{ color: "#93c5fd", fontSize: 13 }}>
                Position auf Lageplan: {box.grid_position || `${box.pos_x?.toFixed(1)}%, ${box.pos_y?.toFixed(1)}%`}
              </span>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #334155" }}>
            <button
              onClick={() => setActiveTab("scan")}
              style={{
                flex: 1, padding: 12, background: "none", border: "none",
                color: activeTab === "scan" ? "#3b82f6" : "#94a3b8",
                borderBottom: activeTab === "scan" ? "2px solid #3b82f6" : "2px solid transparent",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
              }}
            >
              <CheckCircle size={16} /> Kontrolle
            </button>
            <button
              onClick={() => setActiveTab("history")}
              style={{
                flex: 1, padding: 12, background: "none", border: "none",
                color: activeTab === "history" ? "#3b82f6" : "#94a3b8",
                borderBottom: activeTab === "history" ? "2px solid #3b82f6" : "2px solid transparent",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
              }}
            >
              <History size={16} /> Verlauf ({history.length})
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
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
                            padding: "16px 8px", borderRadius: 8, cursor: "pointer",
                            border: consumption === val ? "2px solid #3b82f6" : "1px solid #334155",
                            background: consumption === val ? "#3b82f620" : "#0f172a",
                            color: consumption === val ? "#60a5fa" : "#94a3b8",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 4
                          }}
                        >
                          <span style={{ fontSize: 18 }}>{val * 25}%</span>
                          <span style={{ fontSize: 10 }}>{["Voll", "¼", "½", "¾", "Leer"][val]}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {boxType === "schlagfalle" && (
                  <>
                    <label style={{ display: "block", color: "#e2e8f0", marginBottom: 8, fontSize: 14 }}>Fallenstatus *</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
                      {[
                        { val: 0, label: "Nicht ausgelöst", icon: "✓" },
                        { val: 1, label: "Ausgelöst", icon: "⚡" },
                        { val: 2, label: "Tier gefunden", icon: "🐭" }
                      ].map(({ val, label, icon }) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setTrapState(val)}
                          style={{
                            padding: "16px 8px", borderRadius: 8, cursor: "pointer",
                            border: trapState === val ? "2px solid #3b82f6" : "1px solid #334155",
                            background: trapState === val ? "#3b82f620" : "#0f172a",
                            color: trapState === val ? "#60a5fa" : "#94a3b8",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 4
                          }}
                        >
                          <span style={{ fontSize: 22 }}>{icon}</span>
                          <span style={{ fontSize: 11, textAlign: "center" }}>{label}</span>
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
                  padding: 12, background: STATUS_CONFIG[status]?.bg || "#0f172a",
                  borderRadius: 8, marginBottom: 16, display: "flex", alignItems: "center", gap: 8
                }}>
                  <span style={{
                    width: 12, height: 12, borderRadius: "50%",
                    background: STATUS_CONFIG[status]?.color || "#6b7280"
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