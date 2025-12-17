/* ============================================================
   TRAPMAP – PARTNER VERWALTUNG
   Für Admins: Partner erstellen und verwalten
   ============================================================ */

import React, { useState, useEffect } from "react";
import {
  Users, Plus, Edit2, Trash2, Building2, Mail, Phone,
  Check, X, Loader, AlertCircle, ChevronDown, Eye, EyeOff,
  RefreshCw, Search
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function PartnerManagement() {
  const token = localStorage.getItem("trapmap_token");
  const headers = { Authorization: `Bearer ${token}` };

  // State
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState([]);
  const [objects, setObjects] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Dialog State
  const [showDialog, setShowDialog] = useState(false);
  const [editPartner, setEditPartner] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    company: "",
    phone: "",
    objectIds: []
  });
  const [showPassword, setShowPassword] = useState(false);

  // ============================================
  // DATEN LADEN
  // ============================================
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Partner laden
      const partnerRes = await fetch(`${API}/partners`, { headers });
      if (partnerRes.ok) {
        const data = await partnerRes.json();
        setPartners(Array.isArray(data) ? data : []);
      }

      // Objekte laden
      const objectRes = await fetch(`${API}/objects`, { headers });
      if (objectRes.ok) {
        const data = await objectRes.json();
        setObjects(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // DIALOG ÖFFNEN
  // ============================================
  const openCreateDialog = () => {
    setEditPartner(null);
    setForm({
      email: "",
      password: "",
      name: "",
      company: "",
      phone: "",
      objectIds: []
    });
    setShowDialog(true);
  };

  const openEditDialog = (partner) => {
    setEditPartner(partner);
    setForm({
      email: partner.email,
      password: "", // Leer lassen für Update
      name: partner.name,
      company: partner.company || "",
      phone: partner.phone || "",
      objectIds: partner.objects?.map(o => o.id) || []
    });
    setShowDialog(true);
  };

  // ============================================
  // SPEICHERN
  // ============================================
  const handleSave = async () => {
    if (!form.email || !form.name) {
      setError("E-Mail und Name sind erforderlich");
      return;
    }

    if (!editPartner && !form.password) {
      setError("Passwort ist für neue Partner erforderlich");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = editPartner 
        ? `${API}/partners/${editPartner.id}`
        : `${API}/partners`;
      
      const method = editPartner ? "PUT" : "POST";

      const body = {
        name: form.name,
        company: form.company,
        phone: form.phone,
        objectIds: form.objectIds
      };

      // Nur bei neuen Partnern oder wenn Passwort gesetzt
      if (!editPartner) {
        body.email = form.email;
        body.password = form.password;
      } else if (form.password) {
        body.password = form.password;
      }

      const res = await fetch(url, {
        method,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Speichern fehlgeschlagen");
      }

      setSuccess(editPartner ? "Partner aktualisiert" : "Partner erstellt");
      setShowDialog(false);
      loadData();

      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // LÖSCHEN
  // ============================================
  const handleDelete = async (partner) => {
    if (!confirm(`Partner "${partner.name}" wirklich löschen?`)) return;

    try {
      const res = await fetch(`${API}/partners/${partner.id}`, {
        method: "DELETE",
        headers
      });

      if (!res.ok) throw new Error("Löschen fehlgeschlagen");

      setSuccess("Partner gelöscht");
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // ============================================
  // OBJEKT TOGGLE
  // ============================================
  const toggleObject = (objectId) => {
    setForm(f => ({
      ...f,
      objectIds: f.objectIds.includes(objectId)
        ? f.objectIds.filter(id => id !== objectId)
        : [...f.objectIds, objectId]
    }));
  };

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-15 text-muted">
        <Loader size={32} className="animate-spin" />
        <p>Lade Partner...</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-primary">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h2 className="flex items-center gap-2.5 text-2xl font-bold m-0 text-primary">
            <Users size={24} />
            Partner-Verwaltung
          </h2>
          <p className="text-muted mt-1 text-sm">
            Externe Kunden können hier Zugang zu ihren Objekten erhalten
          </p>
        </div>
        <button className="flex items-center gap-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 border-none rounded-lg text-white text-sm font-semibold cursor-pointer" onClick={openCreateDialog}>
          <Plus size={18} />
          Neuer Partner
        </button>
      </div>

      {/* SUCCESS */}
      {success && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-green-900 dark:bg-green-950 rounded-lg mb-4 text-green-400">
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-900 dark:bg-red-950 rounded-lg mb-4 text-red-400">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto bg-transparent border-none text-red-400 text-xl cursor-pointer">×</button>
        </div>
      )}

      {/* PARTNER LISTE */}
      {partners.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-5 py-15 bg-card border border-theme rounded-xl text-center">
          <Users size={48} className="text-muted" />
          <h3 className="text-primary">Noch keine Partner</h3>
          <p className="text-muted">Erstellen Sie Partner-Zugänge für Ihre Kunden</p>
          <button className="flex items-center gap-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 border-none rounded-lg text-white text-sm font-semibold cursor-pointer" onClick={openCreateDialog}>
            <Plus size={18} />
            Ersten Partner erstellen
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {partners.map(partner => (
            <div key={partner.id} className="bg-card border border-theme rounded-xl p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1">
                  <strong className="text-base text-primary">{partner.name}</strong>
                  {partner.company && (
                    <span className="flex items-center gap-1.5 text-sm text-muted">
                      <Building2 size={14} />
                      {partner.company}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button 
                    className="p-2 bg-muted hover:bg-muted-hover border-none rounded-md text-muted cursor-pointer"
                    onClick={() => openEditDialog(partner)}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    className="p-2 bg-muted hover:bg-muted-hover border-none rounded-md text-red-500 cursor-pointer"
                    onClick={() => handleDelete(partner)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex gap-4 text-sm text-muted mb-3">
                <span className="flex items-center gap-1.5"><Mail size={14} /> {partner.email}</span>
                {partner.phone && <span className="flex items-center gap-1.5"><Phone size={14} /> {partner.phone}</span>}
              </div>

              <div className="mb-3">
                <span className="text-xs text-muted mb-1.5 block">Zugewiesene Objekte:</span>
                {partner.objects?.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {partner.objects.map(obj => (
                      <span key={obj.id} className="px-2.5 py-1 bg-muted rounded text-xs text-primary">
                        {obj.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted italic">Keine Objekte zugewiesen</span>
                )}
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-theme">
                <span className={`px-2.5 py-1 rounded text-xs ${partner.is_active ? 'bg-green-950 dark:bg-green-900/50 text-green-400' : 'bg-red-950 dark:bg-red-900/50 text-red-400'}`}>
                  {partner.is_active ? "Aktiv" : "Inaktiv"}
                </span>
                {partner.last_login && (
                  <span className="text-xs text-muted">
                    Letzter Login: {new Date(partner.last_login).toLocaleDateString("de-DE")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DIALOG */}
      {showDialog && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/70 flex items-center justify-center p-5 z-[1000]" onClick={() => setShowDialog(false)}>
          <div className="bg-card border border-theme rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-5 text-primary">
              {editPartner ? "Partner bearbeiten" : "Neuen Partner erstellen"}
            </h3>

            {/* Form */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-primary">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Max Mustermann"
                  className="px-3 py-2.5 bg-card border border-theme rounded-md text-primary text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-primary">Firma</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={e => setForm({...form, company: e.target.value})}
                  placeholder="BMW AG"
                  className="px-3 py-2.5 bg-card border border-theme rounded-md text-primary text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-primary">E-Mail *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="max@firma.de"
                  className="px-3 py-2.5 bg-card border border-theme rounded-md text-primary text-sm disabled:opacity-50"
                  disabled={!!editPartner}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-primary">Telefon</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                  placeholder="+49 123 456789"
                  className="px-3 py-2.5 bg-card border border-theme rounded-md text-primary text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-primary">
                  {editPartner ? "Neues Passwort (leer lassen für unverändert)" : "Passwort *"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 pr-10 bg-card border border-theme rounded-md text-primary text-sm"
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none text-muted cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Objekte auswählen */}
            <div className="mt-5">
              <label className="text-primary">Objekte zuweisen</label>
              <p className="text-xs text-muted mt-1 mb-2.5">
                Der Partner kann nur die ausgewählten Objekte sehen und dort Kontrollen durchführen.
              </p>
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto p-3 bg-card border border-theme rounded-lg">
                {objects.map(obj => (
                  <label key={obj.id} className="flex items-center gap-2.5 cursor-pointer text-sm text-primary">
                    <input
                      type="checkbox"
                      checked={form.objectIds.includes(obj.id)}
                      onChange={() => toggleObject(obj.id)}
                    />
                    <span>{obj.name}</span>
                    <span className="ml-auto text-xs text-muted">{obj.city}</span>
                  </label>
                ))}
                {objects.length === 0 && (
                  <p className="text-muted text-sm text-center p-5">Keine Objekte vorhanden</p>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button 
                className="flex-1 px-3 py-3 bg-muted hover:bg-muted-hover border-none rounded-lg text-primary text-sm cursor-pointer"
                onClick={() => setShowDialog(false)}
              >
                Abbrechen
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-green-600 hover:bg-green-700 border-none rounded-lg text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    {editPartner ? "Speichern" : "Partner erstellen"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}