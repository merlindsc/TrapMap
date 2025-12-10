/* ============================================================
   TRAPMAP - OBJECT EDIT DIALOG
   Bestehendes Objekt bearbeiten
   ============================================================ */

import { useState, useEffect } from "react";
import { X, Save, Trash2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function ObjectEditDialog({ object, onClose, onSave, onDelete }) {
  const token = localStorage.getItem("trapmap_token");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load object data
  useEffect(() => {
    if (object) {
      setName(object.name || "");
      setAddress(object.address || "");
      setZip(object.zip || "");
      setCity(object.city || "");
      setContactPerson(object.contact_person || "");
      setPhone(object.phone || "");
      setNotes(object.notes || "");
    }
  }, [object]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Bitte Objektname eingeben!");
      return;
    }

    setSaving(true);

    const data = {
      name,
      address,
      zip,
      city,
      contact_person: contactPerson,
      phone,
      notes,
    };

    try {
      const res = await fetch(`${API}/objects/${object.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Update failed");
      }

      const updated = await res.json();
      onSave(updated);
    } catch (e) {
      console.error("Error updating object:", e);
      alert("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/objects/${object.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      if (onDelete) onDelete(object.id);
    } catch (e) {
      console.error("Error deleting object:", e);
      alert("Fehler beim Loeschen");
    } finally {
      setSaving(false);
    }
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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#1e293b",
          borderRadius: 12,
          width: "100%",
          maxWidth: 500,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
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
            Objekt bearbeiten
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
          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div
              style={{
                background: "#7f1d1d",
                padding: 16,
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <p style={{ color: "#fecaca", margin: "0 0 12px 0" }}>
                Objekt wirklich loeschen? Alle zugehoerigen Boxen werden ebenfalls geloescht!
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 6,
                    border: "none",
                    background: "#ef4444",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Ja, loeschen
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 6,
                    border: "1px solid #334155",
                    background: "transparent",
                    color: "#94a3b8",
                    cursor: "pointer",
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#e2e8f0", marginBottom: 6, fontSize: 14 }}>
              Objektname *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Baeckerei Mueller"
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

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#e2e8f0", marginBottom: 6, fontSize: 14 }}>
              Adresse
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Strasse & Hausnummer"
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", color: "#e2e8f0", marginBottom: 6, fontSize: 14 }}>
                PLZ
              </label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="12345"
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
            <div>
              <label style={{ display: "block", color: "#e2e8f0", marginBottom: 6, fontSize: 14 }}>
                Stadt
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="z.B. Berlin"
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
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#e2e8f0", marginBottom: 6, fontSize: 14 }}>
              Kontaktperson
            </label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Name des Ansprechpartners"
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

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#e2e8f0", marginBottom: 6, fontSize: 14 }}>
              Telefon
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+49 123 456789"
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

          {/* Position Info */}
          <div
            style={{
              padding: 12,
              background: "#0f172a",
              borderRadius: 8,
              color: "#64748b",
              fontSize: 13,
            }}
          >
            Position: {object?.lat?.toFixed(6)}, {object?.lng?.toFixed(6)}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid #334155",
            display: "flex",
            gap: 12,
          }}
        >
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={loading}
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid #7f1d1d",
              background: "transparent",
              color: "#ef4444",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Trash2 size={16} />
          </button>
          <div style={{ flex: 1 }} />
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
            disabled={loading}
            style={{
              padding: "12px 20px",
              borderRadius: 8,
              border: "none",
              background: "#3b82f6",
              color: "#fff",
              cursor: loading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 500,
            }}
          >
            <Save size={16} />
            {loading ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}