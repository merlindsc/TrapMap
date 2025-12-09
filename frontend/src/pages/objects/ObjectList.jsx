import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getObjects } from '../../api/objects';
import { Building2, Plus, MapPin } from 'lucide-react';

export default function ObjectList() {
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadObjects();
  }, []);

  const loadObjects = async () => {
    try {
      const data = await getObjects();   // ✔ getObjects liefert direkt das Array!
      setObjects(data || []);
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

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Objekte</h1>
          <p className="text-gray-400">Verwalten Sie alle Ihre Standorte</p>
        </div>

        {/* EINZIGER BUTTON */}
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
        <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
          <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Noch keine Objekte</h3>

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
          {objects.map((obj) => (
            <Link
              key={obj.id}
              to={`/objects/${obj.id}`}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-all hover:shadow-blue-500/20"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-blue-600 p-3 rounded-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    obj.active
                      ? "bg-green-900/50 text-green-300"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {obj.active ? "Aktiv" : "Inaktiv"}
                </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{obj.name}</h3>

              {obj.address && (
                <div className="flex items-start gap-2 text-gray-400 text-sm mb-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{obj.address}</span>
                </div>
              )}

              {obj.notes && (
                <p className="text-gray-400 text-sm line-clamp-2">{obj.notes}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
