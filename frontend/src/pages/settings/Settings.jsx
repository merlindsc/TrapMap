/* ============================================================
   TRAPMAP — SETTINGS / EINSTELLUNGEN
   Logo-Upload und Organisation-Einstellungen
   ============================================================ */

import { useState, useEffect } from "react";
import { Upload, Image, Check, Loader, Building2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function Settings() {
  const token = localStorage.getItem("trapmap_token");
  const userStr = localStorage.getItem("trapmap_user");
  const user = userStr ? JSON.parse(userStr) : null;

  const [logoUrl, setLogoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  // Logo laden
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const res = await fetch(`${API}/reports/logo`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLogoUrl(data.logoUrl);
        }
      } catch (e) {
        console.error("Logo load error:", e);
      }
    };
    loadLogo();
  }, [token]);

  // Logo hochladen
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validierung
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

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Einstellungen</h1>
      <p className="text-gray-400 mb-8">Verwalten Sie Ihre Organisation</p>

      {/* User Info Card */}
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Building2 size={20} className="text-indigo-400" />
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
            <p className="text-white">{user?.organisation_name || `ID: ${user?.organisation_id}`}</p>
          </div>
        </div>
      </div>

      {/* Logo Upload Card */}
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Image size={20} className="text-indigo-400" />
          Firmenlogo
        </h2>
        
        <p className="text-gray-400 text-sm mb-4">
          Das Logo erscheint auf allen Audit-Reports oben rechts.
        </p>

        {/* Aktuelles Logo */}
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

        {/* Upload Button */}
        <label className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer transition-colors">
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

        {/* Message */}
        {message && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-900/30 border border-green-500/30 text-green-400'
              : 'bg-red-900/30 border border-red-500/30 text-red-400'
          }`}>
            {message.type === 'success' && <Check size={16} />}
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}