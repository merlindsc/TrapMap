import { useState, useEffect } from "react";
import { X, Save, CheckCircle, AlertCircle, Camera } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

const STATUS_CONFIG = {
  green: { label: "OK", icon: "✓", color: "#10b981" },
  yellow: { label: "Auffällig", icon: "!", color: "#eab308" },
  orange: { label: "Erhöht", icon: "!!", color: "#f97316" },
  red: { label: "Befall", icon: "✗", color: "#ef4444" }
};

export default function BoxCreateOnPlanDialog({ objectId, floorPlanId, position, onClose, onCreated }) {
  const token = localStorage.getItem("trapmap_token");

  const [boxNumber, setBoxNumber] = useState("");
  const [boxTypeId, setBoxTypeId] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("green");
  const [findings, setFindings] = useState("");
  const [scanNotes, setScanNotes] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [boxTypes, setBoxTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadBoxTypes();
  }, []);

  const loadBoxTypes = async () => {
    try {
      const res = await fetch(`${API}/boxtypes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const types = Array.isArray(data) ? data : (data?.data || []);
      setBoxTypes(types);
    } catch (err) {
      console.error("Error loading box types:", err);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
      if (type === "success") {
        onClose();
        if (onCreated) onCreated();
      }
    }, 1500);
  };

  const handleSubmit = async () => {
    if (!boxNumber.trim()) {
      showToast("error", "Bitte Box-Nummer eingeben");
      return;
    }

    setLoading(true);

    try {
      // 1. Create Box
      const boxData = {
        object_id: objectId,
        floor_plan_id: floorPlanId,
        number: boxNumber,
        boxtype_id: boxTypeId ? parseInt(boxTypeId) : null,
        notes: notes || null,
        pos_x: position.x,
        pos_y: position.y,
        current_status: status,
        active: true
      };

      const boxRes = await fetch(`${API}/boxes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(boxData)
      });

      if (!boxRes.ok) {
        const errData = await boxRes.json();
        throw new Error(errData.error || "Fehler beim Erstellen der Box");
      }

      const newBox = await boxRes.json();

      // 2. Create initial scan
      if (newBox && newBox.id) {
        const formData = new FormData();
        formData.append("box_id", newBox.id);
        formData.append("status", status);
        if (findings) formData.append("findings", findings);
        if (scanNotes) formData.append("notes", scanNotes);
        if (photo) formData.append("photo", photo);

        await fetch(`${API}/scans`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
      }

      showToast("success", "Box erstellt!");
    } catch (err) {
      console.error("Error creating box:", err);
      showToast("error", err.message || "Fehler beim Erstellen");
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

      <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20
      }}>
        <div style={{
          background: "#1e293b", borderRadius: 12, width: "100%", maxWidth: 480,
          maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column"
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px", borderBottom: "1px solid #334155"
          }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: 18 }}>📦 Neue Box erstellen</div>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>Position: {position.x.toFixed(1)}%, {position.y.toFixed(1)}%</div>
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}>
              <X size={24} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
            {/* Box Info Section */}
            <div style={{ marginBottom: 20, padding: 16, background: "#0f172a", borderRadius: 8 }}>
              <div style={{ color: "#3b82f6", fontWeight: 600, marginBottom: 12 }}>Box-Informationen</div>
              
              <div style={{ color: "#e2e8f0", marginBottom: 8, fontSize: 14 }}>Box-Nummer *</div>
              <input type="text" value={boxNumber} onChange={(e) => setBoxNumber(e.target.value)}
                placeholder="z.B. 1, 2, A1, B2..."
                style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #334155",
                  background: "#1e293b", color: "#e2e8f0", fontSize: 14, marginBottom: 12, boxSizing: "border-box" }} />

              <div style={{ color: "#e2e8f0", marginBottom: 8, fontSize: 14 }}>Box-Typ</div>
              <select value={boxTypeId} onChange={(e) => setBoxTypeId(e.target.value)}
                style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #334155",
                  background: "#1e293b", color: "#e2e8f0", fontSize: 14, marginBottom: 12 }}>
                <option value="">Kein Typ ausgewählt</option>
                {boxTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              <div style={{ color: "#e2e8f0", marginBottom: 8, fontSize: 14 }}>Notizen</div>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="z.B. Standort-Beschreibung..."
                style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #334155",
                  background: "#1e293b", color: "#e2e8f0", fontSize: 14, boxSizing: "border-box" }} />
            </div>

            {/* Initial Scan Section */}
            <div style={{ padding: 16, background: "#0f172a", borderRadius: 8 }}>
              <div style={{ color: "#10b981", fontWeight: 600, marginBottom: 12 }}>Erstkontrolle / Installation</div>

              <div style={{ color: "#e2e8f0", marginBottom: 8, fontSize: 14 }}>Status *</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <div key={key} onClick={() => setStatus(key)} style={{
                    padding: "12px 8px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                    border: status === key ? `2px solid ${cfg.color}` : "1px solid #334155",
                    background: status === key ? `${cfg.color}20` : "#1e293b",
                    color: status === key ? cfg.color : "#94a3b8"
                  }}>
                    <div style={{ fontSize: 18 }}>{cfg.icon}</div>
                    <div style={{ fontSize: 11 }}>{cfg.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ color: "#e2e8f0", marginBottom: 8, fontSize: 14 }}>Befunde</div>
              <textarea value={findings} onChange={(e) => setFindings(e.target.value)}
                placeholder="Feststellungen bei Installation..."
                style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #334155",
                  background: "#1e293b", color: "#e2e8f0", fontSize: 14, minHeight: 60, marginBottom: 12,
                  resize: "vertical", boxSizing: "border-box" }} />

              <div style={{ color: "#e2e8f0", marginBottom: 8, fontSize: 14 }}>Scan-Notizen</div>
              <input type="text" value={scanNotes} onChange={(e) => setScanNotes(e.target.value)}
                placeholder="Zusätzliche Bemerkungen..."
                style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #334155",
                  background: "#1e293b", color: "#e2e8f0", fontSize: 14, marginBottom: 12, boxSizing: "border-box" }} />

              <div style={{ color: "#e2e8f0", marginBottom: 8, fontSize: 14 }}>Foto</div>
              {photoPreview ? (
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <img src={photoPreview} alt="Preview" style={{ width: "100%", maxHeight: 150, objectFit: "cover", borderRadius: 8 }} />
                  <button onClick={() => { setPhoto(null); setPhotoPreview(null); }} style={{
                    position: "absolute", top: 8, right: 8, background: "#ef4444", border: "none",
                    borderRadius: "50%", width: 24, height: 24, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}><X size={14} color="#fff" /></button>
                </div>
              ) : (
                <label style={{
                  width: "100%", padding: 12, border: "2px dashed #334155", borderRadius: 8,
                  background: "#1e293b", color: "#94a3b8", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                }}>
                  <Camera size={18} /> Foto aufnehmen
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} style={{ display: "none" }} />
                </label>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: "16px 20px", borderTop: "1px solid #334155", display: "flex", gap: 12 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: 12, borderRadius: 8, border: "1px solid #334155",
              background: "transparent", color: "#94a3b8", cursor: "pointer"
            }}>Abbrechen</button>
            <button onClick={handleSubmit} disabled={loading} style={{
              flex: 2, padding: 12, borderRadius: 8, border: "none",
              background: "#3b82f6", color: "#fff", fontWeight: 600,
              cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8
            }}>
              <Save size={18} /> {loading ? "Erstellen..." : "Box erstellen"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}