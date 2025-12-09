import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useParams, useNavigate } from "react-router-dom";

const AssignCode = () => {
  const { code } = useParams(); // QR-Code aus URL
  const { token } = useAuth();
  const navigate = useNavigate();

  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBox, setSelectedBox] = useState(null);
  const [saving, setSaving] = useState(false);

  // Boxen laden → Benutzer wählt Box aus
  useEffect(() => {
    const loadBoxes = async () => {
      try {
        const res = await axios.get("/api/boxes", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setBoxes(res.data || []);
      } catch (err) {
        console.error("Fehler beim Laden der Boxen:", err);
      }

      setLoading(false);
    };

    loadBoxes();
  }, []);

  const assignCode = async () => {
    if (!selectedBox) return;

    setSaving(true);

    try {
      await axios.post(
        "/api/qr/assign",
        {
          qr_code: code,
          box_id: selectedBox,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      navigate(`/boxes/${selectedBox}`);
    } catch (err) {
      console.error("QR-Assign Fehler:", err);
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-white">Lade Boxen…</div>;

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-2">QR-Code zuordnen</h1>
      <p className="mb-5">Code: <strong>{code}</strong></p>

      <label className="block mb-4">
        <span className="text-gray-300">Box auswählen:</span>
        <select
          className="mt-2 p-2 bg-gray-800 rounded w-full"
          value={selectedBox || ""}
          onChange={(e) => setSelectedBox(e.target.value)}
        >
          <option value="">— Box auswählen —</option>
          {boxes.map((box) => (
            <option key={box.id} value={box.id}>
              Box {box.number} ({box.notes || "Keine Beschreibung"})
            </option>
          ))}
        </select>
      </label>

      <button
        disabled={!selectedBox || saving}
        className={`px-4 py-2 rounded ${
          selectedBox ? "bg-blue-600" : "bg-gray-600 cursor-not-allowed"
        }`}
        onClick={assignCode}
      >
        {saving ? "Speichere…" : "QR-Code zuordnen"}
      </button>
    </div>
  );
};

export default AssignCode;
