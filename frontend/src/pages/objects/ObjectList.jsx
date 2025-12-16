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
        <div style={{ color: 'var(--text-primary, #ffffff)' }} className="text-xl">Lade Objekte...</div>
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
        style: { 
          background: 'rgba(168, 85, 247, 0.15)',
          color: '#c084fc',
          borderColor: 'rgba(168, 85, 247, 0.4)'
        }
      },
      gps: { 
        icon: MapPin, 
        label: "GPS", 
        style: { 
          background: 'rgba(16, 185, 129, 0.15)',
          color: '#6ee7b7',
          borderColor: 'rgba(16, 185, 129, 0.4)'
        }
      },
      floorplan: { 
        icon: Map, 
        label: "Lageplan", 
        style: { 
          background: 'rgba(59, 130, 246, 0.15)',
          color: '#93c5fd',
          borderColor: 'rgba(59, 130, 246, 0.4)'
        }
      },
      none: { 
        icon: Building2, 
        label: "Keine Karte", 
        style: { 
          background: 'var(--bg-hover, rgba(255, 255, 255, 0.05))',
          color: 'var(--text-muted, #9ca3af)',
          borderColor: 'var(--border-color, rgba(255, 255, 255, 0.08))'
        }
      }
    };
    
    const badge = badges[type] || badges.none;
    const Icon = badge.icon;
    
    return (
      <span 
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border"
        style={badge.style}
      >
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
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary, #ffffff)' }}>Objekte</h1>
          <p style={{ color: 'var(--text-muted, #64748b)' }}>Verwalten Sie alle Ihre Standorte</p>
        </div>

        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors"
          style={{ 
            background: '#3b82f6',
            color: '#ffffff'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
        >
          <Plus className="w-5 h-5" />
          <span>Neues Objekt</span>
        </button>
      </div>

      {error && (
        <div 
          className="mb-4 p-4 border rounded"
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            borderColor: 'rgba(239, 68, 68, 0.4)',
            color: '#fca5a5'
          }}
        >
          {error}
        </div>
      )}

      {/* LEERE LISTE */}
      {objects.length === 0 ? (
        <div 
          className="rounded-lg p-12 text-center border"
          style={{
            background: 'var(--bg-card, #1f2937)',
            borderColor: 'var(--border-color, rgba(255, 255, 255, 0.08))'
          }}
        >
          <Building2 className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted, #64748b)' }} />
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary, #ffffff)' }}>Noch keine Objekte</h3>
          <p className="mb-6" style={{ color: 'var(--text-muted, #64748b)' }}>
            Erstellen Sie Ihr erstes Objekt - mit oder ohne GPS-Koordinaten
          </p>

          <button
            onClick={handleCreate}
            className="px-6 py-3 rounded-lg font-semibold"
            style={{ 
              background: '#3b82f6',
              color: '#ffffff'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
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
                className="rounded-lg p-6 border transition-all"
                style={{
                  background: 'var(--bg-card, #1f2937)',
                  borderColor: 'var(--border-color, rgba(255, 255, 255, 0.08))'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color, rgba(255, 255, 255, 0.08))';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg" style={{ background: '#3b82f6' }}>
                    <Building2 className="w-6 h-6" style={{ color: '#ffffff' }} />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={
                        obj.active !== false
                          ? { background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' }
                          : { background: 'var(--bg-hover, rgba(255, 255, 255, 0.05))', color: 'var(--text-muted, #9ca3af)' }
                      }
                    >
                      {obj.active !== false ? "Aktiv" : "Inaktiv"}
                    </span>
                    <LocationBadge type={locationType} />
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary, #ffffff)' }}>{obj.name}</h3>

                {obj.address && (
                  <div className="flex items-start gap-2 text-sm mb-2" style={{ color: 'var(--text-muted, #64748b)' }}>
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{obj.address}</span>
                  </div>
                )}

                {/* Stats */}
                <div 
                  className="flex gap-4 mt-4 pt-4 border-t text-sm"
                  style={{ 
                    borderColor: 'var(--border-color, rgba(255, 255, 255, 0.08))',
                    color: 'var(--text-muted, #64748b)'
                  }}
                >
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