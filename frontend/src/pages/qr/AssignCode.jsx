/* ============================================================
   TRAPMAP - ASSIGN CODE PAGE
   QR-Code einer neuen Box zuweisen
   
   Route: /qr/assign-code?code=XXX
   ============================================================ */

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  QrCode, Package, ArrowLeft, AlertCircle, CheckCircle 
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function AssignCode() {
  // Parameter aus Query-String (nicht URL-Parameter!)
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  
  const { token } = useAuth();
  const navigate = useNavigate();

  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBox, setSelectedBox] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Boxen laden
  useEffect(() => {
    if (!code) {
      setError("Kein QR-Code angegeben");
      setLoading(false);
      return;
    }

    const loadBoxes = async () => {
      try {
        const res = await axios.get(`${API}/boxes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBoxes(res.data || []);
      } catch (err) {
        console.error("Fehler beim Laden der Boxen:", err);
        setError("Boxen konnten nicht geladen werden");
      }
      setLoading(false);
    };

    loadBoxes();
  }, [token, code]);

  const assignCode = async () => {
    if (!selectedBox || !code) return;

    setSaving(true);
    setError(null);

    try {
      await axios.post(
        `${API}/qr/assign`,
        {
          code: code,
          box_id: parseInt(selectedBox),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess(true);
      
      setTimeout(() => {
        navigate(`/boxes`);
      }, 1500);
      
    } catch (err) {
      console.error("QR-Assign Fehler:", err);
      setError(err.response?.data?.error || "Zuweisung fehlgeschlagen");
      setSaving(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Lade Boxen...</p>
        </div>
      </div>
    );
  }

  // Success
  if (success) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Erfolgreich zugewiesen!</h2>
          <p className="text-gray-400">QR-Code wurde der Box zugewiesen.</p>
        </div>
      </div>
    );
  }

  // Kein Code
  if (!code) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Kein Code</h2>
          <p className="text-gray-400 mb-6">Es wurde kein QR-Code übergeben.</p>
          <button
            onClick={() => navigate("/qr/scanner")}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
          >
            Zum Scanner
          </button>
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
        
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
            <QrCode size={24} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">QR-Code zuordnen</h1>
            <p className="text-sm text-gray-400 font-mono">{code}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Info */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 font-semibold">Neuer QR-Code</p>
              <p className="text-yellow-200/80 text-sm mt-1">
                Dieser QR-Code ist noch keiner Box zugewiesen. Wähle eine Box aus der Liste.
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Box Auswahl */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">Box auswählen:</label>
          <select
            className="w-full p-4 bg-[#0d1117] border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
            value={selectedBox || ""}
            onChange={(e) => setSelectedBox(e.target.value)}
          >
            <option value="">— Box auswählen —</option>
            {boxes.map((box) => (
              <option key={box.id} value={box.id}>
                Box {box.number || box.id} {box.notes ? `(${box.notes})` : ""} {box.object_name ? `- ${box.object_name}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Submit Button */}
        <button
          disabled={!selectedBox || saving}
          onClick={assignCode}
          className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 ${
            selectedBox 
              ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
          }`}
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Speichere...
            </>
          ) : (
            <>
              <Package size={20} />
              QR-Code zuordnen
            </>
          )}
        </button>
      </div>
    </div>
  );
}