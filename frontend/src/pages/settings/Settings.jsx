/* ============================================================
   TRAPMAP — SETTINGS / EINSTELLUNGEN
   Logo-Upload, Organisationsdaten, Passwort ändern
   + PUSH BENACHRICHTIGUNGEN
   ============================================================ */

import { useState, useEffect } from "react";
import { Upload, Image, Check, Loader, Building2, Save, MapPin, Phone, Mail, User, Key, Eye, EyeOff, AlertCircle, Bell, BellOff, Clock, Send, Smartphone } from "lucide-react";
import { 
  isPushSupported, 
  getPermissionStatus, 
  subscribeToPush, 
  unsubscribeFromPush, 
  isSubscribed, 
  getPushSettings, 
  updatePushSettings, 
  sendTestNotification 
} from "../../utils/pushService";

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

  // Push-Benachrichtigungen
  const [pushSupported] = useState(isPushSupported());
  const [pushPermission, setPushPermission] = useState(getPermissionStatus());
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSettings, setPushSettings] = useState({
    reminderEnabled: true,
    reminderDaysBefore: 1,
    reminderTime: '08:00'
  });

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
        
        // Push-Status laden
        if (pushSupported) {
          const subscribed = await isSubscribed();
          setPushSubscribed(subscribed);
          setPushPermission(getPermissionStatus());
          
          if (subscribed) {
            try {
              const settings = await getPushSettings();
              if (settings.settings) {
                setPushSettings(settings.settings);
              }
            } catch (e) {
              console.log('Push settings not loaded:', e);
            }
          }
        }
      } catch (e) {
        console.error("Load error:", e);
      }
    };
    loadData();
  }, [token, pushSupported]);

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

  // Push aktivieren
  const handleEnablePush = async () => {
    setPushLoading(true);
    setMessage(null);
    
    try {
      await subscribeToPush(pushSettings);
      setPushSubscribed(true);
      setPushPermission(getPermissionStatus());
      setMessage({ type: 'success', text: 'Push-Benachrichtigungen aktiviert!' });
    } catch (error) {
      console.error('Push subscribe error:', error);
      setMessage({ type: 'error', text: error.message || 'Fehler beim Aktivieren' });
      setPushPermission(getPermissionStatus());
    } finally {
      setPushLoading(false);
    }
  };

  // Push deaktivieren
  const handleDisablePush = async () => {
    setPushLoading(true);
    setMessage(null);
    
    try {
      await unsubscribeFromPush();
      setPushSubscribed(false);
      setMessage({ type: 'success', text: 'Push-Benachrichtigungen deaktiviert' });
    } catch (error) {
      console.error('Push unsubscribe error:', error);
      setMessage({ type: 'error', text: error.message || 'Fehler beim Deaktivieren' });
    } finally {
      setPushLoading(false);
    }
  };

  // Push-Einstellungen speichern
  const handleSavePushSettings = async () => {
    setPushLoading(true);
    setMessage(null);
    
    try {
      await updatePushSettings(pushSettings);
      setMessage({ type: 'success', text: 'Erinnerungs-Einstellungen gespeichert!' });
    } catch (error) {
      console.error('Push settings error:', error);
      setMessage({ type: 'error', text: error.message || 'Fehler beim Speichern' });
    } finally {
      setPushLoading(false);
    }
  };

  // Test-Benachrichtigung
  const handleTestPush = async () => {
    setPushLoading(true);
    setMessage(null);
    
    try {
      await sendTestNotification();
      setMessage({ type: 'success', text: 'Test-Benachrichtigung gesendet!' });
    } catch (error) {
      console.error('Test push error:', error);
      setMessage({ type: 'error', text: error.message || 'Fehler beim Senden' });
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-2">Einstellungen</h1>
      <p className="text-muted mb-8">Verwalten Sie Ihr Profil und Ihre Organisation</p>

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
      <div className="bg-card border border-theme rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <User size={20} className="text-indigo-400" />
          Benutzer-Information
        </h2>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted">Name:</span>
            <p className="text-primary">{user?.first_name} {user?.last_name}</p>
          </div>
          <div>
            <span className="text-muted">E-Mail:</span>
            <p className="text-primary">{user?.email}</p>
          </div>
          <div>
            <span className="text-muted">Rolle:</span>
            <p className="text-primary capitalize">{user?.role}</p>
          </div>
          <div>
            <span className="text-muted">Organisation:</span>
            <p className="text-primary">{orgData.name || `ID: ${user?.organisation_id}`}</p>
          </div>
        </div>
      </div>

      {/* Push-Benachrichtigungen Card */}
      <div className="bg-card border border-theme rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Bell size={20} className="text-indigo-400" />
          Push-Benachrichtigungen
        </h2>
        
        {!pushSupported ? (
          <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
            <AlertCircle size={16} className="inline mr-2" />
            Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.
          </div>
        ) : pushPermission === 'denied' ? (
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            <BellOff size={16} className="inline mr-2" />
            Push-Benachrichtigungen wurden blockiert. Bitte in den Browser-Einstellungen erlauben.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Toggle */}
            <div className="flex items-center justify-between p-4 bg-card border border-theme rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone size={20} className="text-indigo-400" />
                <div>
                  <p className="text-primary font-medium">Benachrichtigungen</p>
                  <p className="text-sm text-muted">Erhalte Erinnerungen für fällige Kontrollen</p>
                </div>
              </div>
              <button
                onClick={pushSubscribed ? handleDisablePush : handleEnablePush}
                disabled={pushLoading}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  pushSubscribed ? 'bg-green-600' : 'bg-gray-600'
                } ${pushLoading ? 'opacity-50' : ''}`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  pushSubscribed ? 'translate-x-7' : ''
                }`} />
              </button>
            </div>

            {pushSubscribed && (
              <>
                {/* Erinnerungs-Einstellungen */}
                <div className="p-4 bg-card border border-theme rounded-lg space-y-4">
                  <h3 className="font-medium text-primary flex items-center gap-2">
                    <Clock size={16} />
                    Erinnerungs-Einstellungen
                  </h3>
                  
                  {/* Tage vor Fälligkeit */}
                  <div>
                    <label className="block text-sm text-muted mb-2">Erinnere mich</label>
                    <select
                      value={pushSettings.reminderDaysBefore}
                      onChange={(e) => setPushSettings(prev => ({ 
                        ...prev, 
                        reminderDaysBefore: parseFloat(e.target.value) 
                      }))}
                      className="w-full bg-card border border-theme rounded-lg px-4 py-2 text-primary"
                    >
                      <option value={0.5}>12 Stunden vorher</option>
                      <option value={1}>1 Tag vorher</option>
                      <option value={1.5}>1,5 Tage vorher</option>
                      <option value={2}>2 Tage vorher</option>
                      <option value={3}>3 Tage vorher</option>
                      <option value={7}>1 Woche vorher</option>
                    </select>
                  </div>

                  {/* Uhrzeit */}
                  <div>
                    <label className="block text-sm text-muted mb-2">Bevorzugte Uhrzeit</label>
                    <select
                      value={pushSettings.reminderTime}
                      onChange={(e) => setPushSettings(prev => ({ 
                        ...prev, 
                        reminderTime: e.target.value 
                      }))}
                      className="w-full bg-card border border-theme rounded-lg px-4 py-2 text-primary"
                    >
                      <option value="06:00">06:00 Uhr</option>
                      <option value="07:00">07:00 Uhr</option>
                      <option value="08:00">08:00 Uhr</option>
                      <option value="09:00">09:00 Uhr</option>
                      <option value="10:00">10:00 Uhr</option>
                      <option value="12:00">12:00 Uhr</option>
                      <option value="18:00">18:00 Uhr</option>
                    </select>
                  </div>

                  <button
                    onClick={handleSavePushSettings}
                    disabled={pushLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
                  >
                    {pushLoading ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                    Einstellungen speichern
                  </button>
                </div>

                {/* Test senden */}
                <button
                  onClick={handleTestPush}
                  disabled={pushLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-card border border-theme hover:border-indigo-500/50 text-primary rounded-lg transition-colors disabled:opacity-50 text-sm"
                >
                  {pushLoading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                  Test-Benachrichtigung senden
                </button>
              </>
            )}

            <p className="text-xs text-muted">
              Beispiel-Nachricht: "In 1 Tag müssen in Objekt 'Muster GmbH' 5 Boxen kontrolliert werden"
            </p>
          </div>
        )}
      </div>

      {/* Passwort ändern Card */}
      <div className="bg-card border border-theme rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Key size={20} className="text-indigo-400" />
          Passwort ändern
        </h2>
        
        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Aktuelles Passwort */}
          <div>
            <label className="block text-sm text-muted mb-1">Aktuelles Passwort</label>
            <div className="relative">
              <input
                type={showPasswords.current ? "text" : "password"}
                value={passwords.current}
                onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                className="w-full bg-card border border-theme rounded-lg px-4 py-2 text-primary pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
              >
                {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Neues Passwort */}
          <div>
            <label className="block text-sm text-muted mb-1">Neues Passwort</label>
            <div className="relative">
              <input
                type={showPasswords.new ? "text" : "password"}
                value={passwords.new}
                onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                className="w-full bg-card border border-theme rounded-lg px-4 py-2 text-primary pr-10"
                placeholder="Mindestens 8 Zeichen"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
              >
                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Passwort bestätigen */}
          <div>
            <label className="block text-sm text-muted mb-1">Neues Passwort bestätigen</label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? "text" : "password"}
                value={passwords.confirm}
                onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                className="w-full bg-card border border-theme rounded-lg px-4 py-2 text-primary pr-10"
                placeholder="Passwort wiederholen"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
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
      <div className="bg-card border border-theme rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Building2 size={20} className="text-indigo-400" />
          Organisationsdaten
        </h2>
        <p className="text-muted text-sm mb-4">
          Diese Daten werden als "Dienstleister" in Reports verwendet.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1">Firmenname</label>
              <input
                type="text"
                value={orgData.name}
                onChange={(e) => setOrgData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-card border border-theme rounded-lg px-4 py-2 text-primary"
                placeholder="Ihre Firma GmbH"
              />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-muted mb-1">
                <MapPin size={14} className="inline mr-1" />
                Straße
              </label>
              <input
                type="text"
                value={orgData.address}
                onChange={(e) => setOrgData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full bg-card border border-theme rounded-lg px-4 py-2 text-primary"
                placeholder="Musterstraße 1"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">PLZ</label>
              <input
                type="text"
                value={orgData.zip}
                onChange={(e) => setOrgData(prev => ({ ...prev, zip: e.target.value }))}
                className="w-full bg-card border border-theme rounded-lg px-4 py-2 text-primary"
                placeholder="12345"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted mb-1">Ort</label>
            <input
              type="text"
              value={orgData.city}
              onChange={(e) => setOrgData(prev => ({ ...prev, city: e.target.value }))}
              className="w-full bg-card border border-theme rounded-lg px-4 py-2 text-primary"
              placeholder="Hamburg"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted mb-1">
                <Phone size={14} className="inline mr-1" />
                Telefon
              </label>
              <input
                type="text"
                value={orgData.phone}
                onChange={(e) => setOrgData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full bg-card border border-theme rounded-lg px-4 py-2 text-primary"
                placeholder="040 123456"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">
                <Mail size={14} className="inline mr-1" />
                E-Mail
              </label>
              <input
                type="email"
                value={orgData.email}
                onChange={(e) => setOrgData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-card border border-theme rounded-lg px-4 py-2 text-primary"
                placeholder="info@firma.de"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted mb-1">Ansprechpartner / Verantwortlicher</label>
            <input
              type="text"
              value={orgData.contact_name}
              onChange={(e) => setOrgData(prev => ({ ...prev, contact_name: e.target.value }))}
              className="w-full bg-card border border-theme rounded-lg px-4 py-2 text-primary"
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
      <div className="bg-card border border-theme rounded-xl p-6">
        <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Image size={20} className="text-indigo-400" />
          Firmenlogo
        </h2>
        
        <p className="text-muted text-sm mb-4">
          Das Logo erscheint auf allen Reports oben rechts.
        </p>

        {logoUrl && (
          <div className="mb-4 p-4 bg-card rounded-lg border border-theme">
            <p className="text-xs text-muted mb-2">Aktuelles Logo:</p>
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

        <p className="text-xs text-muted mt-2">
          PNG, JPG oder GIF • Max. 2MB • Empfohlen: 200x80 Pixel
        </p>
      </div>
    </div>
  );
}