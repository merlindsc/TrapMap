/* ============================================================
   TRAPMAP - OBJECT DETAILS PAGE
   Vollstaendige Objekt-Detailseite mit allen Tabs
   ============================================================ */

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { 
  ArrowLeft, Map, Package, Info, Settings, MapPin, Phone, User, 
  FileText, Calendar, CheckCircle, Clock, ChevronRight, Edit, Trash2,
  X, Save
} from "lucide-react";
import FloorPlanEditor from "../../components/FloorPlanEditor";

const API = import.meta.env.VITE_API_URL;

export default function ObjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = localStorage.getItem("trapmap_token");

  const [objectData, setObjectData] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState("");
  
  // Edit Dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // ============================================
  // URL Parameter verarbeiten
  // ============================================
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'layouts', 'boxes', 'gps'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // ============================================
  // Load Data
  // ============================================
  useEffect(() => {
    loadObject();
    loadBoxes();
  }, [id]);

  const loadObject = async () => {
    try {
      const res = await fetch(`${API}/objects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setObjectData(data);
    } catch (err) {
      console.error(err);
      setError("Objekt konnte nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  const loadBoxes = async () => {
    try {
      const res = await fetch(`${API}/boxes?object_id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setBoxes(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error("Error loading boxes:", err);
    }
  };

  // ============================================
  // Navigation Handlers
  // ============================================
  const handleGoToMap = () => {
    // Navigate to maps with object pre-selected
    navigate(`/maps?object_id=${id}&flyTo=true`);
  };

  const handleEditObject = () => {
    setEditDialogOpen(true);
  };

  const handleReleaseUnplacedBoxes = async () => {
    const unplacedCount = boxes.filter(b => !b.position_type || b.position_type === 'none').length;
    
    if (!confirm(`${unplacedCount} unplatzierte Boxen zurück ins Lager verschieben?`)) {
      return;
    }

    try {
      const res = await fetch(`${API}/objects/${id}/release-unplaced-boxes`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Freigeben der Boxen');
      }

      // Reload boxes
      await loadBoxes();
      
      // Show success message
      alert(`${data.count} Boxen wurden ins Lager zurückgeschoben`);
    } catch (err) {
      console.error('Error releasing boxes:', err);
      alert(err.message || 'Fehler beim Freigeben der Boxen');
    }
  };

  // ============================================
  // Render
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Lade Objekt...</div>
      </div>
    );
  }

  if (!objectData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Objekt nicht gefunden</div>
      </div>
    );
  }

  // Separate boxes by location type
  const floorPlanBoxes = boxes.filter(b => b.layout_id || (b.pos_x !== null && b.pos_y !== null));
  const gpsBoxes = boxes.filter(b => b.lat && b.lng);
  const unplacedBoxes = boxes.filter(b => !b.position_type || b.position_type === 'none');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Back Button */}
      <Link
        to="/objects"
        className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Zurueck zu Objekten
      </Link>

      {/* Object Header */}
      <h1 className="text-3xl font-bold text-white mb-1">{objectData.name}</h1>
      <p className="text-gray-400 mb-6">
        Adresse: {objectData.address || "Keine Adresse gespeichert"}
      </p>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        <TabButton 
          active={activeTab === "overview"} 
          onClick={() => setActiveTab("overview")}
          icon={Info}
          label="Uebersicht"
        />
        <TabButton 
          active={activeTab === "layouts"} 
          onClick={() => setActiveTab("layouts")}
          icon={Map}
          label="Lageplaene"
        />
        <TabButton 
          active={activeTab === "boxes"} 
          onClick={() => setActiveTab("boxes")}
          icon={Package}
          label="Boxen"
        />
        {/* GPS-Karte nur anzeigen wenn GPS vorhanden */}
        {objectData.lat && objectData.lng && (
          <TabButton 
            active={false} 
            onClick={handleGoToMap}
            icon={MapPin}
            label="GPS-Karte"
          />
        )}
        <TabButton 
          active={activeTab === "settings"} 
          onClick={() => setActiveTab("settings")}
          icon={Settings}
          label="Einstellungen"
        />
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        
        {/* ============================================
            UEBERSICHT TAB
            ============================================ */}
        {activeTab === "overview" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-6">Objekt-Informationen</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Ansprechpartner */}
              <InfoCard 
                icon={User} 
                label="Ansprechpartner" 
                value={objectData.contact_person} 
              />
              
              {/* Telefon */}
              <InfoCard 
                icon={Phone} 
                label="Telefon" 
                value={objectData.phone} 
              />
              
              {/* Adresse */}
              <InfoCard 
                icon={MapPin} 
                label="Adresse" 
                value={objectData.address ? `${objectData.address}${objectData.zip ? `, ${objectData.zip}` : ''}${objectData.city ? ` ${objectData.city}` : ''}` : null} 
              />
              
              {/* Erstellt am */}
              <InfoCard 
                icon={Calendar} 
                label="Erstellt am" 
                value={objectData.created_at ? new Date(objectData.created_at).toLocaleDateString("de-DE") : null} 
              />
              
              {/* Notizen */}
              <div className="md:col-span-2">
                <InfoCard 
                  icon={FileText} 
                  label="Notizen" 
                  value={objectData.notes} 
                />
              </div>
              
              {/* Status */}
              <InfoCard 
                icon={CheckCircle} 
                label="Status" 
                value={objectData.active !== false ? "Aktiv" : "Inaktiv"}
                valueColor={objectData.active !== false ? "text-green-400" : "text-red-400"}
              />
            </div>

            {/* Schnellzugriff */}
            <h3 className="text-lg font-semibold text-white mb-4">Schnellzugriff</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveTab("layouts")}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                <Map className="w-4 h-4" />
                Lageplaene verwalten
              </button>
              <button
                onClick={() => setActiveTab("boxes")}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition"
              >
                <Package className="w-4 h-4" />
                Boxen anzeigen
              </button>
              {/* Nur anzeigen wenn GPS vorhanden */}
              {objectData.lat && objectData.lng && (
                <button
                  onClick={handleGoToMap}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition"
                >
                  <MapPin className="w-4 h-4" />
                  Auf Karte zeigen
                </button>
              )}
            </div>

            {/* GPS Info Box */}
            {!objectData.lat || !objectData.lng ? (
              <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="text-yellow-400 font-medium mb-1">Keine GPS-Position</h4>
                    <p className="text-yellow-200/70 text-sm mb-3">
                      Dieses Objekt hat noch keine GPS-Koordinaten. Sie koennen es trotzdem 
                      mit Lageplaenen nutzen, oder spaeter eine GPS-Position hinzufuegen.
                    </p>
                    <button
                      onClick={() => navigate("/maps")}
                      className="text-sm text-yellow-400 hover:text-yellow-300 underline"
                    >
                      GPS-Position ueber Karte hinzufuegen →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-4 bg-green-900/20 border border-green-600/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-green-500" />
                  <div>
                    <span className="text-green-400 font-medium">GPS-Position vorhanden</span>
                    <span className="text-green-200/70 text-sm ml-2">
                      {objectData.lat.toFixed(6)}, {objectData.lng.toFixed(6)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================
            LAGEPLAENE TAB
            ============================================ */}
        {activeTab === "layouts" && (
          <FloorPlanEditor 
            objectId={id} 
            objectName={objectData.name} 
            openBoxIdProp={searchParams.get('openBox')} 
          />
        )}

        {/* ============================================
            BOXEN TAB
            ============================================ */}
        {activeTab === "boxes" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                Alle Boxen ({boxes.length})
              </h2>
              {boxes.filter(b => !b.position_type || b.position_type === 'none').length > 0 && (
                <button
                  onClick={handleReleaseUnplacedBoxes}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition text-sm"
                >
                  <Package className="w-4 h-4" />
                  {boxes.filter(b => !b.position_type || b.position_type === 'none').length} Unplatzierte freigeben
                </button>
              )}
            </div>

            {boxes.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Noch keine Boxen vorhanden</p>
                <p className="text-sm mt-2">Erstellen Sie Boxen ueber Lageplaene oder die GPS-Karte</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Unplatzierte Boxen */}
                {unplacedBoxes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-orange-400 uppercase mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Noch nicht platziert ({unplacedBoxes.length})
                    </h3>
                    <div className="bg-orange-900/10 border border-orange-600/30 rounded-lg p-4 mb-3">
                      <p className="text-orange-200/70 text-sm">
                        Diese Boxen wurden dem Objekt zugewiesen, aber noch nicht auf einem Lageplan oder per GPS platziert.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {unplacedBoxes.map(box => (
                        <BoxCard key={box.id} box={box} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Lageplan Boxen */}
                {floorPlanBoxes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3 flex items-center gap-2">
                      <Map className="w-4 h-4" />
                      Auf Lageplan ({floorPlanBoxes.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {floorPlanBoxes.map(box => (
                        <BoxCard key={box.id} box={box} />
                      ))}
                    </div>
                  </div>
                )}

                {/* GPS Boxen */}
                {gpsBoxes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      GPS-Koordinaten ({gpsBoxes.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {gpsBoxes.map(box => (
                        <BoxCard key={box.id} box={box} showGps />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================
            EINSTELLUNGEN TAB
            ============================================ */}
        {activeTab === "settings" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-6">Objekt-Einstellungen</h2>
            
            <div className="space-y-4">
              <button
                onClick={handleEditObject}
                className="flex items-center gap-2 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition w-full md:w-auto"
              >
                <Settings className="w-5 h-5" />
                Objekt bearbeiten
              </button>

              <button
                className="flex items-center gap-2 px-4 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 rounded-lg transition w-full md:w-auto"
                onClick={() => {
                  if (confirm("Objekt wirklich archivieren/loeschen?")) {
                    // TODO: Implement delete
                    alert("Loeschen noch nicht implementiert");
                  }
                }}
              >
                <Trash2 className="w-5 h-5" />
                Objekt archivieren / loeschen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================
          EDIT DIALOG
          ============================================ */}
      {editDialogOpen && (
        <ObjectEditDialog
          object={objectData}
          onClose={() => setEditDialogOpen(false)}
          onSave={(updated) => {
            setObjectData(updated);
            setEditDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// Sub Components
// ============================================

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function InfoCard({ icon: Icon, label, value, valueColor = "text-white" }) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <div className={`${valueColor} ${value ? '' : 'text-gray-500'}`}>
        {value || "—"}
      </div>
    </div>
  );
}

function BoxCard({ box, showGps = false }) {
  const statusColors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${statusColors[box.current_status] || 'bg-gray-500'}`} />
          <span className="font-medium text-white">
            {box.number || box.box_name || `Box ${box.id}`}
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-500" />
      </div>
      
      <div className="text-sm text-gray-400">
        {box.box_type_name || box.box_types?.name || "Standard"}
      </div>
      
      {box.last_scan_at && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
          <Clock className="w-3 h-3" />
          Letzte Kontrolle: {new Date(box.last_scan_at).toLocaleDateString("de-DE")}
        </div>
      )}
      
      {showGps && box.lat && box.lng && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
          <MapPin className="w-3 h-3" />
          {box.lat.toFixed(4)}, {box.lng.toFixed(4)}
        </div>
      )}
    </div>
  );
}

// ============================================
// Object Edit Dialog (inline)
// ============================================
function ObjectEditDialog({ object, onClose, onSave }) {
  const token = localStorage.getItem("trapmap_token");
  
  const [name, setName] = useState(object.name || "");
  const [address, setAddress] = useState(object.address || "");
  const [zip, setZip] = useState(object.zip || "");
  const [city, setCity] = useState(object.city || "");
  const [contactPerson, setContactPerson] = useState(object.contact_person || "");
  const [phone, setPhone] = useState(object.phone || "");
  const [notes, setNotes] = useState(object.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Bitte Objektname eingeben!");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/objects/${object.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          address,
          zip,
          city,
          contact_person: contactPerson,
          phone,
          notes,
        }),
      });

      if (!res.ok) throw new Error("Update failed");
      
      const updated = await res.json();
      onSave(updated);
    } catch (e) {
      console.error("Error updating object:", e);
      alert("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Objekt bearbeiten</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Objektname *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
              placeholder="z.B. Baeckerei Mueller"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Adresse</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
              placeholder="Strasse und Hausnummer"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">PLZ</label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
                placeholder="12345"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-300 mb-1">Stadt</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
                placeholder="Berlin"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Ansprechpartner</label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
              placeholder="Name"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Telefon</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
              placeholder="+49 123 456789"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Notizen</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white resize-none"
              placeholder="Interne Notizen..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}