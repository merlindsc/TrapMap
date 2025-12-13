/* ============================================================
   TRAPMAP - BOX EDIT DIALOG
   Bearbeiten einer Box - Mit flexiblem Intervall (Fix/Range)
   + Insektentyp-Auswahl für Insektenmonitore
   Modernes Design passend zum Dashboard
   ============================================================ */

import { useState, useEffect } from "react";
import { X, Save, CheckCircle, MapPin, Navigation, Clock, Bug } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function BoxEditDialog({
  box,
  boxTypes = [],
  onClose,
  onSave,
  onAdjustPosition,
  onSetGPS,
  isFirstSetup = false
}) {
  const token = localStorage.getItem("trapmap_token");

  // Required Fields von Organisation (aus Login-Daten)
  const [requiredFields, setRequiredFields] = useState({
    bait: false,
    insect_type: false,
    notes: false,
    photo: false,
    gps: false
  });

  // Lade Organisation Settings aus localStorage (beim Login gespeichert)
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("trapmap_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.organisation?.required_fields) {
          setRequiredFields(user.organisation.required_fields);
        }
      }
    } catch (err) {
      console.error("Error loading org settings from localStorage:", err);
    }
  }, []);

  // Form State
  const [boxTypeId, setBoxTypeId] = useState(box?.box_type_id || "");
  const [bait, setBait] = useState(box?.bait || "");
  const [customBait, setCustomBait] = useState("");
  const [notes, setNotes] = useState(box?.notes || "");
  
  // Insektentyp State
  const [insectType, setInsectType] = useState("");
  const [customInsectType, setCustomInsectType] = useState("");
  
  // Intervall State - Fix oder Range
  const [intervalType, setIntervalType] = useState("fixed");
  const [intervalFixed, setIntervalFixed] = useState(box?.control_interval_days || 30);
  const [intervalRangeStart, setIntervalRangeStart] = useState(20);
  const [intervalRangeEnd, setIntervalRangeEnd] = useState(30);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Köder-Optionen für Nager
  const COMMON_BAITS = [
    "Brodifacoum Block",
    "Bromadiolon Paste",
    "Difenacoum Block",
    "Difethialon Block",
    "Flocoumafen Paste",
    "Chlorophacinon Getreide",
    "Coumatetralyl Block",
    "Brodifacoum Paste",
    "Bromadiolon Block",
    "Difenacoum Paste"
  ];

  // Insektentypen für Insektenmonitore
  const INSECT_TYPES = [
    "Schaben",
    "Motten",
    "Käfer",
    "Bettwanzen",
    "Ameisen",
    "Silberfische",
    "Fliegen",
    "Wespen"
  ];

  // Schnellauswahl Intervalle
  const QUICK_INTERVALS = [
    { value: 7, label: "7 Tage", sub: "wöchentlich" },
    { value: 14, label: "14 Tage", sub: "2 Wochen" },
    { value: 21, label: "21 Tage", sub: "3 Wochen" },
    { value: 30, label: "30 Tage", sub: "monatlich" },
    { value: 60, label: "60 Tage", sub: "2 Monate" },
    { value: 90, label: "90 Tage", sub: "quartalsweise" }
  ];

  useEffect(() => {
    if (box?.box_type_id) setBoxTypeId(box.box_type_id);
    if (box?.notes) {
      // Prüfen ob Notizen einen Insektentyp enthalten
      const foundInsect = INSECT_TYPES.find(t => box.notes.includes(t));
      if (foundInsect) {
        setInsectType(foundInsect);
        // Rest der Notizen ohne Insektentyp
        setNotes(box.notes.replace(`Ziel: ${foundInsect}`, "").replace(foundInsect, "").trim());
      } else {
        setNotes(box.notes);
      }
    }
    if (box?.control_interval_days) {
      setIntervalFixed(box.control_interval_days);
      const isStandard = QUICK_INTERVALS.some(q => q.value === box.control_interval_days);
      if (!isStandard && box.control_interval_days > 7) {
        setIntervalType("range");
        setIntervalRangeStart(box.control_interval_days - 5);
        setIntervalRangeEnd(box.control_interval_days + 5);
      }
    }
    if (box?.bait) {
      if (COMMON_BAITS.includes(box.bait)) {
        setBait(box.bait);
      } else {
        setBait("custom");
        setCustomBait(box.bait);
      }
    }
  }, [box]);

  // Box-Typ Erkennung - basiert auf category aus Datenbank
  const selectedType = boxTypes.find(t => t.id === parseInt(boxTypeId));
  const typeCategory = selectedType?.category?.toLowerCase() || "";

  // Köder-Auswahl nur bei Köderstationen
  const isRodentStation = typeCategory === "bait_box";

  // Insektentyp bei Insektenmonitoren und Gelstationen
  const isInsectMonitor = typeCategory === "insect_monitor" || typeCategory === "uv_trap";

  // Berechne finales Intervall
  const getFinalInterval = () => {
    if (intervalType === "fixed") {
      return intervalFixed;
    }
    return Math.floor((intervalRangeStart + intervalRangeEnd) / 2);
  };

  // Kombiniere Notizen mit Insektentyp
  const buildFinalNotes = () => {
    let finalNotes = notes.trim();
    
    if (isInsectMonitor && insectType) {
      const insectInfo = insectType === "custom" ? customInsectType : insectType;
      if (insectInfo) {
        finalNotes = `Ziel: ${insectInfo}${finalNotes ? ` | ${finalNotes}` : ""}`;
      }
    }
    
    return finalNotes;
  };

  const handleSave = async () => {
    // Box-Typ ist IMMER Pflicht
    if (!boxTypeId) {
      setError("Bitte Box-Typ auswählen");
      return;
    }

    // Köder Pflicht? (nur wenn bait_box)
    const finalBait = bait === "custom" ? customBait : bait;
    if (requiredFields.bait && isRodentStation && !finalBait) {
      setError("Köder ist ein Pflichtfeld");
      return;
    }

    // Insektentyp Pflicht? (nur wenn insect_monitor)
    const finalInsectType = insectType === "custom" ? customInsectType : insectType;
    if (requiredFields.insect_type && isInsectMonitor && !finalInsectType) {
      setError("Insektentyp ist ein Pflichtfeld");
      return;
    }

    // Notizen Pflicht?
    if (requiredFields.notes && !notes.trim()) {
      setError("Notizen sind ein Pflichtfeld");
      return;
    }

    // Foto Pflicht? (wird später bei Scan geprüft)
    // GPS Pflicht? (wird später geprüft)

    setSaving(true);
    setError(null);
    const finalInterval = getFinalInterval();
    const finalNotes = buildFinalNotes();

    try {
      const updateData = { 
        box_type_id: parseInt(boxTypeId), 
        notes: finalNotes,
        control_interval_days: finalInterval
      };
      if (isRodentStation && finalBait) updateData.bait = finalBait;

      const updateRes = await fetch(`${API}/boxes/${box.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updateData)
      });

      if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(err.error || "Fehler beim Speichern");
      }

      // Bei Ersteinrichtung: Scan erstellen
      if (isFirstSetup) {
        const scanData = {
          box_id: box.id,
          object_id: box.object_id || box.objects?.id,
          status: "green",
          activity: "keine",
          quantity: "0",
          notes: "Ersteinrichtung" + (finalBait ? ` | Köder: ${finalBait}` : "") + (insectType ? ` | Ziel: ${insectType}` : ""),
          scan_type: "setup"
        };
        await fetch(`${API}/scans`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(scanData)
        });
      }

      onSave && onSave();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getBoxNumber = () => {
    if (box?.qr_code) {
      const match = box.qr_code.match(/(\d+)$/);
      if (match) return parseInt(match[1], 10).toString();
    }
    return box?.id || "?";
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111827] rounded-xl w-full max-w-md max-h-[90vh] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0d1117]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${isFirstSetup ? 'bg-green-500/20 text-green-400' : 'bg-indigo-500/20 text-indigo-400'} rounded-lg flex items-center justify-center font-bold text-sm`}>
              {getBoxNumber()}
            </div>
            <div>
              <h2 className="font-semibold text-white">
                {isFirstSetup ? "Ersteinrichtung" : "Box bearbeiten"}
              </h2>
              <p className="text-xs text-gray-500">{box?.qr_code}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body - scrollbar */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Ersteinrichtung Info */}
          {isFirstSetup && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle size={16} />
              Ersteinrichtungs-Scan wird automatisch erstellt
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Box-Typ */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              Box-Typ *
            </label>
            <select
              value={boxTypeId}
              onChange={(e) => setBoxTypeId(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0d1117] border border-white/10 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
            >
              <option value="">Bitte auswählen...</option>
              
              {/* Nager - Köder zuerst */}
              <optgroup label="🐀 Nager - Köder">
                {boxTypes
                  .filter(t => t.category === 'bait_box')
                  .sort((a, b) => a.name.localeCompare(b.name, 'de'))
                  .map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
              </optgroup>
              
              {/* Nager - Schlagfallen */}
              <optgroup label="🐀 Nager - Schlagfallen">
                {boxTypes
                  .filter(t => t.category === 'snap_trap')
                  .sort((a, b) => a.name.localeCompare(b.name, 'de'))
                  .map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
              </optgroup>
              
              {/* Insekten */}
              <optgroup label="🪲 Insekten">
                {boxTypes
                  .filter(t => t.category === 'insect_monitor' || t.category === 'uv_trap')
                  .sort((a, b) => a.name.localeCompare(b.name, 'de'))
                  .map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
              </optgroup>
              
              {/* Sonstige (falls vorhanden) */}
              {boxTypes.filter(t => 
                !['bait_box', 'snap_trap', 'insect_monitor', 'uv_trap'].includes(t.category)
              ).length > 0 && (
                <optgroup label="📦 Sonstige">
                  {boxTypes
                    .filter(t => !['bait_box', 'snap_trap', 'insect_monitor', 'uv_trap'].includes(t.category))
                    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
                    .map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Köder - nur bei Rodent Stations */}
          {isRodentStation && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Rodentizid / Köder {requiredFields.bait && <span className="text-red-400">*</span>}
              </label>
              <select
                value={bait}
                onChange={(e) => {
                  setBait(e.target.value);
                  if (e.target.value !== "custom") setCustomBait("");
                }}
                className="w-full px-3 py-2.5 bg-[#0d1117] border border-white/10 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
              >
                <option value="">Kein Köder / Leer</option>
                {COMMON_BAITS.map(b => <option key={b} value={b}>{b}</option>)}
                <option value="custom">Anderer...</option>
              </select>
              {bait === "custom" && (
                <input
                  type="text"
                  value={customBait}
                  onChange={(e) => setCustomBait(e.target.value)}
                  placeholder="Köder eingeben..."
                  className="w-full mt-2 px-3 py-2.5 bg-[#0d1117] border border-white/10 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                />
              )}
            </div>
          )}

          {/* Zielinsekt - nur bei Insektenmonitoren */}
          {isInsectMonitor && (
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-2">
                <Bug size={14} />
                Zielinsekt {requiredFields.insect_type && <span className="text-red-400">*</span>}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {INSECT_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setInsectType(insectType === type ? "" : type)}
                    className={`py-2.5 px-3 rounded-lg text-sm text-left transition-all ${
                      insectType === type
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                        : "bg-[#0d1117] text-gray-300 border border-white/10 hover:border-purple-500/30"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              {/* Anderer Insektentyp */}
              <button
                type="button"
                onClick={() => setInsectType(insectType === "custom" ? "" : "custom")}
                className={`w-full mt-2 py-2.5 px-3 rounded-lg text-sm text-left transition-all ${
                  insectType === "custom"
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                    : "bg-[#0d1117] text-gray-300 border border-white/10 hover:border-purple-500/30"
                }`}
              >
                Anderes Insekt...
              </button>
              {insectType === "custom" && (
                <input
                  type="text"
                  value={customInsectType}
                  onChange={(e) => setCustomInsectType(e.target.value)}
                  placeholder="Insektenart eingeben..."
                  className="w-full mt-2 px-3 py-2.5 bg-[#0d1117] border border-white/10 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none transition-colors"
                />
              )}
              {!insectType && !requiredFields.insect_type && (
                <p className="text-xs text-gray-500 mt-2">
                  Optional - Spezifiziert welche Insekten überwacht werden
                </p>
              )}
            </div>
          )}

          {/* Kontrollintervall */}
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-2">
              <Clock size={14} />
              Kontrollintervall
            </label>

            {/* Fix / Range Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setIntervalType("fixed")}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  intervalType === "fixed"
                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/50"
                    : "bg-[#0d1117] text-gray-400 border border-white/10 hover:border-white/20"
                }`}
              >
                Fix
              </button>
              <button
                type="button"
                onClick={() => setIntervalType("range")}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  intervalType === "range"
                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/50"
                    : "bg-[#0d1117] text-gray-400 border border-white/10 hover:border-white/20"
                }`}
              >
                Range
              </button>
            </div>

            {/* Fix: Schnellauswahl */}
            {intervalType === "fixed" && (
              <div className="grid grid-cols-3 gap-2">
                {QUICK_INTERVALS.map((q) => (
                  <button
                    key={q.value}
                    type="button"
                    onClick={() => setIntervalFixed(q.value)}
                    className={`py-2.5 px-2 rounded-lg text-center transition-all ${
                      intervalFixed === q.value
                        ? "bg-indigo-500 text-white"
                        : "bg-[#0d1117] text-gray-300 border border-white/10 hover:border-indigo-500/50"
                    }`}
                  >
                    <div className="text-sm font-medium">{q.label}</div>
                    <div className={`text-xs ${intervalFixed === q.value ? 'text-indigo-200' : 'text-gray-500'}`}>
                      {q.sub}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Range: Start - Ende */}
            {intervalType === "range" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Von</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={intervalRangeStart}
                      onChange={(e) => setIntervalRangeStart(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-[#0d1117] border border-white/10 rounded-lg text-white text-center text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-gray-500 pt-5">–</span>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Bis</label>
                    <input
                      type="number"
                      min={intervalRangeStart}
                      max="365"
                      value={intervalRangeEnd}
                      onChange={(e) => setIntervalRangeEnd(parseInt(e.target.value) || intervalRangeStart)}
                      className="w-full px-3 py-2 bg-[#0d1117] border border-white/10 rounded-lg text-white text-center text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-gray-400 pt-5 text-sm">Tage</span>
                </div>
                
                {/* Range Info */}
                <div className="bg-[#0d1117] rounded-lg p-3 text-center">
                  <span className="text-gray-400 text-sm">Kontrolle alle </span>
                  <span className="text-indigo-400 font-semibold">{intervalRangeStart}–{intervalRangeEnd}</span>
                  <span className="text-gray-400 text-sm"> Tage</span>
                </div>
              </div>
            )}
          </div>

          {/* Notizen */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              Notizen {requiredFields.notes && <span className="text-red-400">*</span>}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Hinweise zur Box, Standort-Details..."
              rows={2}
              className="w-full px-3 py-2.5 bg-[#0d1117] border border-white/10 rounded-lg text-white text-sm resize-none focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Position Buttons - nur wenn nicht Ersteinrichtung */}
          {!isFirstSetup && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => { onAdjustPosition && onAdjustPosition(); }}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400 text-sm hover:bg-indigo-500/20 transition-colors"
              >
                <MapPin size={14} /> Position verschieben
              </button>
              <button
                onClick={() => { 
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  if (!isMobile) {
                    alert("⚠️ GPS setzen funktioniert nur auf Mobilgeräten!\n\nAm PC bitte 'Position verschieben' nutzen.");
                    return;
                  }
                  onSetGPS && onSetGPS(); 
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#0d1117] border border-white/10 rounded-lg text-gray-400 text-sm hover:border-white/20 transition-colors"
              >
                <Navigation size={14} /> GPS (Mobil)
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-white/10 bg-[#0d1117]">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 text-sm transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !boxTypeId}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              saving || !boxTypeId
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
          >
            <Save size={16} />
            {saving ? "..." : isFirstSetup ? "Einrichten" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}