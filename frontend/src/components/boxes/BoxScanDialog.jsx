/* ============================================================
   TRAPMAP — BOX CONTROL DIALOG (AUTO STATUS VERSION)
   Kontrolle-Dialog mit automatischer Status-Berechnung
   ============================================================ */

import { useState, useEffect } from "react";
import { X, Edit, History as HistoryIcon, Save } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function BoxControlDialog({ box, onClose, onEdit, onSave }) {
  const token = localStorage.getItem("trapmap_token");
  const userStr = localStorage.getItem("trapmap_user");
  const user = userStr ? JSON.parse(userStr) : null;

  // ============================================
  // FORM STATE
  // ============================================
  const [status, setStatus] = useState("green");
  const [consumption, setConsumption] = useState(0); // 0–4 (0–100% Köder)
  const [quantity, setQuantity] = useState("none");  // Insektenmenge
  const [trapState, setTrapState] = useState(0);     // Schlagfalle
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState(null);

  // ============================================
  // BOX TYPE
  // ============================================
  const typeName = (box.box_type_name || "").toLowerCase();

  let boxType = "default";
  if (typeName.includes("schlag") || typeName.includes("trap")) boxType = "schlagfalle";
  else if (typeName.includes("gift") || typeName.includes("bait")) boxType = "giftbox";
  else if (typeName.includes("rodent") || typeName.includes("nager")) boxType = "monitoring_rodent";
  else if (typeName.includes("insekt") || typeName.includes("insect")) boxType = "monitoring_insect";

  // ============================================
  // 🔥 AUTO-STATUS-BERECHNUNG
  // ============================================
  function autoStatus() {
    if (boxType === "schlagfalle") {
      if (trapState === 0) return "green";
      if (trapState === 1) return "yellow";
      if (trapState === 2) return "red";
    }

    if (boxType === "monitoring_rodent" || boxType === "giftbox") {
      switch (consumption) {
        case 0: return "green";
        case 1: return "yellow";
        case 2: return "orange";
        case 3: return "red";
        case 4: return "red";
        default: return "green";
      }
    }

    if (boxType === "monitoring_insect") {
      if (quantity === "none") return "green";
      if (quantity === "0-5") return "yellow";
      if (quantity === "5-10") return "orange";
      return "red";
    }

    return "green";
  }

  useEffect(() => {
    setStatus(autoStatus());
  }, [consumption, quantity, trapState]);

  // ============================================
  // HISTORY
  // ============================================
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const dt = new Date();
        dt.setDate(dt.getDate() - 90);

        const res = await fetch(`${API}/scans?box_id=${box.id}&after=${dt.toISOString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const json = await res.json();
        const scans = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];

        setHistory(scans);
      } catch {}
    }
    load();
  }, []);

  // ============================================
  // SAVE
  // ============================================
  const handleSave = async () => {
    const form = new FormData();
    form.append("box_id", box.id);
    form.append("user_id", user.id);
    form.append("status", status);
    form.append("notes", notes);

    if (photo) form.append("photo", photo);

    if (boxType === "schlagfalle") form.append("trap_state", trapState);
    if (boxType === "giftbox" || boxType === "monitoring_rodent")
      form.append("consumption", consumption);
    if (boxType === "monitoring_insect")
      form.append("quantity", quantity);

    await fetch(`${API}/scans`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    onSave();
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="dialog-overlay-v6" onClick={(e) => e.target.className === "dialog-overlay-v6" && onClose()}>
      <div className="dialog-v6" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="dialog-header-v6">
          <h2>✓ Kontrolle: {box.box_name}</h2>
          <button className="dialog-close-v6" onClick={onClose}><X size={20} /></button>
        </div>

        {/* BODY */}
        <div className="dialog-body-v6">

          {/* 🔥 SCHLAGFALLE */}
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

          {/* 🔥 RODENT + GIFTBOX */}
          {(boxType === "monitoring_rodent" || boxType === "giftbox") && (
            <>
              <label>Köderverbrauch *</label>
              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                {[0,1,2,3,4].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setConsumption(n)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      background: consumption === n ? "#6366f1" : "#1a1a1a",
                      border: consumption === n ? "2px solid #6366f1" : "1px solid #404040",
                      color: "#fff",
                      borderRadius: "6px"
                    }}
                  >
                    {n * 20}%
                  </button>
                ))}
              </div>
            </>
          )}

          {/* 🔥 INSEKTEN */}
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

          {/* COMMON FIELDS */}
          <label>Notizen</label>
          <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />

          <label>Foto (optional)</label>
          <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} />

          {/* HISTORY */}
          {history.length > 0 && (
            <>
              <button className="btn-secondary-v6" onClick={() => setShowHistory(!showHistory)}>
                <HistoryIcon /> {showHistory ? "History ausblenden" : "History anzeigen"}
              </button>

              {showHistory && (
                <div style={{ marginTop: "12px", maxHeight: "200px", overflowY: "auto" }}>
                  {history.map(scan => (
                    <div key={scan.id} style={{ display: "flex", gap: "8px", padding: "6px 0",
                      borderBottom: "1px solid #333" }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: scan.status === "green" ? "#10b981" :
                                    scan.status === "yellow" ? "#eab308" :
                                    scan.status === "orange" ? "#fb923c" :
                                    "#dc2626"
                      }} />
                      <span style={{ color: "#ccc" }}>
                        {new Date(scan.created_at).toLocaleDateString("de-DE")}
                      </span>
                      <span style={{ color: "#fff" }}>{scan.technician_name || "Unbekannt"}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>

        {/* FOOTER — Bearbeiten & Speichern bleiben erhalten */}
        <div className="dialog-footer-v6">
          <button className="btn-secondary-v6" onClick={onEdit}>
            <Edit size={16} /> Bearbeiten
          </button>

          <button className="btn-secondary-v6" onClick={onClose}>
            Abbrechen
          </button>

          <button className="btn-primary-v6" onClick={handleSave}>
            <Save size={16} /> Speichern
          </button>
        </div>

      </div>
    </div>
  );
}
