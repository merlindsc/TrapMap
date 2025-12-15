import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createLayout } from "../../api/layouts";

export default function LayoutCreate() {
  const [params] = useSearchParams();
  const objectId = params.get("object_id");

  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!image || !name) return;

    // 1. Bildgröße auslesen
    const img = new Image();
    img.src = preview;

    img.onload = async () => {
      const width = img.width;
      const height = img.height;

      // Hier würdest du das Bild auf S3 / Supabase Storage hochladen
      // Für jetzt: wir tun so, als wäre die URL schon fertig
      const fakeUrl = preview;

      const payload = {
        object_id: Number(objectId),
        name,
        image_url: fakeUrl,
        width,
        height,
      };

      const created = await createLayout(payload);

      navigate(`/layouts/${created.id}`);
    };
  };

  return (
    <div className="max-w-3xl mx-auto text-white dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-6">Neuen Lageplan anlegen</h1>

      <div className="space-y-4 bg-gray-800 dark:bg-gray-900 p-6 rounded-lg border border-gray-700 dark:border-gray-800">
        <div>
          <label className="block mb-1 text-gray-300 dark:text-gray-400">Name</label>
          <input
            className="w-full p-3 rounded bg-gray-900 dark:bg-gray-950 border border-gray-700 dark:border-gray-800 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. EG Lager"
          />
        </div>

        <div>
          <label className="block mb-1 text-gray-300 dark:text-gray-400">Lageplan-Bild</label>
          <input type="file" onChange={handleUpload} className="mb-3" />
          {preview && (
            <img src={preview} className="rounded border border-gray-700 dark:border-gray-800" />
          )}
        </div>

        <button
          onClick={handleSave}
          className="bg-blue-600 px-6 py-3 rounded-lg"
        >
          Lageplan speichern
        </button>
      </div>
    </div>
  );
}
