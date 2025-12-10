/* ============================================================
   TRAPMAP — AUDIT REPORT DIALOG
   Für die Reports-Seite
   ============================================================ */

import { useState, useEffect } from "react";
import { X, FileText, Download, Loader, Calendar } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function AuditReportDialog({ isOpen, onClose }) {
  const token = localStorage.getItem("trapmap_token");

  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Zeitraum
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const [startDate, setStartDate] = useState(lastMonth.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);

  // Objekte laden
  useEffect(() => {
    if (!isOpen) return;
    
    const loadObjects = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/reports/objects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setObjects(data);
        }
      } catch (e) {
        console.error("Load objects error:", e);
      } finally {
        setLoading(false);
      }
    };
    loadObjects();
  }, [isOpen, token]);

  // Schnellauswahl Zeitraum
  const setQuickRange = (type) => {
    const now = new Date();
    let start, end;
    
    switch (type) {
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
        break;
      case "lastMonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "3months":
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        end = now;
        break;
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        end = now;
        break;
      default:
        return;
    }
    
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  // PDF generieren
  const handleGenerate = async () => {
    if (!selectedObject) {
      alert("Bitte Objekt auswählen");
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
          objectId: selectedObject,
          startDate,
          endDate
        })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const obj = objects.find(o => o.id === parseInt(selectedObject));
        a.download = `Audit_${obj?.name || "Report"}_${new Date().toISOString().split("T")[0]}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || "Fehler beim Generieren");
      }
    } catch (e) {
      console.error("Generate error:", e);
      alert("Netzwerkfehler");
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] rounded-xl w-full max-w-md border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <FileText className="text-indigo-400" size={22} />
            <h2 className="text-lg font-bold text-white">Audit-Report erstellen</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="text-gray-400" size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Objekt Auswahl */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <FileText size={16} />
              Objekt *
            </label>
            <select
              value={selectedObject}
              onChange={(e) => setSelectedObject(e.target.value)}
              className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-3 text-white"
              disabled={loading}
            >
              <option value="">Bitte auswählen...</option>
              {objects.map(obj => (
                <option key={obj.id} value={obj.id}>{obj.name}</option>
              ))}
            </select>
          </div>

          {/* Zeitraum */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Calendar size={16} />
              Zeitraum
            </label>
            
            {/* Schnellauswahl */}
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { key: "thisMonth", label: "Dieser Monat" },
                { key: "lastMonth", label: "Letzter Monat" },
                { key: "3months", label: "3 Monate" },
                { key: "year", label: "Jahr" }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setQuickRange(key)}
                  className="px-3 py-1.5 text-xs bg-[#0d0d1a] border border-white/10 rounded-lg text-gray-300 hover:bg-[#252545] hover:border-indigo-500/50 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Datum Felder */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Von</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bis</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedObject}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader size={16} className="animate-spin" />
                Erstellen...
              </>
            ) : (
              <>
                <Download size={16} />
                PDF herunterladen
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}