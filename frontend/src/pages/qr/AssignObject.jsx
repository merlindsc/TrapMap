/* ============================================================
   TRAPMAP - ASSIGN OBJECT PAGE
   Box aus Pool einem Objekt zuweisen
   ============================================================ */

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Building2, MapPin, ChevronRight, Package, ArrowLeft } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function AssignObject() {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const boxId = searchParams.get("box_id");
  
  const { token } = useAuth();
  const navigate = useNavigate();

  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

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
  const handleAssign = async (objectId) => {
    if (!boxId || assigning) return;
    
    setAssigning(true);
    setError(null);

    try {
      await axios.post(
        `${API}/qr/assign-object`,
        {
          box_id: parseInt(boxId),
          object_id: parseInt(objectId),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Zur Maps-Seite mit Ersteinrichtung
      navigate(`/maps?object_id=${objectId}&openBox=${boxId}&firstSetup=true&flyTo=true`);
    } catch (err) {
      console.error("Zuweisungsfehler:", err);
      setError(err.response?.data?.error || "Zuweisung fehlgeschlagen");
      setAssigning(false);
    }
  };

  // Objekte filtern
  const filteredObjects = objects.filter(obj => 
    obj.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    obj.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    obj.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                onClick={() => handleAssign(obj.id)}
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