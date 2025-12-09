import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createObject } from "../../api/objects";
import { ArrowLeft, Save } from "lucide-react";

export default function ObjectCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    address: "",
    contact_person: "",
    notes: "",
    active: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Backend liefert direkt das neue Objekt zurück:
      const created = await createObject(form);

      console.log("➡️ API RESPONSE:", created);

      // Wichtig: created = { id, name, address, ... }
      if (created?.id) {
        navigate(`/objects/${created.id}`);
      } else {
        throw new Error("Ungültige Antwort vom Server (ID fehlt)");
      }

    } catch (err) {
      console.error("❌ Fehler beim Erstellen:", err);
      setError("Fehler beim Erstellen des Objekts");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/objects"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück zu Objekten</span>
        </Link>

        <h1 className="text-3xl font-bold text-white mt-4">
          Neues Objekt erstellen
        </h1>
      </div>

      {/* Fehleranzeige */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/50 border border-red-500 text-red-200 rounded">
          {error}
        </div>
      )}

      {/* Formular */}
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 border border-gray-700 p-6 rounded-lg space-y-6"
      >

        {/* Name */}
        <div>
          <label className="block text-gray-300 mb-1">Objektname *</label>
          <input
            type="text"
            required
            placeholder="z. B. Rewe Markt, Lagerhalle Nord..."
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Adresse */}
        <div>
          <label className="block text-gray-300 mb-1">Adresse</label>
          <textarea
            rows="2"
            placeholder="Straße, Hausnummer, PLZ, Ort"
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Ansprechpartner */}
        <div>
          <label className="block text-gray-300 mb-1">Ansprechpartner</label>
          <input
            type="text"
            placeholder="Name des Ansprechpartners"
            value={form.contact_person}
            onChange={(e) => updateField("contact_person", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notizen */}
        <div>
          <label className="block text-gray-300 mb-1">Notizen</label>
          <textarea
            rows="3"
            placeholder="Optional: Hinweise, Besonderheiten..."
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Aktiv */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => updateField("active", e.target.checked)}
          />
          <span className="text-gray-300">Objekt ist aktiv</span>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {loading ? "Speichern..." : "Objekt speichern"}
        </button>
      </form>
    </div>
  );
}
