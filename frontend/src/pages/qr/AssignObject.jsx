/* ============================================================
   TRAPMAP - ASSIGN OBJECT PAGE
   Box aus Pool einem Objekt zuweisen
   
   FLOW:
   1. Objekt auswählen
   2. Box wird zugewiesen
   3. Platzierungsauswahl (GPS oder Lageplan)
   4. → Weiterleitung zur gewählten Ansicht
   ============================================================ */

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  Building2, MapPin, ChevronRight, Package, ArrowLeft,
  Navigation, Layers, CheckCircle
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function AssignObject() {
  // Parameter aus Query-String (nicht URL-Parameter!)
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const boxId = searchParams.get("box_id");
  
  const { token } = useAuth();
  const navigate = useNavigate();

  // States
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Platzierungsauswahl State
  const [showPlacementChoice, setShowPlacementChoice] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);
  const [objectFloorplans, setObjectFloorplans] = useState([]);

  // Objekte laden
  useEffect(() => {
    const loadObjects = async () => {
      try {
        const res = await axios.get(`${API}/objects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setObjects(res.data || []);
      } catch (err) {
        console.error("Fehler beim Laden der Objekte:", err);
        setError("Objekte konnten nicht geladen werden");
      }
      setLoading(false);
    };

    loadObjects();
  }, [token]);

  // Box einem Objekt zuweisen
  const handleAssign = async (object) => {
    if (!boxId || assigning) return;
    
    setAssigning(true);
    setError(null);

    try {
      // Box zuweisen
      await axios.post(
        `${API}/qr/assign-object`,
        {
          box_id: parseInt(boxId),
          object_id: parseInt(object.id),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Lagepläne des Objekts laden
      let floorplans = [];
      try {
        const floorplanRes = await axios.get(`${API}/floorplans/object/${object.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        floorplans = floorplanRes.data || [];
      } catch (err) {
        console.error("Floorplan load error:", err);
      }

      // Platzierungsauswahl anzeigen
      setSelectedObject(object);
      setObjectFloorplans(floorplans);
      setAssigning(false);
      setShowPlacementChoice(true);

    } catch (err) {
      console.error("Zuweisungsfehler:", err);
      setError(err.response?.data?.error || "Zuweisung fehlgeschlagen");
      setAssigning(false);
    }
  };

  // Platzierungsauswahl: GPS
  const handleChooseGPS = () => {
    if (!selectedObject) return;
    navigate(`/maps?object_id=${selectedObject.id}&openBox=${boxId}&firstSetup=true`);
  };

  // Platzierungsauswahl: Lageplan
  const handleChooseFloorplan = () => {
    if (!selectedObject) return;
    // GEÄNDERT: Direkt zum Lageplan-Editor navigieren
    navigate(`/layouts/${selectedObject.id}?placeBox=${boxId}`);
  };

  // Objekte filtern
  const filteredObjects = objects.filter(obj => 
    obj.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    obj.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    obj.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Lade Objekte...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: PLATZIERUNGSAUSWAHL
  // ============================================
  if (showPlacementChoice && selectedObject) {
    const hasFloorplans = objectFloorplans.length > 0;

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Header */}
        <div className="bg-[#0d1117] border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Box zugewiesen!</h1>
              <p className="text-sm text-gray-400">{selectedObject.name}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Info */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500/30 rounded-lg flex items-center justify-center">
                <Package size={20} className="text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-green-300">Erfolgreich zugewiesen</p>
                <p className="text-sm text-gray-400">Code: {code}</p>
              </div>
            </div>
            <p className="text-green-200/80 text-sm">
              Wo soll die Box jetzt positioniert werden?
            </p>
          </div>

          {/* Auswahl */}
          <div className="space-y-3">
            {/* GPS Option */}
            <button
              onClick={handleChooseGPS}
              className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-white/10 hover:border-green-500/50 rounded-xl p-5 text-left transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Navigation size={28} className="text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-white">GPS-Karte</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Auf der Karte platzieren mit GPS-Koordinaten.
                    Ideal für Außenbereiche.
                  </p>
                </div>
              </div>
            </button>

            {/* Lageplan Option */}
            {hasFloorplans ? (
              <button
                onClick={handleChooseFloorplan}
                className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-white/10 hover:border-blue-500/50 rounded-xl p-5 text-left transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Layers size={28} className="text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-white">Lageplan</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Auf einem Gebäudeplan platzieren mit Grid-Position.
                      Ideal für Innenbereiche.
                    </p>
                    <p className="text-xs text-blue-400 mt-2">
                      {objectFloorplans.length} Lageplan{objectFloorplans.length > 1 ? 'e' : ''} verfügbar
                    </p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="w-full bg-[#111] border border-white/5 rounded-xl p-5 opacity-50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Layers size={28} className="text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-400">Lageplan</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Kein Lageplan für dieses Objekt vorhanden.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Später platzieren */}
          <button
            onClick={() => navigate(`/objects/${selectedObject.id}`)}
            className="w-full py-3 text-gray-400 hover:text-white text-sm"
          >
            Später platzieren →
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: OBJEKT-AUSWAHL
  // ============================================
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-[#0d1117] border-b border-white/10 px-4 py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft size={20} />
          Zurück
        </button>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
            <Package size={24} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Box zuweisen</h1>
            <p className="text-sm text-gray-400">Code: {code}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Info */}
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-4">
          <p className="text-indigo-300 text-sm">
            Diese Box ist noch keinem Objekt zugewiesen. Wähle ein Objekt aus, um die Box dort zu installieren.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Objekt suchen..."
            className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Object List */}
        <div className="space-y-2">
          {filteredObjects.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Building2 size={48} className="mx-auto mb-4 opacity-50" />
              <p>Keine Objekte gefunden</p>
            </div>
          ) : (
            filteredObjects.map((obj) => (
              <button
                key={obj.id}
                onClick={() => handleAssign(obj)}
                disabled={assigning}
                className="w-full bg-[#0d1117] hover:bg-[#161b22] border border-white/10 hover:border-indigo-500/50 rounded-xl p-4 text-left transition-all flex items-center gap-4 disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 size={20} className="text-indigo-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{obj.name}</h3>
                  {(obj.address || obj.city) && (
                    <p className="text-sm text-gray-400 truncate flex items-center gap-1">
                      <MapPin size={12} />
                      {[obj.address, obj.city].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                
                <ChevronRight size={20} className="text-gray-500 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {assigning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white">Box wird zugewiesen...</p>
          </div>
        </div>
      )}
    </div>
  );
}