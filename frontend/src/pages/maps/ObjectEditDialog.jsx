/* ============================================================
   TRAPMAP - OBJECT EDIT DIALOG V2
   Bestehendes Objekt bearbeiten
   + Archivieren mit automatischem Box-Return
   ============================================================ */

import { useState, useEffect } from "react";
import { X, Save, Trash2, Archive, AlertTriangle, Package } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function ObjectEditDialog({ object, onClose, onSave, onDelete, boxCount = 0 }) {
  const token = localStorage.getItem("trapmap_token");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setSaving] = useState(false);
  
  // Delete/Archive States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [toast, setToast] = useState(null);

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

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleSave = async () => {
    if (!name.trim()) {
      setToast({ type: "error", msg: "Bitte Objektname eingeben!" });
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
      setToast({ type: "error", msg: "Fehler beim Speichern" });
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // ARCHIVIEREN: Boxen zurück ins Lager, dann Objekt löschen
  // ============================================
  const handleArchive = async () => {
    setArchiveLoading(true);
    
    try {
      // 1. Alle Boxen des Objekts zurück ins Lager
      if (boxCount > 0) {
        const boxRes = await fetch(`${API}/boxes/archive-object-boxes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ object_id: object.id }),
        });

        if (!boxRes.ok) {
          const err = await boxRes.json();
          throw new Error(err.error || "Fehler beim Zurücksetzen der Boxen");
        }

        const boxData = await boxRes.json();
        console.log(`✅ ${boxData.count} Boxen zurück ins Lager`);
      }

      // 2. Objekt deaktivieren/löschen
      const res = await fetch(`${API}/objects/${object.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Objekt konnte nicht archiviert werden");
      }

      setToast({ type: "success", msg: "Objekt archiviert, Boxen im Lager" });
      
      setTimeout(() => {
        if (onDelete) onDelete(object.id);
      }, 500);
      
    } catch (e) {
      console.error("Error archiving object:", e);
      setToast({ type: "error", msg: e.message });
    } finally {
      setArchiveLoading(false);
    }
  };

  // ============================================
  // LÖSCHEN: Nur Objekt löschen (Boxen bleiben)
  // ============================================
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
      setToast({ type: "error", msg: "Fehler beim Löschen" });
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
        {/* Toast */}
        {toast && (
          <div style={{
            position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
            padding: "8px 16px", borderRadius: 6, zIndex: 100,
            background: toast.type === "success" ? "#238636" : "#da3633",
            color: "#fff", fontSize: 13, fontWeight: 500
          }}>
            {toast.msg}
          </div>
        )}

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
          
          {/* ============================================
              ARCHIVIEREN BESTÄTIGUNG
              ============================================ */}
          {showArchiveConfirm && (
            <div
              style={{
                background: "#7f1d1d",
                padding: 16,
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                <AlertTriangle size={24} color="#fecaca" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ color: "#fecaca", margin: "0 0 8px 0", fontWeight: 600 }}>
                    Objekt archivieren?
                  </p>
                  <p style={{ color: "#fca5a5", margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                    {boxCount > 0 ? (
                      <>
                        <strong>{boxCount} Boxen</strong> werden zurück ins Lager verschoben und vollständig zurückgesetzt.
                        Die Scan-Historie bleibt erhalten.
                      </>
                    ) : (
                      "Das Objekt hat keine zugewiesenen Boxen."
                    )}
                  </p>
                </div>
              </div>
              
              {boxCount > 0 && (
                <div style={{
                  padding: 10, background: "rgba(0,0,0,0.2)", borderRadius: 6,
                  marginBottom: 12, display: "flex", alignItems: "center", gap: 8
                }}>
                  <Package size={16} color="#fca5a5" />
                  <span style={{ color: "#fca5a5", fontSize: 12 }}>
                    {boxCount} Boxen → Lager (mit Reset)
                  </span>
                </div>
              )}
              
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleArchive}
                  disabled={archiveLoading}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 6,
                    border: "none",
                    background: "#ef4444",
                    color: "#fff",
                    cursor: archiveLoading ? "wait" : "pointer",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6
                  }}
                >
                  {archiveLoading ? (
                    "Wird archiviert..."
                  ) : (
                    <>
                      <Archive size={16} />
                      Ja, archivieren
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowArchiveConfirm(false)}
                  disabled={archiveLoading}
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

          {/* Delete Confirmation (alte Version ohne Boxen-Return) */}
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
                Objekt wirklich löschen? 
                {boxCount > 0 && (
                  <span style={{ display: "block", marginTop: 6, fontSize: 13 }}>
                    ⚠️ {boxCount} Boxen sind noch zugewiesen!
                  </span>
                )}
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
                  Ja, löschen
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
              placeholder="z.B. Bäckerei Müller"
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
              placeholder="Straße & Hausnummer"
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
              placeholder="Zusätzliche Informationen..."
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
          {/* Archivieren Button - NEU! */}
          <button
            onClick={() => {
              setShowArchiveConfirm(true);
              setShowDeleteConfirm(false);
            }}
            disabled={loading || archiveLoading}
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid #f59e0b50",
              background: "rgba(245, 158, 11, 0.1)",
              color: "#f59e0b",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13
            }}
            title="Objekt archivieren & Boxen ins Lager"
          >
            <Archive size={16} />
            {boxCount > 0 && <span>({boxCount})</span>}
          </button>
          
          {/* Löschen Button */}
          <button
            onClick={() => {
              setShowDeleteConfirm(true);
              setShowArchiveConfirm(false);
            }}
            disabled={loading || archiveLoading}
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
            disabled={loading || archiveLoading}
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