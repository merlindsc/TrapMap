import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getObject } from "../../api/objects";
import { ArrowLeft, Map, Boxes, Info, Settings, Image as ImageIcon } from "lucide-react";

export default function ObjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [objectData, setObjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState("");

  useEffect(() => {
    loadObject();
  }, [id]);

  const loadObject = async () => {
    try {
      const data = await getObject(id);
      setObjectData(data);
    } catch (err) {
      console.error(err);
      setError("Objekt konnte nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-white text-xl py-20">Lade Objekt...</div>
    );
  }

  if (!objectData) {
    return (
      <div className="text-center text-white text-xl py-20">
        Objekt nicht gefunden
      </div>
    );
  }

  /* TABS UI */
  const TabButton = ({ name, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(name)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
        activeTab === name
          ? "bg-blue-600 text-white"
          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto">

      {/* ZURÜCK-BUTTON */}
      <div className="mb-6">
        <Link
          to="/objects"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück zu Objekten</span>
        </Link>
      </div>

      {/* OBJEKT HEADER */}
      <h1 className="text-3xl font-bold text-white mb-1">{objectData.name}</h1>
      <p className="text-gray-400 mb-6">
        Adresse: {objectData.address || "Keine Adresse gespeichert"}
      </p>

      {/* TAB LEISTE */}
      <div className="flex gap-3 mb-8">
        <TabButton name="overview" label="Übersicht" icon={Info} />
        <TabButton name="layouts" label="Lagepläne" icon={Map} />
        <TabButton name="boxes" label="Boxen" icon={Boxes} />
        <TabButton name="settings" label="Einstellungen" icon={Settings} />
      </div>

      {/* TAB CONTENT WRAPPER */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">

        {/* --- ÜBERSICHT --- */}
        {activeTab === "overview" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Objekt-Informationen</h2>

            <p className="text-gray-300 mb-2">
              <strong>Ansprechpartner:</strong> {objectData.contact_person || "—"}
            </p>

            <p className="text-gray-300 mb-2">
              <strong>Notizen:</strong> {objectData.notes || "—"}
            </p>

            <p className="text-gray-300 mb-2">
              <strong>Status:</strong>{" "}
              {objectData.active ? (
                <span className="text-green-400 font-semibold">Aktiv</span>
              ) : (
                <span className="text-red-400 font-semibold">Inaktiv</span>
              )}
            </p>
          </div>
        )}

        {/* --- LAGEPLÄNE TAB --- */}
        {activeTab === "layouts" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Lagepläne</h2>

            <p className="text-gray-400 mb-4">
              Hier können Sie bis zu 10 Lagepläne pro Objekt verwalten.
            </p>

            {/* BUTTON: Neuer Lageplan */}
            <button
              onClick={() => navigate(`/layouts/new?object_id=${id}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mb-6"
            >
              + Lageplan hinzufügen
            </button>

            {/* LAGEPLAN-LISTE */}
            {!objectData.layouts || objectData.layouts.length === 0 ? (
              <div className="text-gray-400">Noch keine Lagepläne vorhanden.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {objectData.layouts.map((layout) => (
                  <div
                    key={layout.id}
                    className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden hover:border-blue-500 cursor-pointer transition"
                    onClick={() => navigate(`/layouts/${layout.id}`)}
                  >
                    {/* Bild */}
                    <img
                      src={layout.image_url}
                      alt="Lageplan"
                      className="w-full h-48 object-cover"
                    />

                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <ImageIcon className="w-4 h-4 text-blue-400" />
                        <h3 className="text-white text-lg font-semibold">
                          Lageplan #{layout.id}
                        </h3>
                      </div>

                      <p className="text-gray-400 text-sm">
                        Erstellt am{" "}
                        {new Date(layout.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- BOXEN TAB --- */}
        {activeTab === "boxes" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Alle Boxen</h2>
            <p className="text-gray-400">Boxübersicht folgt nach der Lageplan-Integration.</p>
          </div>
        )}

        {/* --- EINSTELLUNGEN TAB --- */}
        {activeTab === "settings" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Objekt-Einstellungen</h2>

            <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">
              Objekt archivieren / löschen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
