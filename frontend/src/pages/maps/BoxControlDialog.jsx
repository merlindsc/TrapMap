/* ============================================================
   TRAPMAP — BOX CONTROL DIALOG
   Mit Foto-Upload und Lightbox
   ============================================================ */

import { useState, useEffect } from "react";
import { X, Edit, History as HistoryIcon, Save, Camera } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function BoxControlDialog({ box, onClose, onEdit, onSave }) {
  const token = localStorage.getItem("trapmap_token");
  const user = JSON.parse(localStorage.getItem("trapmap_user") || "{}");

  /* --------------------------------------------------------
     BOX-TYPE ERKENNUNG
  --------------------------------------------------------- */
  const rawName = (box?.box_type_name || box?.type_name || box?.box_type || "") + "";
  const rawCategory = (box?.box_type_category || box?.category || "") + "";
  const typeSource = `${rawName} ${rawCategory}`.toLowerCase();

  let boxType = "default";

  if (typeSource.includes("schlag") || typeSource.includes("snap")) {
    boxType = "schlagfalle";
  } else if (typeSource.includes("gift") || typeSource.includes("bait") || typeSource.includes("köder")) {
    boxType = "giftbox";
  } else if (typeSource.includes("monitoring") && (typeSource.includes("maus") || typeSource.includes("ratte") || typeSource.includes("rodent") || typeSource.includes("nager"))) {
    boxType = "monitoring_rodent";
  } else if (typeSource.includes("insekt") || typeSource.includes("insect") || typeSource.includes("uv") || typeSource.includes("schabe") || typeSource.includes("motte") || typeSource.includes("käfer")) {
    boxType = "monitoring_insect";
  }

  if (boxType === "default") {
    boxType = "giftbox";
  }

  /* --------------------------------------------------------
     FORM STATE
  --------------------------------------------------------- */
  const [status, setStatus] = useState("green");
  const [consumption, setConsumption] = useState(0);
  const [quantity, setQuantity] = useState("none");
  const [trapState, setTrapState] = useState(0);
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Lightbox
  const [lightboxImage, setLightboxImage] = useState(null);

  /* --------------------------------------------------------
     AUTO-STATUS-FUNKTION
  --------------------------------------------------------- */
  function computeStatus() {
    if (boxType === "schlagfalle") {
      if (trapState === 0) return "green";
      if (trapState === 1) return "yellow";
      if (trapState === 2) return "red";
    }

    if (boxType === "giftbox" || boxType === "monitoring_rodent") {
      switch (consumption) {
        case 0: return "green";
        case 1: return "yellow";
        case 2: return "yellow";
        case 3: return "red";
        case 4: return "red";
        default: return "green";
      }
    }

    if (boxType === "monitoring_insect") {
      if (quantity === "none") return "green";
      if (quantity === "0-5") return "yellow";
      if (quantity === "5-10") return "yellow";
      return "red";
    }

    return "green";
  }

  useEffect(() => {
    setStatus(computeStatus());
  }, [consumption, quantity, trapState, boxType]);

  /* --------------------------------------------------------
     FOTO HANDLING
  --------------------------------------------------------- */
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
  };

  /* --------------------------------------------------------
     HISTORY LADEN
  --------------------------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        const dt = new Date();
        dt.setDate(dt.getDate() - 90);

        const res = await fetch(
          `${API}/scans?box_id=${box.id}&after=${dt.toISOString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const json = await res.json();
        const scans = Array.isArray(json) ? json : json.data || [];
        setHistory(scans);
      } catch (err) {
        console.error("History Fehler:", err);
      }
    }
    load();
  }, [box.id, token]);

  /* --------------------------------------------------------
     SAVE
  --------------------------------------------------------- */
  async function handleSave() {
    setSaving(true);

    try {
      if (photo) {
        const formData = new FormData();
        formData.append("box_id", box.id);
        formData.append("user_id", user.id);
        formData.append("status", status);
        formData.append("notes", notes || "");
        
        if (boxType === "schlagfalle") formData.append("trap_state", trapState);
        if (boxType === "giftbox" || boxType === "monitoring_rodent") formData.append("consumption", consumption);
        if (boxType === "monitoring_insect") formData.append("quantity", quantity);
        
        formData.append("photo", photo);

        const res = await fetch(`${API}/scans`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        if (!res.ok) {
          const err = await res.json();
          alert("Fehler: " + (err.error || "Unbekannter Fehler"));
          setSaving(false);
          return;
        }
      } else {
        const data = {
          box_id: box.id,
          user_id: user.id,
          status: status,
          notes: notes || null,
          trap_state: boxType === "schlagfalle" ? trapState : null,
          consumption: (boxType === "giftbox" || boxType === "monitoring_rodent") ? consumption : null,
          quantity: boxType === "monitoring_insect" ? quantity : null
        };

        const res = await fetch(`${API}/scans`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });

        if (!res.ok) {
          const err = await res.json();
          alert("Fehler: " + (err.error || "Unbekannter Fehler"));
          setSaving(false);
          return;
        }
      }

      onSave();
    } catch (e) {
      console.error("Scan error:", e);
      alert("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  /* --------------------------------------------------------
     STATUS FARBE
  --------------------------------------------------------- */
  const getStatusColor = (s) => {
    switch (s) {
      case "green": return "#10b981";
      case "yellow": return "#eab308";
      case "red": return "#dc2626";
      default: return "#6b7280";
    }
  };

  /* --------------------------------------------------------
     UI
  --------------------------------------------------------- */
  return (
    <>
      {/* LIGHTBOX */}
      {lightboxImage && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer"
          }}
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: "50%",
              width: "44px",
              height: "44px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={24} color="#fff" />
          </button>
          <img 
            src={lightboxImage} 
            alt="Scan Foto" 
            style={{ 
              maxWidth: "90vw", 
              maxHeight: "90vh", 
              borderRadius: "8px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
            }} 
          />
        </div>
      )}

      {/* MAIN DIALOG */}
      <div
        className="dialog-overlay-v6"
        onClick={(e) => e.target.className === "dialog-overlay-v6" && onClose()}
      >
        <div className="dialog-v6" onClick={(e) => e.stopPropagation()}>
          
          {/* HEADER */}
          <div className="dialog-header-v6">
            <div>
              <h2>✓ Kontrolle: {box.number || box.box_name}</h2>
              <div style={{ color: "#aaa", fontSize: "11px", marginTop: "2px" }}>
                Typ: <b>{rawName || boxType}</b>
              </div>
            </div>
            <button className="dialog-close-v6" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* BODY */}
          <div className="dialog-body-v6">

            {/* STATUS ANZEIGE */}
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "10px", 
              padding: "12px", 
              background: "#1a1a1a", 
              borderRadius: "8px",
              marginBottom: "16px"
            }}>
              <div style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: getStatusColor(status)
              }} />
              <span style={{ color: "#fff" }}>
                Status: <b>{status.toUpperCase()}</b>
              </span>
            </div>

            {/* SCHLAGFALLE */}
            {boxType === "schlagfalle" && (
              <>
                <label>Zustand *</label>
                <select value={trapState} onChange={(e) => setTrapState(Number(e.target.value))}>
                  <option value={0}>Nicht ausgelöst</option>
                  <option value={1}>Ausgelöst</option>
                  <option value={2}>Tier gefunden</option>
                </select>
              </>
            )}

            {/* GIFT & MONITORING */}
            {(boxType === "giftbox" || boxType === "monitoring_rodent") && (
              <>
                <label>Köderverbrauch *</label>
                <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                  {[0, 1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setConsumption(n)}
                      style={{
                        flex: 1,
                        padding: "10px",
                        background: consumption === n ? "#6366f1" : "#1a1a1a",
                        color: "#fff",
                        borderRadius: "6px",
                        border: consumption === n ? "2px solid #6366f1" : "1px solid #444"
                      }}
                    >
                      {n * 25}%
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* INSEKTEN */}
            {boxType === "monitoring_insect" && (
              <>
                <label>Insektenmenge *</label>
                <select value={quantity} onChange={(e) => setQuantity(e.target.value)}>
                  <option value="none">Keine</option>
                  <option value="0-5">0–5</option>
                  <option value="5-10">5–10</option>
                  <option value="10-20">10–20</option>
                  <option value="20+">20+</option>
                </select>
              </>
            )}

            {/* NOTIZEN */}
            <label>
              Notizen
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bemerkungen zur Kontrolle..."
              />
            </label>

            {/* FOTO UPLOAD */}
            <label>Foto (optional)</label>
            <div style={{ marginTop: "8px" }}>
              {photoPreview ? (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img 
                    src={photoPreview} 
                    alt="Vorschau" 
                    style={{ 
                      maxWidth: "100%", 
                      maxHeight: "150px", 
                      borderRadius: "8px",
                      border: "1px solid #404040",
                      cursor: "pointer"
                    }}
                    onClick={() => setLightboxImage(photoPreview)}
                  />
                  <button
                    onClick={removePhoto}
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      background: "#dc2626",
                      border: "none",
                      borderRadius: "50%",
                      width: "28px",
                      height: "28px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <X size={16} color="#fff" />
                  </button>
                </div>
              ) : (
                <label style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  padding: "20px",
                  background: "#1a1a1a",
                  border: "2px dashed #404040",
                  borderRadius: "8px",
                  cursor: "pointer"
                }}>
                  <Camera size={28} color="#6b7280" />
                  <span style={{ color: "#9ca3af", fontSize: "13px" }}>Foto aufnehmen</span>
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

            {/* HISTORY */}
            {history.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <button 
                  className="btn-secondary-v6" 
                  onClick={() => setShowHistory(!showHistory)}
                  style={{ width: "100%" }}
                >
                  <HistoryIcon size={16} /> Historie ({history.length})
                </button>

                {showHistory && (
                  <div style={{ 
                    marginTop: "12px", 
                    maxHeight: "250px", 
                    overflowY: "auto",
                    background: "#1a1a1a",
                    borderRadius: "8px",
                    padding: "8px"
                  }}>
                    {history.slice(0, 20).map((scan) => (
                      <div 
                        key={scan.id} 
                        style={{ 
                          display: "flex", 
                          gap: "12px", 
                          padding: "10px",
                          borderBottom: "1px solid #333",
                          alignItems: "center"
                        }}
                      >
                        <div style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: getStatusColor(scan.status),
                          flexShrink: 0
                        }} />
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", color: "#fff" }}>
                            {scan.scanned_at 
                              ? new Date(scan.scanned_at).toLocaleString("de-DE", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })
                              : "—"
                            }
                          </div>
                          <div style={{ fontSize: "11px", color: "#6b7280" }}>
                            {scan.user_name || "Unbekannt"}
                          </div>
                          {scan.notes && (
                            <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
                              {scan.notes}
                            </div>
                          )}
                        </div>

                        {scan.photo_url && (
                          <img 
                            src={scan.photo_url} 
                            alt="Scan" 
                            style={{ 
                              width: "44px", 
                              height: "44px", 
                              objectFit: "cover",
                              borderRadius: "6px",
                              cursor: "pointer",
                              flexShrink: 0
                            }}
                            onClick={() => setLightboxImage(scan.photo_url)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* FOOTER */}
          <div className="dialog-footer-v6">
            <button className="btn-secondary-v6" onClick={onEdit}>
              <Edit size={16} /> Bearbeiten
            </button>

            <button className="btn-secondary-v6" onClick={onClose}>
              Abbrechen
            </button>

            <button 
              className="btn-primary-v6" 
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={16} /> {saving ? "..." : "Speichern"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}