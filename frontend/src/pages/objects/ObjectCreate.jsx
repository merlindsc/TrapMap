/* ============================================================
   TRAPMAP - OBJECT CREATE
   Objekt erstellen - mit oder ohne GPS
   ============================================================ */

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, Building2, MapPin, User, Phone, FileText, Info } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function ObjectCreate() {
  const navigate = useNavigate();
  const token = localStorage.getItem("trapmap_token");

  const [form, setForm] = useState({
    name: "",
    address: "",
    zip: "",
    city: "",
    contact_person: "",
    phone: "",
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
      const res = await fetch(`${API}/objects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error("Fehler beim Erstellen");
      }

      const created = await res.json();
      console.log("Created object:", created);

      if (created?.id) {
        navigate(`/objects/${created.id}`);
      } else {
        throw new Error("Ungueltige Antwort vom Server (ID fehlt)");
      }
    } catch (err) {
      console.error("Fehler beim Erstellen:", err);
      setError("Fehler beim Erstellen des Objekts");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/objects"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurueck zu Objekten
        </Link>

        <h1 className="text-3xl font-bold text-white mt-4 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-blue-400" />
          Neues Objekt erstellen
        </h1>
        <p className="text-gray-400 mt-2">
          GPS-Koordinaten koennen spaeter ueber die Karte hinzugefuegt werden
        </p>
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-200">
          <strong>Tipp:</strong> Sie koennen ein Objekt auch nur mit Lageplaenen nutzen, 
          ohne GPS-Position. GPS-Koordinaten koennen Sie spaeter ueber die Karten-Ansicht 
          hinzufuegen.
        </div>
      </div>

      {/* Fehleranzeige */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/50 border border-red-500 text-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Formular */}
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden"
      >
        {/* Grunddaten */}
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            Grunddaten
          </h2>
          
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-gray-300 mb-1">Objektname *</label>
              <input
                type="text"
                required
                placeholder="z.B. Rewe Markt, Lagerhalle Nord..."
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Aktiv Checkbox */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="active"
                checked={form.active}
                onChange={(e) => updateField("active", e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="active" className="text-gray-300">Objekt ist aktiv</label>
            </div>
          </div>
        </div>

        {/* Adresse */}
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-400" />
            Adresse
          </h2>
          
          <div className="space-y-4">
            {/* Strasse */}
            <div>
              <label className="block text-gray-300 mb-1">Strasse und Hausnummer</label>
              <input
                type="text"
                placeholder="z.B. Hauptstrasse 123"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* PLZ + Stadt */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-300 mb-1">PLZ</label>
                <input
                  type="text"
                  placeholder="12345"
                  value={form.zip}
                  onChange={(e) => updateField("zip", e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-300 mb-1">Stadt</label>
                <input
                  type="text"
                  placeholder="Berlin"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Kontakt */}
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            Ansprechpartner
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-1">Name</label>
              <input
                type="text"
                placeholder="Max Mustermann"
                value={form.contact_person}
                onChange={(e) => updateField("contact_person", e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-1">Telefon</label>
              <input
                type="tel"
                placeholder="+49 123 456789"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Notizen */}
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Interne Notizen
          </h2>
          
          <textarea
            rows="3"
            placeholder="Hinweise, Besonderheiten, Zugangsinformationen..."
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Submit */}
        <div className="p-6 bg-gray-900/50 flex justify-end gap-4">
          <Link
            to="/objects"
            className="px-6 py-3 text-gray-300 hover:text-white transition"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 transition"
          >
            <Save className="w-5 h-5" />
            {loading ? "Speichern..." : "Objekt erstellen"}
          </button>
        </div>
      </form>
    </div>
  );
}