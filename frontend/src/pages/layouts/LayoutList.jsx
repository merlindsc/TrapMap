import React, { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { getLayoutsByObject } from "../../api/layouts";
import { Plus, Map as MapIcon } from "lucide-react";

export default function LayoutList() {
  const [params] = useSearchParams();
  const objectId = params.get("object_id");

  const navigate = useNavigate();
  const [layouts, setLayouts] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const data = await getLayoutsByObject(objectId);
    setLayouts(data);
  };

  return (
    <div className="max-w-5xl mx-auto text-white">

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Lagepläne</h1>

        <button
          className="bg-blue-600 px-4 py-2 rounded-lg flex items-center gap-2"
          onClick={() => navigate(`/layouts/create?object_id=${objectId}`)}
        >
          <Plus className="w-5 h-5" />
          Neuer Lageplan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {layouts.map((layout) => (
          <Link
            key={layout.id}
            to={`/layouts/${layout.id}`}
            className="bg-gray-800 p-5 rounded-lg border border-gray-700 hover:border-blue-500 transition"
          >
            <img
              src={layout.image_url}
              className="rounded mb-4 border border-gray-600"
            />

            <h2 className="text-xl font-semibold">{layout.name}</h2>

            <p className="text-gray-400 text-sm mt-2">
              Größe: {layout.width} × {layout.height}px
            </p>

            <div className="flex items-center gap-2 text-blue-400 mt-3">
              <MapIcon className="w-4 h-4" />
              Bearbeiten
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
