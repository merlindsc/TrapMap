// ============================================
// AUDIT REPORT DIALOG - MIT BILD-UPLOAD
// Abschnitt-Auswahl + Custom Fotos
// ============================================

import { useState, useEffect, useRef } from "react";
import {
  DocumentTextIcon,
  CalendarIcon,
  PhotoIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  TrashIcon,
  ListBulletIcon,
  ClipboardDocumentListIcon,
  CameraIcon
} from "@heroicons/react/24/outline";

const API = import.meta.env.VITE_API_URL;

export default function AuditReportDialog({ isOpen, onClose }) {
  const token = localStorage.getItem("trapmap_token");
  const hasFetched = useRef(false);
  const fileInputRef = useRef(null);
  
  // Daten
  const [objects, setObjects] = useState([]);
  const [loadingObjects, setLoadingObjects] = useState(false);
  
  // Auswahl
  const [selectedObject, setSelectedObject] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Report-Optionen (Pflicht = immer an)
  const [options, setOptions] = useState({
    includeSummary: true,      // Optional
    includeBoxList: true,      // Pflicht
    includeScans: true,        // Optional
    includePhotos: false,      // Optional - Scan-Fotos
    includeCustomPhotos: false // Optional - Custom Fotos
  });
  
  // Custom Fotos
  const [customPhotos, setCustomPhotos] = useState([]);
  
  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  // ========================================
  // EFFECTS
  // ========================================
  
  useEffect(() => {
    if (isOpen && !hasFetched.current) {
      hasFetched.current = true;
      loadObjects();
      setDefaultDates();
    }
    if (!isOpen) {
      hasFetched.current = false;
      // Reset custom photos on close
      setCustomPhotos([]);
    }
  }, [isOpen]);

  // Preview laden bei Auswahl-Änderung
  useEffect(() => {
    if (selectedObject && startDate && endDate) {
      loadPreview();
    }
  }, [selectedObject, startDate, endDate]);

  // ========================================
  // FUNCTIONS
  // ========================================
  
  const setDefaultDates = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    setStartDate(lastMonth.toISOString().split("T")[0]);
    setEndDate(endOfLastMonth.toISOString().split("T")[0]);
    setError("");
    setPreview(null);
  };

  const loadObjects = async () => {
    setLoadingObjects(true);
    try {
      const res = await fetch(`${API}/reports/objects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setObjects(data || []);
      }
    } catch (err) {
      console.error("Load objects error:", err);
    } finally {
      setLoadingObjects(false);
    }
  };

  const loadPreview = async () => {
    try {
      const res = await fetch(`${API}/reports/audit/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ objectId: selectedObject, startDate, endDate })
      });
      if (res.ok) {
        setPreview(await res.json());
      }
    } catch (err) {
      console.error("Preview error:", err);
    }
  };

  const setQuickPeriod = (period) => {
    const now = new Date();
    let start, end;

    switch (period) {
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
        break;
      case "lastMonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "last3Months":
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        end = now;
        break;
      case "thisYear":
        start = new Date(now.getFullYear(), 0, 1);
        end = now;
        break;
      default:
        return;
    }

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  // Custom Foto hinzufügen
  const handleAddPhoto = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const remainingSlots = 10 - customPhotos.length;
    const filesToAdd = files.slice(0, remainingSlots);
    
    filesToAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomPhotos(prev => [...prev, {
          id: Date.now() + Math.random(),
          file,
          preview: event.target.result,
          caption: ""
        }]);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (id) => {
    setCustomPhotos(prev => prev.filter(p => p.id !== id));
  };

  const handleCaptionChange = (id, caption) => {
    setCustomPhotos(prev => prev.map(p => 
      p.id === id ? { ...p, caption } : p
    ));
  };

  // PDF generieren
  const handleGenerate = async () => {
    if (!selectedObject || !startDate || !endDate) {
      setError("Bitte Objekt und Zeitraum auswählen");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // FormData für Fotos
      const formData = new FormData();
      formData.append("objectId", selectedObject);
      formData.append("startDate", startDate);
      formData.append("endDate", endDate);
      formData.append("options", JSON.stringify({
        ...options,
        includeCustomPhotos: customPhotos.length > 0
      }));
      
      // Custom Fotos anhängen
      customPhotos.forEach((photo, i) => {
        formData.append(`photo_${i}`, photo.file);
        formData.append(`caption_${i}`, photo.caption || "");
      });

      const res = await fetch(`${API}/reports/audit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
        throw new Error(err.error || "Fehler beim Generieren");
      }

      // PDF herunterladen
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const disposition = res.headers.get("Content-Disposition");
      let filename = "Audit-Report.pdf";
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match) filename = decodeURIComponent(match[1].replace(/['"]/g, ""));
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================
  
  if (!isOpen) return null;

  const sections = [
    { 
      key: "includeBoxList", 
      label: "Box-Übersicht", 
      desc: "Liste aller Boxen mit Status",
      icon: ListBulletIcon,
      required: true 
    },
    { 
      key: "includeSummary", 
      label: "Zusammenfassung", 
      desc: "Status-Verteilung und Statistiken",
      icon: DocumentTextIcon,
      required: false 
    },
    { 
      key: "includeScans", 
      label: "Kontrollen-Protokoll", 
      desc: "Detaillierte Liste aller Kontrollen",
      icon: ClipboardDocumentListIcon,
      required: false 
    },
    { 
      key: "includePhotos", 
      label: "Scan-Fotos", 
      desc: "Fotos aus Kontrollen (max. 20)",
      icon: CameraIcon,
      required: false 
    }
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-xl w-full max-w-2xl overflow-hidden border border-gray-700 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-6 h-6 text-white" />
            <h2 className="text-lg font-semibold text-white">Audit-Report erstellen</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Objekt-Auswahl */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Objekt auswählen *
            </label>
            {loadingObjects ? (
              <div className="w-full px-4 py-3 bg-gray-700 rounded-lg text-gray-400 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Lade Objekte...
              </div>
            ) : (
              <select
                value={selectedObject}
                onChange={(e) => setSelectedObject(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Objekt wählen --</option>
                {objects.map((obj) => (
                  <option key={obj.id} value={obj.id}>{obj.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Zeitraum */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <CalendarIcon className="w-4 h-4 inline mr-1" />
              Zeitraum *
            </label>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { id: "thisMonth", label: "Dieser Monat" },
                { id: "lastMonth", label: "Letzter Monat" },
                { id: "last3Months", label: "3 Monate" },
                { id: "thisYear", label: "Dieses Jahr" }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setQuickPeriod(p.id)}
                  className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-white">{preview.boxCount || 0}</div>
                  <div className="text-xs text-gray-500">Boxen</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{preview.stats?.totalScans || 0}</div>
                  <div className="text-xs text-gray-500">Kontrollen</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-500">{preview.stats?.greenScans || 0}</div>
                  <div className="text-xs text-gray-500">OK</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">{preview.stats?.redScans || 0}</div>
                  <div className="text-xs text-gray-500">Befall</div>
                </div>
              </div>
            </div>
          )}

          {/* Report-Abschnitte */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Report-Inhalt
            </label>
            <div className="space-y-2">
              {sections.map((section) => (
                <label 
                  key={section.key}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition cursor-pointer
                    ${options[section.key] 
                      ? "bg-blue-500/10 border-blue-500/30" 
                      : "bg-gray-700/50 border-gray-600 hover:border-gray-500"
                    }
                    ${section.required ? "opacity-80" : ""}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={options[section.key]}
                    onChange={(e) => !section.required && setOptions(prev => ({
                      ...prev,
                      [section.key]: e.target.checked
                    }))}
                    disabled={section.required}
                    className="w-5 h-5 rounded border-gray-500 text-blue-500 focus:ring-blue-500 bg-gray-600"
                  />
                  <section.icon className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="text-white text-sm font-medium">
                      {section.label}
                      {section.required && (
                        <span className="ml-2 text-xs text-blue-400">(Pflicht)</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{section.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Fotos */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              <PhotoIcon className="w-4 h-4 inline mr-1" />
              Zusätzliche Fotos (max. 10)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Fügen Sie eigene Fotos hinzu, z.B. Standortbilder der Boxen
            </p>
            
            {/* Foto-Grid */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              {customPhotos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img 
                    src={photo.preview} 
                    alt="Preview" 
                    className="w-full h-20 object-cover rounded-lg border border-gray-600"
                  />
                  <button
                    onClick={() => handleRemovePhoto(photo.id)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                  <input
                    type="text"
                    placeholder="Beschreibung"
                    value={photo.caption}
                    onChange={(e) => handleCaptionChange(photo.id, e.target.value)}
                    className="w-full mt-1 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
                  />
                </div>
              ))}
              
              {/* Add Button */}
              {customPhotos.length < 10 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-20 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-400 transition"
                >
                  <PlusIcon className="w-6 h-6" />
                  <span className="text-xs mt-1">Hinzufügen</span>
                </button>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleAddPhoto}
              className="hidden"
            />
            
            {customPhotos.length > 0 && (
              <p className="text-xs text-gray-500">
                {customPhotos.length}/10 Fotos • Fotos werden {customPhotos.length <= 4 ? "2" : "4"} pro Seite angezeigt
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            HACCP/IFS konform • PDF-Download
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              Abbrechen
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !selectedObject || !startDate || !endDate}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generiere...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  PDF erstellen
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}