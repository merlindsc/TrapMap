/* ============================================================
   TRAPMAP – SIMPLE REPORT DIALOG
   Einfacher Report-Dialog mit Vorschau
   ============================================================ */

import { useState, useEffect } from "react";
import { X, FileText, Download, Eye, AlertCircle, CheckCircle } from "lucide-react";
import api from "../../api/api";

export default function SimpleReportDialog({ isOpen, onClose }) {
  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingObjects, setIsLoadingObjects] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [error, setError] = useState(null);

  // Objekte laden beim Öffnen
  useEffect(() => {
    if (isOpen) {
      loadObjects();
      resetState();
    }
  }, [isOpen]);

  // Preview laden wenn Objekt gewählt
  useEffect(() => {
    if (selectedObject && isOpen) {
      loadPreview();
    } else {
      setPreviewData(null);
    }
  }, [selectedObject, isOpen]);

  const resetState = () => {
    setSelectedObject("");
    setPreviewData(null);
    setError(null);
    setIsGenerating(false);
  };

  const loadObjects = async () => {
    setIsLoadingObjects(true);
    setError(null);
    
    try {
      const response = await api.get("/objects");
      setObjects(response.data || []);
    } catch (err) {
      console.error("Fehler beim Laden der Objekte:", err);
      setError("Objekte konnten nicht geladen werden");
    } finally {
      setIsLoadingObjects(false);
    }
  };

  const loadPreview = async () => {
    if (!selectedObject) return;

    setIsLoadingPreview(true);
    setError(null);

    try {
      const response = await api.get(`/audit-reports/${selectedObject}/preview`);
      setPreviewData(response.data);
    } catch (err) {
      console.error("Fehler beim Laden der Vorschau:", err);
      setPreviewData(null);
      // Kein Fehler anzeigen - Preview ist optional
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const generatePDF = async () => {
    if (!selectedObject) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await api.get(`/audit-reports/${selectedObject}`, {
        responseType: "blob",
        params: {
          maxScans: 100
        }
      });

      // PDF downloaden
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const objectName = objects.find(o => o.id == selectedObject)?.name || "Report";
      const timestamp = new Date().toISOString().split("T")[0];
      link.download = `Audit-Report-${objectName.replace(/[^a-zA-Z0-9]/g, "_")}-${timestamp}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Dialog nach erfolgreichem Download schließen
      setTimeout(() => {
        onClose();
      }, 500);

    } catch (err) {
      console.error("Fehler beim Generieren des PDFs:", err);
      setError("PDF konnte nicht erstellt werden. Bitte versuchen Sie es erneut.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={28} />
              <div>
                <h2 className="text-xl font-semibold">Audit-Report erstellen</h2>
                <p className="text-blue-100 text-sm">
                  Professioneller PDF-Report mit allen Kontrolldaten
                </p>
              </div>
            </div>
            <button
              onClick={() => { resetState(); onClose(); }}
              className="text-blue-100 hover:text-white p-2 rounded-lg hover:bg-blue-700/50 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          
          {/* Fehler-Anzeige */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
              <AlertCircle className="text-red-500" size={20} />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          <div className="grid lg:grid-cols-5 gap-6">
            
            {/* Linke Seite: Auswahl */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Objekt-Auswahl */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Objekt auswählen *
                </label>
                
                {isLoadingObjects ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                    <span>Lade Objekte...</span>
                  </div>
                ) : (
                  <select
                    value={selectedObject}
                    onChange={(e) => setSelectedObject(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors
                             text-base"
                  >
                    <option value="">-- Objekt wählen --</option>
                    {objects.map((obj) => (
                      <option key={obj.id} value={obj.id}>
                        {obj.name} {obj.address ? `(${obj.address})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Info-Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                  <CheckCircle size={18} />
                  Report-Inhalt
                </h3>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    Titelseite mit Objekt- und Dienstleister-Infos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    Zusammenfassung mit KPIs und Bewertung
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    Fallentypen-Übersicht
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    Detaillierte Fallenliste mit Status
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    Kontrollprotokoll (letzte 100 Scans)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    Techniker-Statistiken
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    HACCP/IFS Zertifizierungshinweise
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    Unterschriftenfelder
                  </li>
                </ul>
              </div>
            </div>

            {/* Rechte Seite: Vorschau */}
            <div className="lg:col-span-2">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-full">
                <div className="flex items-center gap-2 mb-4">
                  <Eye size={18} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Vorschau
                  </span>
                </div>

                {!selectedObject ? (
                  <div className="text-center py-12">
                    <FileText size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Wählen Sie ein Objekt aus
                    </p>
                  </div>
                ) : isLoadingPreview ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-600 border-t-transparent mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Lade Vorschau...
                    </p>
                  </div>
                ) : previewData ? (
                  <div className="space-y-4">
                    {/* Objekt-Info */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {previewData.object?.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {previewData.object?.address}
                        {previewData.object?.city && `, ${previewData.object.city}`}
                      </p>
                    </div>

                    {/* Statistiken */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          {previewData.stats?.totalBoxes || 0}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          Fallen
                        </div>
                      </div>
                      <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {previewData.stats?.totalScans || 0}
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400">
                          Kontrollen
                        </div>
                      </div>
                    </div>

                    {/* Status-Verteilung */}
                    {previewData.stats?.statusDistribution && (
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                          Status-Verteilung
                        </p>
                        <div className="flex gap-2 text-xs">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                            OK: {previewData.stats.statusDistribution.green || 0}
                          </span>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                            ⚠ {(previewData.stats.statusDistribution.yellow || 0) + (previewData.stats.statusDistribution.orange || 0)}
                          </span>
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                            Befall: {previewData.stats.statusDistribution.red || 0}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Organisation */}
                    {previewData.organisation?.name && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                        Dienstleister: {previewData.organisation.name}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Keine Vorschau verfügbar
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { resetState(); onClose(); }}
              className="px-5 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 
                       dark:hover:text-gray-200 transition-colors font-medium"
            >
              Abbrechen
            </button>
            <button
              onClick={generatePDF}
              disabled={!selectedObject || isGenerating}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 
                       disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium
                       transition-colors flex items-center gap-2 shadow-sm"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Wird erstellt...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>PDF erstellen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}