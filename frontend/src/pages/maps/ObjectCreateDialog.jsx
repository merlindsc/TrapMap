/* ============================================================
   TRAPMAP — OBJECT CREATE DIALOG
   Neues Objekt auf Karte erstellen
   Mit vollständigen Inline-Styles
   ============================================================ */

import { useState } from "react";
import { X, Save, MapPin, Building2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function ObjectCreateDialog({ latLng, onClose, onSave }) {
  const token = localStorage.getItem("trapmap_token");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Bitte Objektname eingeben!");
      return;
    }

    setSaving(true);
    setError(null);

    const data = {
      name,
      address,
      zip,
      city,
      contact_person: contactPerson,
      phone,
      notes,
      lat: latLng.lat,
      lng: latLng.lng,
    };

    try {
      const res = await fetch(`${API}/objects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Fehler beim Erstellen");
      }

      const newObject = await res.json();
      onSave(newObject);
    } catch (e) {
      console.error("❌ Error creating object:", e);
      setError(e.message || "Fehler beim Erstellen");
    } finally {
      setSaving(false);
    }
  };

  // Styles
  const styles = {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.8)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: 20,
    },
    dialog: {
      background: "#111827",
      borderRadius: 16,
      width: "100%",
      maxWidth: 480,
      maxHeight: "90vh",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 20px",
      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      background: "#0d1117",
    },
    headerTitle: {
      display: "flex",
      alignItems: "center",
      gap: 12,
    },
    headerIcon: {
      width: 40,
      height: 40,
      background: "rgba(99, 102, 241, 0.2)",
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#818cf8",
    },
    title: {
      color: "#fff",
      fontSize: 18,
      fontWeight: 600,
      margin: 0,
    },
    subtitle: {
      color: "#6b7280",
      fontSize: 13,
      margin: 0,
    },
    closeBtn: {
      background: "transparent",
      border: "none",
      color: "#6b7280",
      cursor: "pointer",
      padding: 4,
      display: "flex",
      transition: "color 0.2s",
    },
    body: {
      flex: 1,
      overflowY: "auto",
      padding: 20,
    },
    fieldGroup: {
      marginBottom: 16,
    },
    label: {
      display: "block",
      color: "#9ca3af",
      fontSize: 13,
      fontWeight: 500,
      marginBottom: 6,
    },
    input: {
      width: "100%",
      padding: "12px 14px",
      background: "#0d1117",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: 10,
      color: "#fff",
      fontSize: 14,
      outline: "none",
      transition: "border-color 0.2s",
      boxSizing: "border-box",
    },
    textarea: {
      width: "100%",
      padding: "12px 14px",
      background: "#0d1117",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: 10,
      color: "#fff",
      fontSize: 14,
      outline: "none",
      resize: "vertical",
      minHeight: 80,
      boxSizing: "border-box",
    },
    row: {
      display: "grid",
      gridTemplateColumns: "1fr 2fr",
      gap: 12,
    },
    positionBox: {
      padding: 14,
      background: "#0d1117",
      borderRadius: 10,
      border: "1px solid rgba(99, 102, 241, 0.3)",
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginTop: 8,
    },
    positionIcon: {
      color: "#6366f1",
    },
    positionText: {
      color: "#9ca3af",
      fontSize: 13,
      fontFamily: "monospace",
    },
    errorBox: {
      padding: 12,
      background: "rgba(239, 68, 68, 0.15)",
      border: "1px solid rgba(239, 68, 68, 0.3)",
      borderRadius: 8,
      color: "#f87171",
      fontSize: 13,
      marginBottom: 16,
    },
    footer: {
      display: "flex",
      gap: 12,
      padding: "16px 20px",
      borderTop: "1px solid rgba(255, 255, 255, 0.1)",
      background: "#0d1117",
    },
    btnSecondary: {
      flex: 1,
      padding: "12px 20px",
      background: "rgba(255, 255, 255, 0.05)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: 10,
      color: "#9ca3af",
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      transition: "all 0.2s",
    },
    btnPrimary: {
      flex: 1,
      padding: "12px 20px",
      background: "#10b981",
      border: "none",
      borderRadius: 10,
      color: "#fff",
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      transition: "all 0.2s",
    },
    btnDisabled: {
      background: "#374151",
      color: "#6b7280",
      cursor: "not-allowed",
    },
  };

  return (
    <div
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <div style={styles.headerIcon}>
              <Building2 size={20} />
            </div>
            <div>
              <h2 style={styles.title}>Neues Objekt erstellen</h2>
              <p style={styles.subtitle}>Position auf Karte gewählt</p>
            </div>
          </div>
          <button
            style={styles.closeBtn}
            onClick={onClose}
            onMouseEnter={(e) => (e.target.style.color = "#fff")}
            onMouseLeave={(e) => (e.target.style.color = "#6b7280")}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Error */}
          {error && <div style={styles.errorBox}>{error}</div>}

          {/* Objektname */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Objektname *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Bäckerei Müller"
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.1)")}
              autoFocus
            />
          </div>

          {/* Adresse */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Adresse</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Straße & Hausnummer"
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.1)")}
            />
          </div>

          {/* PLZ + Stadt */}
          <div style={{ ...styles.fieldGroup, ...styles.row }}>
            <div>
              <label style={styles.label}>PLZ</label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="12345"
                style={styles.input}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.1)")}
              />
            </div>
            <div>
              <label style={styles.label}>Stadt</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="z.B. Berlin"
                style={styles.input}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.1)")}
              />
            </div>
          </div>

          {/* Kontaktperson */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Kontaktperson</label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Name des Ansprechpartners"
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.1)")}
            />
          </div>

          {/* Telefon */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Telefon</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+49 123 456789"
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.1)")}
            />
          </div>

          {/* Notizen */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Notizen</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zusätzliche Informationen..."
              style={styles.textarea}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.1)")}
            />
          </div>

          {/* Position */}
          <div style={styles.positionBox}>
            <MapPin size={18} style={styles.positionIcon} />
            <span style={styles.positionText}>
              {latLng.lat.toFixed(6)}, {latLng.lng.toFixed(6)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            style={styles.btnSecondary}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.1)";
              e.target.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.05)";
              e.target.style.color = "#9ca3af";
            }}
          >
            Abbrechen
          </button>
          <button
            style={{
              ...styles.btnPrimary,
              ...(saving || !name.trim() ? styles.btnDisabled : {}),
            }}
            onClick={handleSave}
            disabled={saving || !name.trim()}
            onMouseEnter={(e) => {
              if (!saving && name.trim()) {
                e.target.style.background = "#059669";
              }
            }}
            onMouseLeave={(e) => {
              if (!saving && name.trim()) {
                e.target.style.background = "#10b981";
              }
            }}
          >
            <Save size={16} />
            {saving ? "Erstelle..." : "Erstellen"}
          </button>
        </div>
      </div>
    </div>
  );
}