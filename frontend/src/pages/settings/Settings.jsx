/* ============================================================
   TRAPMAP — SETTINGS / EINSTELLUNGEN
   Logo-Upload, Organisationsdaten, Passwort ändern
   ============================================================ */

import { useState, useEffect } from "react";
import { Upload, Image, Check, Loader, Building2, Save, MapPin, Phone, Mail, User, Key, Eye, EyeOff, AlertCircle } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function Settings() {
  const token = localStorage.getItem("trapmap_token");
  const userStr = localStorage.getItem("trapmap_user");
  const user = userStr ? JSON.parse(userStr) : null;

  const [logoUrl, setLogoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Organisationsdaten
  const [orgData, setOrgData] = useState({
    name: "", address: "", zip: "", city: "", phone: "", email: "", contact_name: ""
  });

  // Passwort ändern
  const [passwords, setPasswords] = useState({
    current: "", new: "", confirm: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false, new: false, confirm: false
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Daten laden
  useEffect(() => {
    const loadData = async () => {
      try {
        const orgRes = await fetch(`${API}/reports/organisation`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (orgRes.ok) {
          const org = await orgRes.json();
          setOrgData({
            name: org.name || "",
            address: org.address || "",
            zip: org.zip || "",
            city: org.city || "",
            phone: org.phone || "",
            email: org.email || "",
            contact_name: org.contact_name || ""
          });
          setLogoUrl(org.logo_url);
        }
      } catch (e) {
        console.error("Load error:", e);
      }
    };
    loadData();
  }, [token]);

  // Logo hochladen
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Nur Bilder erlaubt (PNG, JPG, GIF)' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Datei zu groß (max. 2MB)' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const res = await fetch(`${API}/reports/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setLogoUrl(data.logoUrl);
        setMessage({ type: 'success', text: 'Logo erfolgreich hochgeladen!' });
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Fehler beim Hochladen' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Netzwerkfehler' });
    } finally {
      setUploading(false);
    }
  };

  // Organisationsdaten speichern
  const handleSaveOrg = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${API}/reports/organisation`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(orgData)
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Organisationsdaten gespeichert!' });
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Fehler beim Speichern' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Netzwerkfehler' });
    } finally {
      setSaving(false);
    }
  };

  // Passwort ändern
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'Die neuen Passwörter stimmen nicht überein' });
      return;
    }

    if (passwords.new.length < 8) {
      setMessage({ type: 'error', text: 'Das neue Passwort muss mindestens 8 Zeichen haben' });
      return;
    }

    setChangingPassword(true);
    setMessage(null);

    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new
        })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Passwort erfolgreich geändert!' });
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Fehler beim Ändern' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Netzwerkfehler' });
    } finally {
      setChangingPassword(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Einstellungen</h1>
      <p className="text-gray-400 mb-8">Verwalten Sie Ihr Profil und Ihre Organisation</p>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-900/30 border border-green-500/30 text-green-400'
            : 'bg-red-900/30 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* User Info Card */}
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <User size={20} className="text-indigo-400" />
          Benutzer-Information
        </h2>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Name:</span>
            <p className="text-white">{user?.first_name} {user?.last_name}</p>
          </div>
          <div>
            <span className="text-gray-400">E-Mail:</span>
            <p className="text-white">{user?.email}</p>
          </div>
          <div>
            <span className="text-gray-400">Rolle:</span>
            <p className="text-white capitalize">{user?.role}</p>
          </div>
          <div>
            <span className="text-gray-400">Organisation:</span>
            <p className="text-white">{orgData.name || `ID: ${user?.organisation_id}`}</p>
          </div>
        </div>
      </div>

      {/* Passwort ändern Card */}
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Key size={20} className="text-indigo-400" />
          Passwort ändern
        </h2>
        
        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Aktuelles Passwort */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Aktuelles Passwort</label>
            <div className="relative">
              <input
                type={showPasswords.current ? "text" : "password"}
                value={passwords.current}
                onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Neues Passwort */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Neues Passwort</label>
            <div className="relative">
              <input
                type={showPasswords.new ? "text" : "password"}
                value={passwords.new}
                onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white pr-10"
                placeholder="Mindestens 8 Zeichen"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Passwort bestätigen */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Neues Passwort bestätigen</label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? "text" : "password"}
                value={passwords.confirm}
                onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white pr-10"
                placeholder="Passwort wiederholen"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={changingPassword}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {changingPassword ? (
              <>
                <Loader size={18} className="animate-spin" />
                Wird geändert...
              </>
            ) : (
              <>
                <Key size={18} />
                Passwort ändern
              </>
            )}
          </button>
        </form>
      </div>

      {/* Organisationsdaten Card */}
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Building2 size={20} className="text-indigo-400" />
          Organisationsdaten
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Diese Daten werden als "Dienstleister" in Reports verwendet.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Firmenname</label>
            <input
              type="text"
              value={orgData.name}
              onChange={(e) => setOrgData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white"
              placeholder="Ihre Firma GmbH"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">
                <MapPin size={14} className="inline mr-1" />
                Straße
              </label>
              <input
                type="text"
                value={orgData.address}
                onChange={(e) => setOrgData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="Musterstraße 1"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">PLZ</label>
              <input
                type="text"
                value={orgData.zip}
                onChange={(e) => setOrgData(prev => ({ ...prev, zip: e.target.value }))}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="12345"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Ort</label>
            <input
              type="text"
              value={orgData.city}
              onChange={(e) => setOrgData(prev => ({ ...prev, city: e.target.value }))}
              className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white"
              placeholder="Hamburg"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                <Phone size={14} className="inline mr-1" />
                Telefon
              </label>
              <input
                type="text"
                value={orgData.phone}
                onChange={(e) => setOrgData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="040 123456"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                <Mail size={14} className="inline mr-1" />
                E-Mail
              </label>
              <input
                type="email"
                value={orgData.email}
                onChange={(e) => setOrgData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="info@firma.de"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Ansprechpartner / Verantwortlicher</label>
            <input
              type="text"
              value={orgData.contact_name}
              onChange={(e) => setOrgData(prev => ({ ...prev, contact_name: e.target.value }))}
              className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white"
              placeholder="Max Mustermann"
            />
          </div>

          <button
            onClick={handleSaveOrg}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader size={18} className="animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <Save size={18} />
                Organisationsdaten speichern
              </>
            )}
          </button>
        </div>
      </div>

      {/* Logo Upload Card */}
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Image size={20} className="text-indigo-400" />
          Firmenlogo
        </h2>
        
        <p className="text-gray-400 text-sm mb-4">
          Das Logo erscheint auf allen Reports oben rechts.
        </p>

        {logoUrl && (
          <div className="mb-4 p-4 bg-[#0d0d1a] rounded-lg border border-white/10">
            <p className="text-xs text-gray-500 mb-2">Aktuelles Logo:</p>
            <img 
              src={logoUrl} 
              alt="Firmenlogo" 
              className="max-h-16 max-w-48 object-contain"
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
        )}

        <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer transition-colors">
          {uploading ? (
            <>
              <Loader size={18} className="animate-spin" />
              Wird hochgeladen...
            </>
          ) : (
            <>
              <Upload size={18} />
              {logoUrl ? 'Logo ändern' : 'Logo hochladen'}
            </>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>

        <p className="text-xs text-gray-500 mt-2">
          PNG, JPG oder GIF • Max. 2MB • Empfohlen: 200x80 Pixel
        </p>
      </div>
    </div>
  );
}