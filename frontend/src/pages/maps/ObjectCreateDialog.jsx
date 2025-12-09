/* ============================================================
   TRAPMAP — OBJECT CREATE DIALOG
   Neues Objekt auf Karte erstellen
   ============================================================ */

import { useState } from "react";
import { X, Save } from "lucide-react";

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

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Bitte Objektname eingeben!");
      return;
    }

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

      const newObject = await res.json();
      alert("✓ Objekt erstellt!");
      onSave(newObject);
    } catch (e) {
      console.error("❌ Error creating object:", e);
      alert("❌ Fehler beim Erstellen");
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
        <div className="dialog-header-v6">
          <h2>📍 Neues Objekt erstellen</h2>
          <button className="dialog-close-v6" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="dialog-body-v6">
          <label>
            Objektname *
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Bäckerei Müller"
              required
            />
          </label>

          <label>
            Adresse
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Straße & Hausnummer"
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
                placeholder="z.B. Berlin"
              />
            </label>
          </div>

          <label>
            Kontaktperson
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Name des Ansprechpartners"
            />
          </label>

          <label>
            Telefon
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+49 123 456789"
            />
          </label>

          <label>
            Notizen
            <textarea
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zusätzliche Informationen..."
            />
          </label>

          <div
            style={{
              padding: "12px",
              background: "#1a1a1a",
              borderRadius: "6px",
              color: "#9ca3af",
              fontSize: "13px",
            }}
          >
            📍 Position: {latLng.lat.toFixed(6)}, {latLng.lng.toFixed(6)}
          </div>
        </div>

        <div className="dialog-footer-v6">
          <button className="btn-secondary-v6" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary-v6" onClick={handleSave}>
            <Save size={16} />
            Erstellen
          </button>
        </div>
      </div>
    </div>
  );
}