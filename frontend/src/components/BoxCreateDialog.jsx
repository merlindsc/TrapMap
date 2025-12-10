import { useState } from "react";
import { X, Save, CheckCircle, AlertCircle } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function BoxCreateDialog({ latLng, objectId, boxTypes, onClose, onSave }) {
  const token = localStorage.getItem("trapmap_token");

  const [boxNumber, setBoxNumber] = useState("");
  const [boxTypeId, setBoxTypeId] = useState("");
  const [notes, setNotes] = useState("");
  const [intervalType, setIntervalType] = useState("fixed");
  const [intervalFixed, setIntervalFixed] = useState(30);
  const [intervalRangeStart, setIntervalRangeStart] = useState(20);
  const [intervalRangeEnd, setIntervalRangeEnd] = useState(30);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
      if (type === "success") onSave();
    }, 1500);
  };

  const handleSave = async () => {
    if (!boxNumber.trim()) {
      showToast("error", "Bitte Box-Nummer eingeben!");
      return;
    }

    const interval = intervalType === "fixed" ? intervalFixed : Math.floor((intervalRangeStart + intervalRangeEnd) / 2);

    const data = {
      object_id: objectId,
      boxtype_id: boxTypeId ? parseInt(boxTypeId) : null,
      number: boxNumber,
      notes,
      control_interval_days: interval,
      lat: latLng.lat,
      lng: latLng.lng,
      current_status: "green",
      active: true
    };

    setLoading(true);
    try {
      const res = await fetch(`${API}/boxes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Fehler beim Erstellen");
      }

      showToast("success", "✓ Box erstellt!");
    } catch (e) {
      console.error("Error creating box:", e);
      showToast("error", e.message || "Fehler beim Erstellen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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

      <div className="dialog-overlay-v6" onClick={(e) => e.target.className === "dialog-overlay-v6" && onClose()}>
        <div className="dialog-v6" onClick={(e) => e.stopPropagation()}>
          <div className="dialog-header-v6">
            <h2>📦 Neue Box erstellen</h2>
            <button className="dialog-close-v6" onClick={onClose}><X size={20} /></button>
          </div>

          <div className="dialog-body-v6">
            <label>
              Box-Nummer *
              <input type="text" value={boxNumber} onChange={(e) => setBoxNumber(e.target.value)} placeholder="z.B. 1, 2, A1, B2..." required />
            </label>

            <label>
              Box-Typ
              <select value={boxTypeId} onChange={(e) => setBoxTypeId(e.target.value)}>
                <option value="">Kein Typ ausgewählt</option>
                {(boxTypes || []).map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </label>

            <label>Kontrollintervall *</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button type="button" onClick={() => setIntervalType("fixed")} style={{
                  padding: "8px 16px", borderRadius: 6, cursor: "pointer",
                  background: intervalType === "fixed" ? "#6366f1" : "#1a1a1a",
                  border: intervalType === "fixed" ? "1px solid #6366f1" : "1px solid #404040",
                  color: "#fff"
                }}>Fix</button>
                <button type="button" onClick={() => setIntervalType("range")} style={{
                  padding: "8px 16px", borderRadius: 6, cursor: "pointer",
                  background: intervalType === "range" ? "#6366f1" : "#1a1a1a",
                  border: intervalType === "range" ? "1px solid #6366f1" : "1px solid #404040",
                  color: "#fff"
                }}>Range</button>
              </div>

              {intervalType === "fixed" && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input type="number" min="1" max="99" value={intervalFixed}
                    onChange={(e) => setIntervalFixed(parseInt(e.target.value) || 30)}
                    style={{ flex: 1, padding: "8px 12px", background: "#1a1a1a", border: "1px solid #404040", borderRadius: 6, color: "#fff", textAlign: "center" }} />
                  <span style={{ color: "#9ca3af" }}>Tage</span>
                </div>
              )}

              {intervalType === "range" && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input type="number" min="1" max="99" value={intervalRangeStart}
                    onChange={(e) => setIntervalRangeStart(parseInt(e.target.value) || 20)}
                    style={{ flex: 1, padding: "8px 12px", background: "#1a1a1a", border: "1px solid #404040", borderRadius: 6, color: "#fff", textAlign: "center" }} />
                  <span style={{ color: "#9ca3af" }}>bis</span>
                  <input type="number" min={intervalRangeStart} max="99" value={intervalRangeEnd}
                    onChange={(e) => setIntervalRangeEnd(parseInt(e.target.value) || 30)}
                    style={{ flex: 1, padding: "8px 12px", background: "#1a1a1a", border: "1px solid #404040", borderRadius: 6, color: "#fff", textAlign: "center" }} />
                  <span style={{ color: "#9ca3af" }}>Tage</span>
                </div>
              )}
            </div>

            <label>
              Notizen
              <textarea rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Zusätzliche Informationen..." />
            </label>

            <div style={{ padding: 12, background: "#1a1a1a", borderRadius: 6, color: "#9ca3af", fontSize: 13 }}>
              📍 Position: {latLng.lat.toFixed(6)}, {latLng.lng.toFixed(6)}
            </div>
          </div>

          <div className="dialog-footer-v6">
            <button className="btn-secondary-v6" onClick={onClose}>Abbrechen</button>
            <button className="btn-primary-v6" onClick={handleSave} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
              <Save size={16} /> {loading ? "Erstellen..." : "Erstellen"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}