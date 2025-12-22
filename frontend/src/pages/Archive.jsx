/* ============================================================
   TRAPMAP - ARCHIV SEITE
   Zeigt archivierte Objekte und ermöglicht Wiederherstellung
   ============================================================ */

import { useState, useEffect } from 'react';
import { Archive, RotateCcw, Building2, Calendar, User, Search, AlertTriangle, FileText } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

export default function ArchivePage() {
  const [archivedObjects, setArchivedObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);
  const token = localStorage.getItem('trapmap_token');

  useEffect(() => {
    loadArchived();
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const loadArchived = async () => {
    try {
      const res = await axios.get(`${API}/objects/archived`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setArchivedObjects(res.data || []);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
      setToast({ type: 'error', msg: 'Fehler beim Laden der archivierten Objekte' });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id, name) => {
    if (!confirm(`Objekt "${name}" wiederherstellen?\n\nDas Objekt wird wieder in der Objektliste erscheinen.`)) return;
    
    setRestoring(id);
    
    try {
      await axios.post(`${API}/objects/${id}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setToast({ type: 'success', msg: `"${name}" wiederhergestellt` });
      loadArchived();
    } catch (err) {
      console.error('Fehler beim Wiederherstellen:', err);
      setToast({ type: 'error', msg: 'Fehler beim Wiederherstellen' });
    } finally {
      setRestoring(null);
    }
  };

  const handleDownloadPdf = async (id, name) => {
    setDownloadingPdf(id);
    setToast({ type: 'success', msg: 'Erstelle Archiv-Bericht...' });
    
    try {
      const res = await fetch(`${API}/objects/${id}/archive-report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('PDF konnte nicht erstellt werden');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Archiv_${name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      setToast({ type: 'success', msg: 'PDF-Bericht heruntergeladen' });
    } catch (err) {
      console.error('Fehler beim PDF-Download:', err);
      setToast({ type: 'error', msg: 'Fehler beim Erstellen des PDF-Berichts' });
    } finally {
      setDownloadingPdf(null);
    }
  };

  // Filtern nach Suchbegriff
  const filteredObjects = archivedObjects.filter(obj => 
    obj.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obj.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obj.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obj.archive_reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="archive-page p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600/20 rounded-lg flex items-center justify-center">
            <Archive size={24} className="text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Archiv</h1>
            <p className="text-sm text-gray-400">
              {archivedObjects.length} archivierte Objekte
            </p>
          </div>
        </div>

        {/* Suche */}
        {archivedObjects.length > 0 && (
          <div className="md:ml-auto relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suchen..."
              className="w-full md:w-64 pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : archivedObjects.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Archive size={32} className="text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">Keine archivierten Objekte</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Archivierte Objekte werden hier angezeigt. Du kannst Objekte über die Objektdetails archivieren.
          </p>
        </div>
      ) : filteredObjects.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle size={32} className="text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-400">Keine Objekte gefunden für "{searchTerm}"</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredObjects.map(obj => (
            <div 
              key={obj.id} 
              className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Objekt Info */}
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 size={24} className="text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-lg truncate">{obj.name}</h3>
                    <p className="text-sm text-gray-400 truncate">
                      {obj.address && `${obj.address}, `}{obj.zip} {obj.city}
                    </p>
                    
                    {/* Archivierungs-Details */}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(obj.archived_at).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {obj.archive_reason && (
                        <span className="text-orange-400">
                          Grund: {obj.archive_reason}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {/* PDF Download Button */}
                  <button
                    onClick={() => handleDownloadPdf(obj.id, obj.name)}
                    disabled={downloadingPdf === obj.id}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors whitespace-nowrap"
                    title="Aktuellen Audit-Bericht als PDF herunterladen"
                  >
                    {downloadingPdf === obj.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Lädt...</span>
                      </>
                    ) : (
                      <>
                        <FileText size={16} />
                        <span className="hidden sm:inline">PDF</span>
                      </>
                    )}
                  </button>

                  {/* Restore Button */}
                  <button
                    onClick={() => handleRestore(obj.id, obj.name)}
                    disabled={restoring === obj.id}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    {restoring === obj.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Lädt...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw size={16} />
                        <span className="hidden sm:inline">Wiederherstellen</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
        } text-white z-50`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
