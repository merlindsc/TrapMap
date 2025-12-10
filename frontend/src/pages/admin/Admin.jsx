/* ============================================================
   TRAPMAP — ADMIN PAGE
   Einfaches Admin-Panel für Organisationen
   Nur für Super-Admin (admin@demo.trapmap.de)
   ============================================================ */

import { useState, useEffect } from "react";
import { Plus, Building2, Trash2, Loader, Users, Check } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function Admin() {
  const token = localStorage.getItem("trapmap_token");
  
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Neue Organisation Form
  const [newOrg, setNewOrg] = useState({
    name: "",
    address: "",
    zip: "",
    city: "",
    phone: "",
    email: ""
  });

  // Organisationen laden
  const loadOrgs = async () => {
    try {
      const res = await fetch(`${API}/admin/organisations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setOrgs(await res.json());
      }
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrgs();
  }, []);

  // Organisation erstellen
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newOrg.name.trim()) {
      setMessage({ type: "error", text: "Name ist erforderlich" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${API}/admin/organisations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newOrg)
      });

      if (res.ok) {
        const created = await res.json();
        setOrgs(prev => [...prev, created]);
        setNewOrg({ name: "", address: "", zip: "", city: "", phone: "", email: "" });
        setMessage({ type: "success", text: `Organisation "${created.name}" erstellt!` });
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Fehler" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Netzwerkfehler" });
    } finally {
      setSaving(false);
    }
  };

  // Organisation löschen
  const handleDelete = async (id, name) => {
    if (!confirm(`Organisation "${name}" wirklich löschen?\n\nAlle Benutzer, Objekte und Daten werden gelöscht!`)) {
      return;
    }

    try {
      const res = await fetch(`${API}/admin/organisations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setOrgs(prev => prev.filter(o => o.id !== id));
        setMessage({ type: "success", text: "Organisation gelöscht" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Fehler beim Löschen" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Admin</h1>
      <p className="text-gray-400 mb-8">Organisationen verwalten</p>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-900/30 border border-green-500/30 text-green-400'
            : 'bg-red-900/30 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' && <Check size={18} />}
          {message.text}
        </div>
      )}

      {/* Neue Organisation */}
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Plus size={20} className="text-green-400" />
          Neue Organisation erstellen
        </h2>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name *</label>
              <input
                type="text"
                value={newOrg.name}
                onChange={(e) => setNewOrg(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="Firma GmbH"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">E-Mail</label>
              <input
                type="email"
                value={newOrg.email}
                onChange={(e) => setNewOrg(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="info@firma.de"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Straße</label>
              <input
                type="text"
                value={newOrg.address}
                onChange={(e) => setNewOrg(prev => ({ ...prev, address: e.target.value }))}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="Musterstraße 1"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">PLZ</label>
              <input
                type="text"
                value={newOrg.zip}
                onChange={(e) => setNewOrg(prev => ({ ...prev, zip: e.target.value }))}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="12345"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Ort</label>
              <input
                type="text"
                value={newOrg.city}
                onChange={(e) => setNewOrg(prev => ({ ...prev, city: e.target.value }))}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="Hamburg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Telefon</label>
              <input
                type="text"
                value={newOrg.phone}
                onChange={(e) => setNewOrg(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="040 123456"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
            Organisation erstellen
          </button>
        </form>
      </div>

      {/* Liste */}
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Building2 size={20} className="text-indigo-400" />
          Alle Organisationen ({orgs.length})
        </h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader className="animate-spin text-indigo-400" size={32} />
          </div>
        ) : orgs.length === 0 ? (
          <p className="text-gray-400">Keine Organisationen vorhanden</p>
        ) : (
          <div className="space-y-3">
            {orgs.map(org => (
              <div key={org.id} className="flex items-center justify-between p-4 bg-[#0d0d1a] rounded-lg border border-white/5">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">
                      ID: {org.id}
                    </span>
                    <h3 className="font-medium text-white">{org.name}</h3>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {[org.address, org.zip, org.city].filter(Boolean).join(", ") || "Keine Adresse"}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(org.id, org.name)}
                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                  title="Löschen"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}