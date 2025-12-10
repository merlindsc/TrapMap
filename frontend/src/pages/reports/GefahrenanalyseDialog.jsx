/* ============================================================
   TRAPMAP — GEFAHRENANALYSE DIALOG
   Formular zur Erstellung der objektbezogenen Gefahrenanalyse
   
   Struktur:
   - Dienstleister = Eigene Firma (vorausgefüllt)
   - Auftraggeber = Der Kunde
   - Objekt = Das konkrete Objekt
   ============================================================ */

import { useState, useEffect } from "react";
import { X, FileText, Download, Loader, Building2, MapPin, Calendar, ClipboardCheck, Briefcase } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function GefahrenanalyseDialog({ isOpen, onClose }) {
  const token = localStorage.getItem("trapmap_token");
  const userStr = localStorage.getItem("trapmap_user");
  const user = userStr ? JSON.parse(userStr) : null;

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [objects, setObjects] = useState([]);

  // Formular State
  const [formData, setFormData] = useState({
    // Dienstleister (eigene Firma - vorausgefüllt)
    dienstleister: { firma: "", strasse: "", plzOrt: "", verantwortlicher: "", telefon: "" },
    // Auftraggeber (der Kunde)
    auftraggeber: { firma: "", strasse: "", plzOrt: "", verantwortlicher: "", telefon: "" },
    // Objekt
    objekt: { firma: "", strasse: "", plzOrt: "", verantwortlicher: "", telefon: "" },
    // Durchführung
    durchfuehrung: {
      datum: new Date().toISOString().split("T")[0],
      durch: user ? `${user.first_name} ${user.last_name}` : ""
    },
    dokumentation: { apcIntegral: false, apcDocuWeb: false, trapmap: true },
    behandlungenJaehrlich: "",
    kriterien: [{ ja: false, nein: false }, { ja: false, nein: false }, { ja: false, nein: false }],
    empfehlung: null
  });

  // Daten laden
  useEffect(() => {
    if (!isOpen) return;
    const loadData = async () => {
      setLoading(true);
      try {
        // Organisation laden (für Dienstleister)
        const orgRes = await fetch(`${API}/reports/organisation`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (orgRes.ok) {
          const org = await orgRes.json();
          setFormData(prev => ({
            ...prev,
            dienstleister: {
              firma: org.name || "",
              strasse: org.address || "",
              plzOrt: `${org.zip || ""} ${org.city || ""}`.trim(),
              verantwortlicher: user ? `${user.first_name} ${user.last_name}` : "",
              telefon: org.phone || ""
            }
          }));
        }

        // Objekte laden
        const objRes = await fetch(`${API}/reports/objects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (objRes.ok) setObjects(await objRes.json());
      } catch (e) {
        console.error("Load error:", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isOpen, token]);

  // Objekt auswählen - füllt Auftraggeber UND Objekt vor
  const handleObjectSelect = (objectId) => {
    const obj = objects.find(o => o.id === parseInt(objectId));
    if (obj) {
      setFormData(prev => ({
        ...prev,
        auftraggeber: {
          firma: obj.name || "",
          strasse: obj.address || "",
          plzOrt: `${obj.zip || ""} ${obj.city || ""}`.trim(),
          verantwortlicher: obj.contact_name || "",
          telefon: obj.contact_phone || ""
        },
        objekt: {
          firma: obj.name || "",
          strasse: obj.address || "",
          plzOrt: `${obj.zip || ""} ${obj.city || ""}`.trim(),
          verantwortlicher: obj.contact_name || "",
          telefon: obj.contact_phone || ""
        }
      }));
    }
  };

  const handleKriteriumChange = (index, field) => {
    setFormData(prev => {
      const newKriterien = [...prev.kriterien];
      newKriterien[index] = { ja: field === "ja", nein: field === "nein" };
      return { ...prev, kriterien: newKriterien };
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API}/reports/gefahrenanalyse`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Gefahrenanalyse_${formData.objekt.firma || "Objekt"}_${new Date().toISOString().split("T")[0]}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        onClose();
      } else {
        alert((await res.json()).error || "Fehler beim Generieren");
      }
    } catch (e) {
      alert("Netzwerkfehler");
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  const InputField = ({ placeholder, value, onChange }) => (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
    />
  );

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#1a1a2e] rounded-xl w-full max-w-5xl my-8 border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <FileText className="text-indigo-400" size={24} />
            <div>
              <h2 className="text-xl font-bold text-white">Gefahrenanalyse</h2>
              <p className="text-sm text-gray-400">Objektbezogene Bewertung zur Dauerbeköderung</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="text-gray-400" size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader className="animate-spin text-indigo-400" size={32} />
          </div>
        ) : (
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            
            {/* Objekt Auswahl */}
            <div className="bg-[#0d0d1a] rounded-lg p-4 border border-white/5">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Objekt auswählen (zum Vorausfüllen von Auftraggeber & Objekt)
              </label>
              <select
                onChange={(e) => handleObjectSelect(e.target.value)}
                className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-4 py-2 text-white"
              >
                <option value="">-- Objekt wählen --</option>
                {objects.map(obj => (
                  <option key={obj.id} value={obj.id}>{obj.name}</option>
                ))}
              </select>
            </div>

            {/* Drei Spalten: Dienstleister, Auftraggeber, Objekt */}
            <div className="grid md:grid-cols-3 gap-4">
              
              {/* Dienstleister (eigene Firma) */}
              <div className="bg-[#0d0d1a] rounded-lg p-4 border border-indigo-500/30">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Briefcase size={18} className="text-indigo-400" /> Dienstleister
                </h3>
                <p className="text-xs text-gray-500 mb-3">Ihre Firma</p>
                <div className="space-y-3">
                  {["firma", "strasse", "plzOrt", "verantwortlicher", "telefon"].map(field => (
                    <InputField
                      key={field}
                      placeholder={field === "plzOrt" ? "PLZ / Ort" : field.charAt(0).toUpperCase() + field.slice(1)}
                      value={formData.dienstleister[field]}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        dienstleister: { ...prev.dienstleister, [field]: e.target.value }
                      }))}
                    />
                  ))}
                </div>
              </div>

              {/* Auftraggeber (Kunde) */}
              <div className="bg-[#0d0d1a] rounded-lg p-4 border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Building2 size={18} className="text-yellow-400" /> Auftraggeber
                </h3>
                <p className="text-xs text-gray-500 mb-3">Der Kunde</p>
                <div className="space-y-3">
                  {["firma", "strasse", "plzOrt", "verantwortlicher", "telefon"].map(field => (
                    <InputField
                      key={field}
                      placeholder={field === "plzOrt" ? "PLZ / Ort" : field.charAt(0).toUpperCase() + field.slice(1)}
                      value={formData.auftraggeber[field]}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        auftraggeber: { ...prev.auftraggeber, [field]: e.target.value }
                      }))}
                    />
                  ))}
                </div>
              </div>

              {/* Objekt */}
              <div className="bg-[#0d0d1a] rounded-lg p-4 border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <MapPin size={18} className="text-green-400" /> Objekt
                </h3>
                <p className="text-xs text-gray-500 mb-3">Einsatzort</p>
                <div className="space-y-3">
                  {["firma", "strasse", "plzOrt", "verantwortlicher", "telefon"].map(field => (
                    <InputField
                      key={field}
                      placeholder={field === "plzOrt" ? "PLZ / Ort" : field.charAt(0).toUpperCase() + field.slice(1)}
                      value={formData.objekt[field]}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        objekt: { ...prev.objekt, [field]: e.target.value }
                      }))}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Durchführung */}
            <div className="bg-[#0d0d1a] rounded-lg p-4 border border-white/5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-yellow-400" /> Durchführung
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Datum</label>
                  <input
                    type="date"
                    value={formData.durchfuehrung.datum}
                    onChange={(e) => setFormData(prev => ({
                      ...prev, durchfuehrung: { ...prev.durchfuehrung, datum: e.target.value }
                    }))}
                    className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Durchgeführt von</label>
                  <input
                    type="text"
                    value={formData.durchfuehrung.durch}
                    onChange={(e) => setFormData(prev => ({
                      ...prev, durchfuehrung: { ...prev.durchfuehrung, durch: e.target.value }
                    }))}
                    className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Dokumentation */}
            <div className="bg-[#0d0d1a] rounded-lg p-4 border border-white/5">
              <h3 className="text-lg font-semibold text-white mb-4">Aktuelle Dokumentation</h3>
              <div className="flex flex-wrap gap-6 mb-4">
                {[
                  { key: "apcIntegral", label: "APC Integral" },
                  { key: "apcDocuWeb", label: "APC DocuWeb" },
                  { key: "trapmap", label: "TrapMap" }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.dokumentation[key]}
                      onChange={(e) => setFormData(prev => ({
                        ...prev, dokumentation: { ...prev.dokumentation, [key]: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Behandlungen jährlich</label>
                <input
                  type="number"
                  value={formData.behandlungenJaehrlich}
                  onChange={(e) => setFormData(prev => ({ ...prev, behandlungenJaehrlich: e.target.value }))}
                  className="w-32 bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white"
                  placeholder="Anzahl"
                />
              </div>
            </div>

            {/* Kriterien */}
            <div className="bg-[#0d0d1a] rounded-lg p-4 border border-white/5">
              <h3 className="text-lg font-semibold text-white mb-2">Voraussetzungen für Dauerbeköderung</h3>
              <p className="text-xs text-gray-400 mb-4">Alle drei Kriterien müssen mit JA beantwortet werden.</p>
              <div className="space-y-4">
                {[
                  "1. Ausschließlicher Einsatz dauerhaft kontrollierter Köderstellen an Eintritts-/Einniststellen. Zugriffgeschützte Köderboxen.",
                  "2. Erhöhte Befallsgefahr durch Nagetiere mit besonderer Gefahr für Gesundheit/Sicherheit.",
                  "3. Keine Möglichkeit der Verhinderung durch verhältnismäßige Maßnahmen (baulich, toxinfrei)."
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-4 p-3 bg-[#1a1a2e] rounded-lg">
                    <p className="flex-1 text-sm text-gray-300">{text}</p>
                    <div className="flex gap-4 shrink-0">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name={`k-${i}`} checked={formData.kriterien[i].ja}
                          onChange={() => handleKriteriumChange(i, "ja")} className="w-4 h-4" />
                        <span className="text-green-400 text-sm">JA</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name={`k-${i}`} checked={formData.kriterien[i].nein}
                          onChange={() => handleKriteriumChange(i, "nein")} className="w-4 h-4" />
                        <span className="text-red-400 text-sm">NEIN</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Empfehlung */}
            <div className="bg-[#0d0d1a] rounded-lg p-4 border border-white/5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ClipboardCheck size={18} className="text-blue-400" /> Empfehlung
              </h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 bg-[#1a1a2e] rounded-lg cursor-pointer hover:bg-[#252540]">
                  <input type="radio" name="emp" checked={formData.empfehlung === 1}
                    onChange={() => setFormData(prev => ({ ...prev, empfehlung: 1 }))} className="mt-1 w-4 h-4" />
                  <span className="text-sm text-gray-300">
                    Beibehaltung Inspektionsintervall (&lt;12/Jahr). Bei Befall: temporäre Umstellung NeoTox → Tox.
                  </span>
                </label>
                <label className="flex items-start gap-3 p-3 bg-[#1a1a2e] rounded-lg cursor-pointer hover:bg-[#252540]">
                  <input type="radio" name="emp" checked={formData.empfehlung === 2}
                    onChange={() => setFormData(prev => ({ ...prev, empfehlung: 2 }))} className="mt-1 w-4 h-4" />
                  <span className="text-sm text-gray-300">
                    Befallsunabhängige Dauerbeköderung mit Rodentiziden. Intervall: 1-4 Wochen.
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Abbrechen</button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
          >
            {generating ? <><Loader size={18} className="animate-spin" /> Erstellen...</> : <><Download size={18} /> PDF erstellen</>}
          </button>
        </div>
      </div>
    </div>
  );
}