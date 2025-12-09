/* ============================================================
   TRAPMAP — SCAN DIALOG (ERSATZ)
   mit automatischer Statuslogik + BoxTyp-Feldern
   ============================================================ */

import React, { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL;

function autoStatus(boxType, consumption, quantity, trapState) {
  // Schlagfalle
  if (boxType === "schlagfalle") {
    if (trapState === 0) return "green";   // nicht ausgelöst
    if (trapState === 1) return "yellow";  // ausgelöst
    if (trapState === 2) return "red";     // Tier drin
  }

  // Köder / Monitoring
  if (boxType === "monitoring_rodent" || boxType === "giftbox") {
    switch (consumption) {
      case 0: return "green"; 
      case 1: return "yellow";  // 20%
      case 2: return "orange";  // 40%
      case 3: return "red";     // 60%
      case 4: return "red";     // 80–100%
      default: return "green";
    }
  }

  // Insekten
  if (boxType === "monitoring_insect") {
    if (quantity === "none") return "green";
    if (quantity === "0-5") return "yellow";
    if (quantity === "5-10") return "orange";
    return "red"; // 10–20, 20+
  }

  return "green";
}

export default function ScanDialog({ isOpen, onClose, box, reload }) {
  if (!isOpen) return null;

  const token = localStorage.getItem("trapmap_token");

  // Felder
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("green");
  const [consumption, setConsumption] = useState(0);
  const [trapState, setTrapState] = useState(0);
  const [quantity, setQuantity] = useState("none");
  const [photo, setPhoto] = useState(null);

  // Box-Typ bestimmen
  const typeName = (box?.box_type_name || "").toLowerCase();
  let boxType = "default";

  if (typeName.includes("schlag") || typeName.includes("trap"))
    boxType = "schlagfalle";
  else if (typeName.includes("gift") || typeName.includes("bait"))
    boxType = "giftbox";
  else if (typeName.includes("rodent") || typeName.includes("nager"))
    boxType = "monitoring_rodent";
  else if (typeName.includes("insekt") || typeName.includes("insect"))
    boxType = "monitoring_insect";

  // Status automatisch aktualisieren
  useEffect(() => {
    const auto = autoStatus(boxType, consumption, quantity, trapState);
    setStatus(auto);
  }, [consumption, quantity, trapState, boxType]);

  async function submitScan(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append("box_id", box.id);
    formData.append("status", status);
    formData.append("notes", notes);

    if (photo) formData.append("photo", photo);

    if (boxType === "schlagfalle") formData.append("trap_state", trapState);
    if (boxType === "monitoring_rodent" || boxType === "giftbox")
      formData.append("consumption", consumption);
    if (boxType === "monitoring_insect")
      formData.append("quantity", quantity);

    await fetch(`${API}/scans`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    reload();
    onClose();
  }

  return (
    <div className="scan-dialog-overlay" onClick={onClose}>
      <div className="scan-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>✓ Kontrolle: {box.box_name}</h2>

        <form onSubmit={submitScan}>
          {/* SCHLAGFALLE */}
          {boxType === "schlagfalle" && (
            <>
              <label>Zustand der Falle</label>
              <select
                value={trapState}
                onChange={(e) => setTrapState(Number(e.target.value))}
              >
                <option value={0}>Nicht ausgelöst</option>
                <option value={1}>Ausgelöst</option>
                <option value={2}>Tier gefunden</option>
              </select>
            </>
          )}

          {/* KÖDER / GIFT */}
          {(boxType === "giftbox" || boxType === "monitoring_rodent") && (
            <>
              <label>Köderverbrauch</label>
              <div className="consumption-buttons">
                {[0, 1, 2, 3, 4].map((num) => (
                  <button
                    type="button"
                    key={num}
                    className={consumption === num ? "active" : ""}
                    onClick={() => setConsumption(num)}
                  >
                    {num * 20}%
                  </button>
                ))}
              </div>
            </>
          )}

          {/* INSEKTEN */}
          {boxType === "monitoring_insect" && (
            <>
              <label>Insektenmenge</label>
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
            </>
          )}

          <label>Notizen</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <label>Foto (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files[0])}
          />

          <button type="submit" className="btn-primary">
            Speichern
          </button>
        </form>

        <button className="btn-secondary" onClick={onClose}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}
