/* ============================================================
   TRAPMAP — OBJECT EDIT DIALOG
   Objekt bearbeiten
   ============================================================ */

import { useState } from "react";
import { X, Save, Trash2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function ObjectEditDialog({ object, onClose, onSave, onDelete }) {
  const token = localStorage.getItem("trapmap_token");

  const [name, setName] = useState(object.name || "");
  const [address, setAddress] = useState(object.address || "");
  const [zip, setZip] = useState(object.zip || "");
  const [city, setCity] = useState(object.city || "");
  const [notes, setNotes] = useState(object.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name ist erforderlich");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API}/objects/${object.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, address, zip, city, notes }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Fehler beim Speichern");
        setSaving(false);
        return;
      }

      onSave();
    } catch (e) {
      console.error("❌ Error updating object:", e);
      setError("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`${API}/objects/${object.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      onDelete();
    } catch (e) {
      console.error("❌ Error deleting object:", e);
      setError("Fehler beim Löschen");
    }
  };

  return (
    <div
      className="dialog-overlay-v6"
      onClick={(e) => e.target.className === "dialog-overlay-v6" && onClose()}
    >
      <div className="dialog-v6" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dialog-header-v6">
          <h2>🏢 Objekt bearbeiten</h2>
          <button className="dialog-close-v6" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="dialog-body-v6">
          
          {/* Error Message */}
          {error && (
            <div style={{
              padding: "12px",
              background: "#7f1d1d",
              border: "1px solid #dc2626",
              borderRadius: "6px",
              color: "#fca5a5",
              marginBottom: "16px"
            }}>
              ⚠️ {error}
            </div>
          )}

          <label>
            Name *
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Müller GmbH"
              required
            />
          </label>

          <label>
            Adresse
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Straße und Hausnummer"
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
            <label>
              PLZ
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="12345"
              />
            </label>
            <label>
              Stadt
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Musterstadt"
              />
            </label>
          </div>

          <label>
            Notizen
            <textarea
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zusätzliche Informationen..."
            />
          </label>

          {/* Position Info */}
          <div style={{
            padding: "12px",
            background: "#1a1a1a",
            borderRadius: "6px",
            color: "#9ca3af",
            fontSize: "13px",
          }}>
            📍 Position: {object.lat?.toFixed(6)}, {object.lng?.toFixed(6)}
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
                ⚠️ Objekt wirklich löschen?
              </p>
              <p style={{ margin: "0 0 16px 0", color: "#fca5a5", fontSize: "13px" }}>
                Alle zugehörigen Boxen und Scans werden ebenfalls gelöscht!
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