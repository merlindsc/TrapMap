/* ============================================================
   TRAPMAP - OBJECT LIST
   Mit Anzeige des Lokalisierungstyps (GPS / Lageplan / Beides)
   ============================================================ */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Plus, MapPin, Map, Layers } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

export default function ObjectList() {
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem("trapmap_token");

  useEffect(() => {
    loadObjects();
  }, []);

  const loadObjects = async () => {
    try {
      // Load objects with floor plan count
      const res = await fetch(`${API}/objects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const objectsArray = Array.isArray(data) ? data : data.data || [];
      
      // Load floor plan counts for each object
      const objectsWithCounts = await Promise.all(
        objectsArray.map(async (obj) => {
          try {
            const fpRes = await fetch(`${API}/layouts?object_id=${obj.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const fpData = await fpRes.json();
            const floorPlans = Array.isArray(fpData) ? fpData : fpData.data || [];
            return { ...obj, floor_plan_count: floorPlans.length };
          } catch {
            return { ...obj, floor_plan_count: 0 };
          }
        })
      );
      
      setObjects(objectsWithCounts);
    } catch (err) {
      setError('Fehler beim Laden der Objekte');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Lade Objekte...</div>
      </div>
    );
  }

  const handleCreate = () => navigate("/objects/new");

  // Determine location type
  const getLocationType = (obj) => {
    const hasGPS = obj.lat && obj.lng;
    const hasFloorPlans = obj.floor_plan_count > 0;
    
    if (hasGPS && hasFloorPlans) return "both";
    if (hasGPS) return "gps";
    if (hasFloorPlans) return "floorplan";
    return "none";
  };

  const LocationBadge = ({ type }) => {
    const badges = {
      both: { 
        icon: Layers, 
        label: "GPS + Lageplan", 
        bg: "bg-purple-900/50", 
        text: "text-purple-300",
        border: "border-purple-500/50"
      },
      gps: { 
        icon: MapPin, 
        label: "GPS", 
        bg: "bg-green-900/50", 
        text: "text-green-300",
        border: "border-green-500/50"
      },
      floorplan: { 
        icon: Map, 
        label: "Lageplan", 
        bg: "bg-blue-900/50", 
        text: "text-blue-300",
        border: "border-blue-500/50"
      },
      none: { 
        icon: Building2, 
        label: "Keine Karte", 
        bg: "bg-gray-700/50", 
        text: "text-gray-400",
        border: "border-gray-600"
      }
    };
    
    const badge = badges[type] || badges.none;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text} border ${badge.border}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Objekte</h1>
          <p className="text-gray-600 dark:text-gray-400">Verwalten Sie alle Ihre Standorte</p>
        </div>

        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Neues Objekt</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
          {error}
        </div>
      )}

      {/* LEERE LISTE */}
      {objects.length === 0 ? (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-12 text-center border border-gray-300 dark:border-gray-700">
          <Building2 className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Noch keine Objekte</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Erstellen Sie Ihr erstes Objekt - mit oder ohne GPS-Koordinaten
          </p>

          <button
            onClick={handleCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Neues Objekt erstellen
          </button>
        </div>
      ) : (
        /* GRID ANSICHT */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {objects.map((obj) => {
            const locationType = getLocationType(obj);
            
            return (
              <Link
                key={obj.id}
                to={`/objects/${obj.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/10"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-blue-600 p-3 rounded-lg">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        obj.active !== false
                          ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {obj.active !== false ? "Aktiv" : "Inaktiv"}
                    </span>
                    <LocationBadge type={locationType} />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{obj.name}</h3>

                {obj.address && (
                  <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400 text-sm mb-2">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{obj.address}</span>
                  </div>
                )}

                {/* Stats */}
                <div className="flex gap-4 mt-4 pt-4 border-t border-gray-300 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
                  {obj.floor_plan_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Map className="w-4 h-4" />
                      {obj.floor_plan_count} Lageplan{obj.floor_plan_count !== 1 ? "e" : ""}
                    </span>
                  )}
                  {obj.lat && obj.lng && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      GPS
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}