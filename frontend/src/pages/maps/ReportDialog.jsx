/* ============================================================
   TRAPMAP — REPORT DIALOG
   Audit-Report als PDF generieren
   ============================================================ */

import { useState, useEffect } from "react";
import { X, FileText, Download, Calendar, Building2, Loader } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function ReportDialog({ onClose }) {
  const token = localStorage.getItem("trapmap_token");

  const [objects, setObjects] = useState([]);
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Standard: Aktueller Monat
  useEffect(() => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstOfMonth.toISOString().split("T")[0]);
    setEndDate(lastOfMonth.toISOString().split("T")[0]);
  }, []);

  // Objekte laden
  useEffect(() => {
    const loadObjects = async () => {
      try {
        const res = await fetch(`${API}/reports/objects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setObjects(Array.isArray(data) ? data : []);
        
        // Erstes Objekt automatisch auswählen
        if (Array.isArray(data) && data.length > 0) {
          setSelectedObjectId(data[0].id.toString());
        }
      } catch (e) {
        console.error("Error loading objects:", e);
      }
    };
    loadObjects();
  }, [token]);

  // Vorschau laden
  const loadPreview = async () => {
    if (!selectedObjectId || !startDate || !endDate) return;

    setLoading(true);
    try {
      const res = await fetch(`${API}/reports/audit/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          objectId: parseInt(selectedObjectId),
          startDate,
          endDate
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPreview(data);
      }
    } catch (e) {
      console.error("Preview error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedObjectId && startDate && endDate) {
      loadPreview();
    }
  }, [selectedObjectId, startDate, endDate]);

  // PDF generieren & herunterladen
  const generateReport = async () => {
    if (!selectedObjectId || !startDate || !endDate) {
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(`${API}/reports/audit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          objectId: parseInt(selectedObjectId),
          startDate,
          endDate
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert("Fehler: " + (err.error || "Unbekannt"));
        return;
      }

      // PDF herunterladen
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const objectName = objects.find(o => o.id.toString() === selectedObjectId)?.name || "Report";
      a.download = `Audit_${objectName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      onClose();
    } catch (e) {
      console.error("Generate error:", e);
      alert("Fehler beim Generieren");
    } finally {
      setGenerating(false);
    }
  };

  // Schnellauswahl Zeiträume
  const setQuickPeriod = (type) => {
    const now = new Date();
    let start, end;

    switch (type) {
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "lastMonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "last3Months":
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "thisYear":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        return;
    }

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-[#1a1a2e] border border-white/10 rounded-xl w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText size={20} className="text-indigo-400" />
            Audit-Report erstellen
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          
          {/* Objekt auswählen */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
              <Building2 size={14} />
              Objekt *
            </label>
            <select
              value={selectedObjectId}
              onChange={(e) => setSelectedObjectId(e.target.value)}
              className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Bitte auswählen...</option>
              {objects.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.name} {obj.city ? `- ${obj.city}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Zeitraum Label */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
              <Calendar size={14} />
              Zeitraum
            </label>

            {/* Schnellauswahl */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {[
                { key: "thisMonth", label: "Dieser Monat" },
                { key: "lastMonth", label: "Letzter Monat" },
                { key: "last3Months", label: "3 Monate" },
                { key: "thisYear", label: "Jahr" }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setQuickPeriod(key)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 text-xs transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Datum-Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Von</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Bis</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Vorschau */}
          {loading && (
            <div className="flex items-center justify-center py-6 text-gray-400">
              <Loader size={20} className="animate-spin mr-2" /> 
              Lade Vorschau...
            </div>
          )}

          {preview && !loading && (
            <div className="bg-[#0d0d1a] border border-white/10 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                📊 Vorschau: {preview.object?.name}
              </h4>
              
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="text-gray-400">Boxen:</div>
                <div className="text-white font-medium">{preview.boxCount}</div>
                
                <div className="text-gray-400">Kontrollen:</div>
                <div className="text-white font-medium">{preview.stats?.totalScans || 0}</div>
                
                <div className="text-gray-400">OK (grün):</div>
                <div className="text-green-400 font-medium">{preview.stats?.greenScans || 0}</div>
                
                <div className="text-gray-400">Auffällig (gelb):</div>
                <div className="text-yellow-400 font-medium">{preview.stats?.yellowScans || 0}</div>
                
                <div className="text-gray-400">Befall (rot):</div>
                <div className="text-red-400 font-medium">{preview.stats?.redScans || 0}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-white/10">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Abbrechen
          </button>

          <button
            onClick={generateReport}
            disabled={!selectedObjectId || !startDate || !endDate || generating}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Download size={16} />
            {generating ? "Generiere..." : "PDF herunterladen"}
          </button>
        </div>
      </div>
    </div>
  );
}