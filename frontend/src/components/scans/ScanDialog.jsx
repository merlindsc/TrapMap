/* ============================================================
   TRAPMAP — SCAN DIALOG (ERSATZ)
   mit automatischer Statuslogik + BoxTyp-Feldern
   OFFLINE-FÄHIG: Speichert lokal wenn keine Verbindung
   ============================================================ */

import React, { useState, useEffect } from "react";
import { createScanOffline } from "../../utils/offlineAPI";
import { useOffline } from "../../context/OfflineContext";
import { WifiOff, Check, AlertCircle } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

function autoStatus(boxType, consumption, quantity, trapState) {
  // Schlagfalle
  if (boxType === "schlagfalle") {
    if (trapState === 0) return "green";   // nicht ausgelöst
    if (trapState === 1) return "yellow";  // ausgelöst
    if (trapState === 2) return "red";     // Tier drin
  }

  // Köder / Monitoring
  if (boxType === "monitoring_rodent" || boxType === "giftbox") {
    switch (consumption) {
      case 0: return "green"; 
      case 1: return "yellow";  // 20%
      case 2: return "orange";  // 40%
      case 3: return "red";     // 60%
      case 4: return "red";     // 80–100%
      default: return "green";
    }
  }

  // Insekten
  if (boxType === "monitoring_insect") {
    if (quantity === "none") return "green";
    if (quantity === "0-5") return "yellow";
    if (quantity === "5-10") return "orange";
    return "red"; // 10–20, 20+
  }

  return "green";
}

export default function ScanDialog({ isOpen, onClose, box, reload }) {
  if (!isOpen) return null;

  const { isOnline, updatePendingCount } = useOffline();
  const token = localStorage.getItem("trapmap_token");

  // Felder
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("green");
  const [consumption, setConsumption] = useState(0);
  const [trapState, setTrapState] = useState(0);
  const [quantity, setQuantity] = useState("none");
  const [photo, setPhoto] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // Box-Typ bestimmen
  const typeName = (box?.box_type_name || "").toLowerCase();
  let boxType = "default";

  if (typeName.includes("schlag") || typeName.includes("trap"))
    boxType = "schlagfalle";
  else if (typeName.includes("gift") || typeName.includes("bait"))
    boxType = "giftbox";
  else if (typeName.includes("rodent") || typeName.includes("nager"))
    boxType = "monitoring_rodent";
  else if (typeName.includes("insekt") || typeName.includes("insect"))
    boxType = "monitoring_insect";

  // Status automatisch aktualisieren
  useEffect(() => {
    const auto = autoStatus(boxType, consumption, quantity, trapState);
    setStatus(auto);
  }, [consumption, quantity, trapState, boxType]);

  async function submitScan(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      // Scan-Daten vorbereiten
      const scanData = {
        box_id: box.id,
        status,
        notes,
        trap_state: boxType === "schlagfalle" ? trapState : undefined,
        consumption: (boxType === "monitoring_rodent" || boxType === "giftbox") ? consumption : undefined,
        quantity: boxType === "monitoring_insect" ? quantity : undefined
      };

      // Offline-fähige API verwenden
      const result = await createScanOffline(scanData, photo);

      if (result.success) {
        if (result.online) {
          setSubmitResult({ type: 'success', message: 'Kontrolle gespeichert!' });
        } else {
          setSubmitResult({ 
            type: 'offline', 
            message: 'Kontrolle offline gespeichert. Wird bei Verbindung synchronisiert.' 
          });
          updatePendingCount();
        }

        // Nach kurzer Verzögerung schließen
        setTimeout(() => {
          reload();
          onClose();
        }, 1500);
      } else {
        setSubmitResult({ type: 'error', message: result.message || 'Fehler beim Speichern' });
      }
    } catch (error) {
      console.error('Scan-Fehler:', error);
      setSubmitResult({ type: 'error', message: 'Fehler beim Speichern der Kontrolle' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="scan-dialog-overlay" onClick={onClose}>
      <div className="scan-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>✓ Kontrolle: {box.box_name}</h2>

        {/* Offline-Hinweis */}
        {!isOnline && (
          <div className="offline-notice">
            <WifiOff size={16} />
            <span>Offline-Modus: Kontrolle wird lokal gespeichert</span>
          </div>
        )}

        {/* Ergebnis-Anzeige */}
        {submitResult && (
          <div className={`submit-result ${submitResult.type}`}>
            {submitResult.type === 'success' && <Check size={16} />}
            {submitResult.type === 'offline' && <WifiOff size={16} />}
            {submitResult.type === 'error' && <AlertCircle size={16} />}
            <span>{submitResult.message}</span>
          </div>
        )}

        <form onSubmit={submitScan}>
          {/* SCHLAGFALLE */}
          {boxType === "schlagfalle" && (
            <>
              <label>Zustand der Falle</label>
              <select
                value={trapState}
                onChange={(e) => setTrapState(Number(e.target.value))}
              >
                <option value={0}>Nicht ausgelöst</option>
                <option value={1}>Ausgelöst</option>
                <option value={2}>Tier gefunden</option>
              </select>
            </>
          )}

          {/* KÖDER / GIFT */}
          {(boxType === "giftbox" || boxType === "monitoring_rodent") && (
            <>
              <label>Köderverbrauch</label>
              <div className="consumption-buttons">
                {[0, 1, 2, 3, 4].map((num) => (
                  <button
                    type="button"
                    key={num}
                    className={consumption === num ? "active" : ""}
                    onClick={() => setConsumption(num)}
                  >
                    {num * 20}%
                  </button>
                ))}
              </div>
            </>
          )}

          {/* INSEKTEN */}
          {boxType === "monitoring_insect" && (
            <>
              <label>Insektenmenge</label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              >
                <option value="none">Keine</option>
                <option value="0-5">0–5</option>
                <option value="5-10">5–10</option>
                <option value="10-20">10–20</option>
                <option value="20+">20+</option>
              </select>
            </>
          )}

          <label>Notizen</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
          />

          <label>Foto (optional)</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setPhoto(e.target.files[0])}
            disabled={isSubmitting}
          />

          <button 
            type="submit" 
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Speichern...' : 'Speichern'}
          </button>
        </form>

        <button className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
          Abbrechen
        </button>
      </div>

      <style>{`
        .offline-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #ef4444;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .submit-result {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 14px;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 16px;
        }

        .submit-result.success {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }

        .submit-result.offline {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #3b82f6;
        }

        .submit-result.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}