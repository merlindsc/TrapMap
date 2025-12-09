/* ============================================================
   TRAPMAP — BOX EDIT DIALOG
   Box bearbeiten + Löschen + GPS Verschieben
   ============================================================ */

import { useState } from "react";
import { X, Save, Trash2, MapPin, Move } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function BoxEditDialog({ box, boxTypes, onClose, onSave, onDelete, onRelocate }) {
  const token = localStorage.getItem("trapmap_token");

  const [boxTypeId, setBoxTypeId] = useState(box.box_type_id || "");
  const [notes, setNotes] = useState(box.notes || "");
  const [intervalType, setIntervalType] = useState("fixed");
  const [intervalFixed, setIntervalFixed] = useState(box.control_interval_days || 30);
  const [intervalRangeStart, setIntervalRangeStart] = useState(20);
  const [intervalRangeEnd, setIntervalRangeEnd] = useState(30);
  const [saving, setSaving] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Handle save
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
      box_type_id: parseInt(boxTypeId),
      notes: notes,
      control_interval_days: interval,
    };

    try {
      const res = await fetch(`${API}/boxes/${box.id}`, {
        method: "PATCH",
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
      console.error("❌ Error updating box:", e);
      alert("❌ Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      await fetch(`${API}/boxes/${box.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      onDelete();
    } catch (e) {
      console.error("❌ Error deleting box:", e);
      alert("❌ Fehler beim Löschen");
    }
  };

  // Handle relocate
  const handleRelocate = () => {
    if (onRelocate) {
      onRelocate(box);
    }
  };

  return (
    <div
      className="dialog-overlay-v6"
      onClick={(e) => {
        if (e.target.className === "dialog-overlay-v6") {
          onClose();
        }
      }}
    >
      <div className="dialog-v6" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dialog-header-v6">
          <h2>✏️ Box {box.number || box.box_name} bearbeiten</h2>
          <button className="dialog-close-v6" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="dialog-body-v6">
          
          {/* Box-Typ */}
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

          {/* Kontrollintervall */}
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

          {/* Notizen */}
          <label>
            Notizen
            <textarea
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zusätzliche Informationen..."
            />
          </label>

          {/* Position mit Verschieben-Button */}
          <div style={{
            padding: "12px",
            background: "#1a1a1a",
            borderRadius: "6px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{ color: "#9ca3af", fontSize: "13px" }}>
              <MapPin size={14} style={{ display: "inline", marginRight: "6px" }} />
              {box.lat?.toFixed(6)}, {box.lng?.toFixed(6)}
            </div>
            <button
              type="button"
              onClick={handleRelocate}
              style={{
                padding: "6px 12px",
                background: "#3b82f6",
                border: "none",
                borderRadius: "6px",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px"
              }}
            >
              <Move size={14} /> Verschieben
            </button>
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div style={{
              padding: "16px",
              background: "#7f1d1d",
              border: "1px solid #dc2626",
              borderRadius: "6px",
              marginTop: "16px",
            }}>
              <p style={{ margin: "0 0 12px 0", color: "#fff", fontWeight: "600" }}>
                ⚠️ Box wirklich löschen?
              </p>
              <p style={{ margin: "0 0 16px 0", color: "#fca5a5", fontSize: "13px" }}>
                Diese Aktion kann nicht rückgängig gemacht werden!
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleDelete}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "#dc2626",
                    border: "none",
                    borderRadius: "6px",
                    color: "#fff",
                    cursor: "pointer"
                  }}
                >
                  Ja, löschen
                </button>
                <button
                  className="btn-secondary-v6"
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{ flex: 1 }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="dialog-footer-v6">
          {!showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                marginRight: "auto",
                padding: "8px 16px",
                background: "#dc2626",
                border: "none",
                borderRadius: "6px",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <Trash2 size={16} /> Löschen
            </button>
          )}

          <button className="btn-secondary-v6" onClick={onClose}>
            Abbrechen
          </button>

          <button 
            className="btn-primary-v6" 
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}