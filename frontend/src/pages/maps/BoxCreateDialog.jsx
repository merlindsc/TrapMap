/* ============================================================
   TRAPMAP — BOX CREATE DIALOG
   Automatische Nummerierung pro Objekt
   ============================================================ */

import { useState } from "react";
import { X, Save } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function BoxCreateDialog({ latLng, objectId, boxTypes, onClose, onSave }) {
  const token = localStorage.getItem("trapmap_token");

  const [boxTypeId, setBoxTypeId] = useState("");
  const [notes, setNotes] = useState("");
  const [intervalType, setIntervalType] = useState("fixed");
  const [intervalFixed, setIntervalFixed] = useState(30);
  const [intervalRangeStart, setIntervalRangeStart] = useState(20);
  const [intervalRangeEnd, setIntervalRangeEnd] = useState(30);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!boxTypeId) {
      alert("Bitte Box-Typ auswählen!");
      return;
    }

    setSaving(true);

    const interval =
      intervalType === "fixed"
        ? intervalFixed
        : Math.floor((intervalRangeStart + intervalRangeEnd) / 2);

    const data = {
      object_id: objectId,
      box_type_id: parseInt(boxTypeId),
      notes,
      control_interval_days: interval,
      lat: latLng.lat,
      lng: latLng.lng,
    };

    try {
      const res = await fetch(`${API}/boxes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        alert("Fehler: " + (err.error || "Unbekannt"));
        setSaving(false);
        return;
      }

      onSave();
    } catch (e) {
      console.error("❌ Error creating box:", e);
      alert("❌ Fehler beim Erstellen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="dialog-overlay-v6"
      onClick={(e) => {
        if (e.target.className === "dialog-overlay-v6") onClose();
      }}
    >
      <div className="dialog-v6" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header-v6">
          <h2>📦 Neue Box erstellen</h2>
          <button className="dialog-close-v6" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="dialog-body-v6">
          
          {/* INFO */}
          <div style={{
            padding: "12px",
            background: "#1e3a5f",
            borderRadius: "8px",
            color: "#93c5fd",
            fontSize: "13px",
            marginBottom: "16px"
          }}>
            ℹ️ Die Box-Nummer wird automatisch vergeben
          </div>

          {/* BOX-TYP */}
          <label>
            Box-Typ *
            <select
              value={boxTypeId}
              onChange={(e) => setBoxTypeId(e.target.value)}
              required
            >
              <option value="">Bitte auswählen...</option>
              {boxTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>

          {/* INTERVALL */}
          <label>Kontrollintervall *</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setIntervalType("fixed")}
                style={{
                  padding: "8px 16px",
                  background: intervalType === "fixed" ? "#6366f1" : "#1a1a1a",
                  border: `1px solid ${intervalType === "fixed" ? "#6366f1" : "#404040"}`,
                  borderRadius: "6px",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Fix
              </button>
              <button
                type="button"
                onClick={() => setIntervalType("range")}
                style={{
                  padding: "8px 16px",
                  background: intervalType === "range" ? "#6366f1" : "#1a1a1a",
                  border: `1px solid ${intervalType === "range" ? "#6366f1" : "#404040"}`,
                  borderRadius: "6px",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Range
              </button>
            </div>

            {intervalType === "fixed" && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={intervalFixed}
                  onChange={(e) => setIntervalFixed(parseInt(e.target.value) || 30)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#1a1a1a",
                    border: "1px solid #404040",
                    borderRadius: "6px",
                    color: "#fff",
                    textAlign: "center",
                  }}
                />
                <span style={{ color: "#9ca3af" }}>Tage</span>
              </div>
            )}

            {intervalType === "range" && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={intervalRangeStart}
                  onChange={(e) => setIntervalRangeStart(parseInt(e.target.value) || 20)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#1a1a1a",
                    border: "1px solid #404040",
                    borderRadius: "6px",
                    color: "#fff",
                    textAlign: "center",
                  }}
                />
                <span style={{ color: "#9ca3af" }}>bis</span>
                <input
                  type="number"
                  min={intervalRangeStart}
                  max="365"
                  value={intervalRangeEnd}
                  onChange={(e) => setIntervalRangeEnd(parseInt(e.target.value) || 30)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#1a1a1a",
                    border: "1px solid #404040",
                    borderRadius: "6px",
                    color: "#fff",
                    textAlign: "center",
                  }}
                />
                <span style={{ color: "#9ca3af" }}>Tage</span>
              </div>
            )}
          </div>

          {/* NOTIZEN */}
          <label>
            Notizen
            <textarea
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zusätzliche Informationen..."
            />
          </label>

          {/* POSITION */}
          <div style={{
            padding: "12px",
            background: "#1a1a1a",
            borderRadius: "6px",
            color: "#9ca3af",
            fontSize: "13px",
          }}>
            📍 Position: {latLng.lat.toFixed(6)}, {latLng.lng.toFixed(6)}
          </div>
        </div>

        <div className="dialog-footer-v6">
          <button className="btn-secondary-v6" onClick={onClose}>
            Abbrechen
          </button>
          <button 
            className="btn-primary-v6" 
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? "Erstellen..." : "Erstellen"}
          </button>
        </div>
      </div>
    </div>
  );
}