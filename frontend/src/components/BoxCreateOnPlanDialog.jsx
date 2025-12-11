/* ============================================================
   TRAPMAP – BOX CREATE ON PLAN DIALOG
   Gleiche Logik wie BoxCreateDialog (Maps)
   Grid-Position wird automatisch vom Klick übernommen
   ============================================================ */

import { useState } from "react";
import { X, Save, Camera, MapPin } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

const STATUS_CONFIG = {
  green: { label: "OK", icon: "✓", color: "#10b981" },
  yellow: { label: "Auffällig", icon: "!", color: "#eab308" },
  orange: { label: "Erhöht", icon: "!!", color: "#f97316" },
  red: { label: "Befall", icon: "✗", color: "#ef4444" }
};

export default function BoxCreateOnPlanDialog({ objectId, floorPlanId, position, boxTypes, onClose, onCreated }) {
  const token = localStorage.getItem("trapmap_token");

  // Box Daten
  const [boxTypeId, setBoxTypeId] = useState("");
  const [notes, setNotes] = useState("");
  const [intervalType, setIntervalType] = useState("fixed");
  const [intervalFixed, setIntervalFixed] = useState(30);
  const [intervalRangeStart, setIntervalRangeStart] = useState(20);
  const [intervalRangeEnd, setIntervalRangeEnd] = useState(30);
  
  // Erstinstallation
  const [status, setStatus] = useState("green");
  const [findings, setFindings] = useState("");
  const [scanNotes, setScanNotes] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Grid-Position aus position props (automatisch vom Klick)
  const gridPosition = position.gridCol && position.gridRow 
    ? `${position.gridCol}${position.gridRow}` 
    : null;

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!boxTypeId) {
      setError("Bitte Box-Typ auswählen!");
      return;
    }

    setSaving(true);
    setError("");

    const interval = intervalType === "fixed"
      ? intervalFixed
      : Math.floor((intervalRangeStart + intervalRangeEnd) / 2);

    try {
      // 1. Box erstellen
      const boxRes = await fetch(`${API}/boxes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          object_id: objectId,
          box_type_id: parseInt(boxTypeId),
          notes,
          control_interval_days: interval,
          floor_plan_id: floorPlanId,
          pos_x: position.x,
          pos_y: position.y,
          grid_position: gridPosition,
          current_status: status
        })
      });

      if (!boxRes.ok) {
        const err = await boxRes.json();
        throw new Error(err.error || "Fehler beim Erstellen der Box");
      }

      const newBox = await boxRes.json();
      console.log("✅ Box erstellt:", newBox);

      // 2. Foto hochladen falls vorhanden
      let photoUrl = null;
      if (photo && newBox?.id) {
        const formData = new FormData();
        formData.append("image", photo);
        formData.append("box_id", newBox.id);

        try {
          const uploadRes = await fetch(`${API}/scans/upload`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            photoUrl = uploadData.url;
          }
        } catch (uploadErr) {
          console.warn("Foto-Upload fehlgeschlagen:", uploadErr);
        }
      }

      // 3. Erstinstallation-Scan erstellen
      if (newBox?.id) {
        await fetch(`${API}/scans`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            box_id: newBox.id,
            status: status,
            findings: findings || null,
            notes: scanNotes || "Erstinstallation",
            photo_url: photoUrl
          })
        });
        console.log("✅ Erstinstallation-Scan erstellt");
      }

      onCreated();
    } catch (err) {
      console.error("❌ Error:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-gray-800 rounded-xl w-full max-w-lg border border-gray-700 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              📦 Neue Box erstellen
            </h2>
            <div className="flex items-center gap-3 mt-1">
              {gridPosition && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-sm rounded font-mono font-bold">
                  {gridPosition}
                </span>
              )}
              <span className="text-xs text-gray-500">
                Position: {position.x.toFixed(1)}%, {position.y.toFixed(1)}%
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Info */}
          <div className="p-3 bg-blue-900/30 border border-blue-700 rounded-lg text-blue-300 text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>
              Die Box-Nummer wird automatisch vergeben
              {gridPosition && <span className="font-bold ml-1">• Grid: {gridPosition}</span>}
            </span>
          </div>

          {/* Box-Typ */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Box-Typ *</label>
            <select
              value={boxTypeId}
              onChange={(e) => setBoxTypeId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
            >
              <option value="">Bitte auswählen...</option>
              {boxTypes?.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kontrollintervall */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Kontrollintervall *</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setIntervalType("fixed")}
                className={`px-4 py-2 rounded-lg border transition ${
                  intervalType === "fixed"
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-gray-900 border-gray-600 text-gray-400 hover:border-gray-500"
                }`}
              >
                Fix
              </button>
              <button
                type="button"
                onClick={() => setIntervalType("range")}
                className={`px-4 py-2 rounded-lg border transition ${
                  intervalType === "range"
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-gray-900 border-gray-600 text-gray-400 hover:border-gray-500"
                }`}
              >
                Range
              </button>
            </div>

            {intervalType === "fixed" && (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={intervalFixed}
                  onChange={(e) => setIntervalFixed(parseInt(e.target.value) || 30)}
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-center"
                />
                <span className="text-gray-400">Tage</span>
              </div>
            )}

            {intervalType === "range" && (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={intervalRangeStart}
                  onChange={(e) => setIntervalRangeStart(parseInt(e.target.value) || 20)}
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-center"
                />
                <span className="text-gray-400">bis</span>
                <input
                  type="number"
                  min={intervalRangeStart}
                  max="365"
                  value={intervalRangeEnd}
                  onChange={(e) => setIntervalRangeEnd(parseInt(e.target.value) || 30)}
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-center"
                />
                <span className="text-gray-400">Tage</span>
              </div>
            )}
          </div>

          {/* Notizen zur Box */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Notizen zur Box</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zusätzliche Informationen..."
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white resize-none"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">🔍 Erstinstallation</h3>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Status</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatus(key)}
                  className={`p-2 rounded-lg text-center text-xs transition border-2 ${
                    status === key
                      ? "border-white"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: cfg.color, color: "#fff" }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Befunde */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Befunde</label>
            <input
              type="text"
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              placeholder="z.B. Fraßspuren, Kot..."
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Scan Notizen */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Scan-Notizen</label>
            <textarea
              rows="2"
              value={scanNotes}
              onChange={(e) => setScanNotes(e.target.value)}
              placeholder="Bemerkungen zur Erstinstallation..."
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white resize-none"
            />
          </div>

          {/* Foto */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Foto (optional)</label>
            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-gray-500 transition">
              {photoPreview ? (
                <img src={photoPreview} alt="Vorschau" className="max-h-24 rounded" />
              ) : (
                <>
                  <Camera className="w-6 h-6 text-gray-500" />
                  <span className="text-gray-500">Foto hinzufügen</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Erstellen
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}