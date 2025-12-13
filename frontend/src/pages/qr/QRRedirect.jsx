/* ============================================================
   TRAPMAP - QR REDIRECT PAGE
   Verarbeitet direkte QR-Code URLs: /s/:code
   Leitet zum richtigen Flow weiter
   ============================================================ */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export default function QRRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!code) {
      setError("Kein Code angegeben");
      setChecking(false);
      return;
    }

    // Wenn nicht eingeloggt → Login mit Redirect
    if (!token || !user) {
      // Code in localStorage speichern für nach dem Login
      localStorage.setItem("trapmap_pending_qr", code);
      navigate("/login");
      return;
    }

    checkCode();
  }, [code, token, user]);

  const checkCode = async () => {
    try {
      const res = await axios.get(`${API}/qr/check/${code}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Code nicht gefunden
      if (!res.data || !res.data.box_id) {
        setError("QR-Code nicht gefunden oder nicht für Ihre Organisation");
        setChecking(false);
        return;
      }

      const boxData = res.data.boxes;
      const boxId = res.data.box_id;
      const objectId = boxData?.object_id;
      const hasPosition = boxData?.lat && boxData?.lng;
      const positionType = boxData?.position_type;

      // Fall 1: Box im Pool (nicht zugewiesen)
      if (!objectId) {
        navigate(`/qr/assign-object/${code}?box_id=${boxId}`, { replace: true });
        return;
      }

      // Fall 2: Zugewiesen aber nicht platziert
      if (!hasPosition || positionType === 'none') {
        navigate(`/maps?object_id=${objectId}&openBox=${boxId}&firstSetup=true&flyTo=true`, { replace: true });
        return;
      }

      // Fall 3: Platziert → Kontrolle-Dialog
      navigate(`/maps?object_id=${objectId}&openBox=${boxId}&flyTo=true`, { replace: true });

    } catch (err) {
      console.error("QR check error:", err);
      
      if (err.response?.status === 404) {
        setError("QR-Code nicht gefunden");
      } else if (err.response?.status === 403) {
        setError("Keine Berechtigung für diesen QR-Code");
      } else {
        setError("Fehler beim Prüfen des QR-Codes");
      }
      setChecking(false);
    }
  };

  // Loading
  if (checking) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">QR-Code wird geprüft...</h2>
          <p className="text-gray-400">{code}</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Fehler</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <p className="text-sm text-gray-500 mb-6">Code: {code}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors"
          >
            Zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
}