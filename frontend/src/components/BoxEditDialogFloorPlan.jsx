/* ============================================================
   TRAPMAP - BOX EDIT DIALOG FOR FLOOR PLANS
   Box bearbeiten auf Lageplan - mit Position
   ============================================================ */

import { useState, useEffect } from "react";
import { X, Save, Move, MapPin } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function BoxEditDialogFloorPlan({ 
  box, 
  boxTypes = [], 
  floorPlanId,
  onClose, 
  onSave,
  onRelocate
}) {
  const token = localStorage.getItem("trapmap_token");

  const [boxName, setBoxName] = useState("");
  const [boxNumber, setBoxNumber] = useState("");
  const [boxTypeId, setBoxTypeId] = useState("");
  const [notes, setNotes] = useState("");
  const [intervalDays, setIntervalDays] = useState(30);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [saving, setSaving] = useState(false);

  // Load box data when box changes
  useEffect(() => {
    if (box && box.id) {
      setBoxName(box.box_name || box.name || "");
      setBoxNumber(box.number || "");
      setBoxTypeId(box.box_type_id || "");
      setNotes(box.notes || "");
      setIntervalDays(box.control_interval_days || 30);
      setPosX(box.pos_x || 0);
      setPosY(box.pos_y || 0);
    }
  }, [box]);

  // GUARD: Don't render if no valid box
  if (!box || !box.id) {
    return null;
  }

  const handleSave = async () => {
    if (!boxName.trim()) {
      alert("Bitte Box-Name eingeben!");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${API}/boxes/${box.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          box_name: boxName,
          number: boxNumber,
          box_type_id: boxTypeId ? parseInt(boxTypeId) : null,
          notes: notes,
          control_interval_days: intervalDays,
        }),
      });

      if (!res.ok) throw new Error("Update failed");

      if (onSave) onSave();
    } catch (e) {
      console.error("Error updating box:", e);
      alert("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleRelocate = () => {
    if (onClose) onClose();
    if (onRelocate) onRelocate(box);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        style={{
          background: "#1e293b",
          borderRadius: 12,
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #334155",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 600, margin: 0 }}>
            Box bearbeiten
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
          {/* Box Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#e2e8f0", marginBottom: 6, fontSize: 14 }}>
              Box-Name *
            </label>
            <input
              type="text"
              value={boxName}
              onChange={(e) => setBoxName(e.target.value)}
              placeholder="z.B. Schlagfalle Eingang"
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#0f172a",
                color: "#e2e8f0",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Box Number */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#e2e8f0", marginBottom: 6, fontSize: 14 }}>
              Box-Nummer
            </label>
            <input
              type="text"
              value={boxNumber}
              onChange={(e) => setBoxNumber(e.target.value)}
              placeholder="z.B. 1, 2, 3..."
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#0f172a",
                color: "#e2e8f0",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Box Type */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#e2e8f0", marginBottom: 6, fontSize: 14 }}>
              Box-Typ
            </label>
            <select
              value={boxTypeId}
              onChange={(e) => setBoxTypeId(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#0f172a",
                color: "#e2e8f0",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            >
              <option value="">Bitte auswaehlen...</option>
              {boxTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Control Interval */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#e2e8f0", marginBottom: 6, fontSize: 14 }}>
              Kontrollintervall (Tage)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={intervalDays}
              onChange={(e) => setIntervalDays(parseInt(e.target.value) || 30)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#0f172a",
                color: "#e2e8f0",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#e2e8f0", marginBottom: 6, fontSize: 14 }}>
              Notizen
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zusaetzliche Informationen..."
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#0f172a",
                color: "#e2e8f0",
                fontSize: 14,
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Position Info & Relocate Button */}
          <div
            style={{
              padding: 16,
              background: "#0f172a",
              borderRadius: 8,
              border: "1px solid #334155",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <MapPin size={16} style={{ color: "#3b82f6" }} />
              <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 500 }}>
                Position auf Lageplan
              </span>
            </div>
            
            <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12 }}>
              X: {posX.toFixed(1)}% | Y: {posY.toFixed(1)}%
            </div>

            <button
              onClick={handleRelocate}
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid #3b82f6",
                background: "#3b82f620",
                color: "#3b82f6",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <Move size={16} />
              Position aendern
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid #334155",
            display: "flex",
            gap: 12,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "12px 20px",
              borderRadius: 8,
              border: "1px solid #334155",
              background: "transparent",
              color: "#94a3b8",
              cursor: "pointer",
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "12px 20px",
              borderRadius: 8,
              border: "none",
              background: "#3b82f6",
              color: "#fff",
              cursor: saving ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 500,
            }}
          >
            <Save size={16} />
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}