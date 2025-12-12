// ============================================
// PHOTO UPLOAD DIALOG
// Mit Objekt-Auswahl für Plan-Screenshots
// ============================================

import { useState, useRef } from "react";
import {
  PhotoIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from "@heroicons/react/24/outline";

const API = import.meta.env.VITE_API_URL;

export default function PhotoUploadDialog({ 
  isOpen, 
  onClose, 
  objects = [], 
  onUploadComplete 
}) {
  const token = localStorage.getItem("trapmap_token");
  const fileInputRef = useRef(null);
  
  const [selectedObject, setSelectedObject] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [description, setDescription] = useState("");
  const [photoType, setPhotoType] = useState("plan_screenshot");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Foto-Typen
  const photoTypes = [
    { id: "plan_screenshot", label: "Plan-Screenshot", icon: "🗺️" },
    { id: "documentation", label: "Dokumentation", icon: "📝" },
    { id: "finding", label: "Befund-Foto", icon: "🔍" },
    { id: "installation", label: "Installation", icon: "🔧" },
    { id: "other", label: "Sonstiges", icon: "📷" }
  ];

  // Datei auswählen
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validierung
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Nur Bilder erlaubt (JPG, PNG, GIF, WebP)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Datei zu groß (max. 10MB)");
      return;
    }

    setSelectedFile(file);
    setError("");

    // Preview erstellen
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // Upload durchführen
  const handleUpload = async () => {
    if (!selectedFile || !selectedObject) {
      setError("Bitte Objekt und Foto auswählen");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("photo", selectedFile);
      formData.append("object_id", selectedObject);
      formData.append("photo_type", photoType);
      formData.append("description", description);

      const res = await fetch(`${API}/photos/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload fehlgeschlagen");
      }

      const data = await res.json();
      setSuccess(true);
      
      // Callback
      if (onUploadComplete) {
        onUploadComplete(data);
      }

      // Nach 2s schließen
      setTimeout(() => {
        resetAndClose();
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Reset und schließen
  const resetAndClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setSelectedObject("");
    setDescription("");
    setPhotoType("plan_screenshot");
    setError("");
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={resetAndClose}
    >
      <div 
        className="bg-gray-800 rounded-xl w-full max-w-md overflow-hidden border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PhotoIcon className="w-6 h-6 text-white" />
            <h2 className="text-lg font-semibold text-white">Foto hochladen</h2>
          </div>
          <button onClick={resetAndClose} className="text-white/80 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Success State */}
          {success ? (
            <div className="text-center py-8">
              <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg text-white font-medium">Erfolgreich hochgeladen!</p>
            </div>
          ) : (
            <>
              {/* Objekt-Auswahl */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <BuildingOfficeIcon className="w-4 h-4 inline mr-1" />
                  Objekt auswählen *
                </label>
                <select
                  value={selectedObject}
                  onChange={(e) => setSelectedObject(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">-- Objekt wählen --</option>
                  {objects.map((obj) => (
                    <option key={obj.id} value={obj.id}>
                      {obj.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Foto-Typ */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Art des Fotos
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {photoTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setPhotoType(type.id)}
                      className={`px-3 py-2 rounded-lg text-sm transition flex flex-col items-center gap-1
                        ${photoType === type.id 
                          ? "bg-indigo-600 text-white border-2 border-indigo-400" 
                          : "bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600"
                        }`}
                    >
                      <span>{type.icon}</span>
                      <span className="text-xs">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Datei-Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Foto auswählen *
                </label>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {preview ? (
                  <div className="relative">
                    <img 
                      src={preview} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg border border-gray-600"
                    />
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreview(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-gray-600 rounded-lg hover:border-indigo-500 hover:bg-gray-700/50 transition flex flex-col items-center gap-2 text-gray-400"
                  >
                    <CloudArrowUpIcon className="w-10 h-10" />
                    <span>Klicken zum Auswählen</span>
                    <span className="text-xs text-gray-500">JPG, PNG, GIF, WebP (max. 10MB)</span>
                  </button>
                )}
              </div>

              {/* Beschreibung */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Beschreibung (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="z.B. Lageplan Erdgeschoss, Befund bei Box 23..."
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                  <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="px-5 py-4 bg-gray-900/50 border-t border-gray-700 flex justify-end gap-3">
            <button
              onClick={resetAndClose}
              className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              Abbrechen
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !selectedObject}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Lädt hoch...
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="w-4 h-4" />
                  Hochladen
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}