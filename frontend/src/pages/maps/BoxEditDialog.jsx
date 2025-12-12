/* ============================================================
   TRAPMAP - BOX EDIT DIALOG
   Bearbeiten einer Box - Alle Einstellungen
   ============================================================ */

import { useState, useEffect } from "react";
import { X, Save, CheckCircle, MapPin, Navigation } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function BoxEditDialog({
  box,
  boxTypes = [],
  onClose,
  onSave,
  onAdjustPosition,  // Position auf Karte anpassen
  onSetGPS,          // GPS-Position setzen
  isFirstSetup = false
}) {
  const token = localStorage.getItem("trapmap_token");

  const [boxTypeId, setBoxTypeId] = useState(box?.box_type_id || "");
  const [bait, setBait] = useState(box?.bait || "");
  const [customBait, setCustomBait] = useState("");
  const [notes, setNotes] = useState(box?.notes || "");
  const [controlInterval, setControlInterval] = useState(box?.control_interval_days || 30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const COMMON_BAITS = [
    "Brodifacoum Block",
    "Bromadiolon Paste",
    "Difenacoum Block",
    "Difethialon Block",
    "Flocoumafen Paste",
    "Chlorophacinon Getreide",
    "Coumatetralyl Block",
    "Brodifacoum Paste",
    "Bromadiolon Block",
    "Difenacoum Paste"
  ];

  useEffect(() => {
    if (box?.box_type_id) setBoxTypeId(box.box_type_id);
    if (box?.notes) setNotes(box.notes);
    if (box?.control_interval_days) setControlInterval(box.control_interval_days);
    if (box?.bait) {
      if (COMMON_BAITS.includes(box.bait)) {
        setBait(box.bait);
      } else {
        setBait("custom");
        setCustomBait(box.bait);
      }
    }
  }, [box]);

  const selectedType = boxTypes.find(t => t.id === parseInt(boxTypeId));
  const isRodentStation = selectedType?.name?.toLowerCase().includes("köder") || 
                          selectedType?.name?.toLowerCase().includes("rodent") ||
                          selectedType?.name?.toLowerCase().includes("ratte") ||
                          selectedType?.name?.toLowerCase().includes("maus");

  const handleSave = async () => {
    if (!boxTypeId) {
      setError("Bitte Box-Typ auswählen");
      return;
    }

    setSaving(true);
    setError(null);
    const finalBait = bait === "custom" ? customBait : bait;

    try {
      const updateData = { 
        box_type_id: parseInt(boxTypeId), 
        notes: notes,
        control_interval_days: parseInt(controlInterval)
      };
      if (isRodentStation && finalBait) updateData.bait = finalBait;

      const updateRes = await fetch(`${API}/boxes/${box.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updateData)
      });

      if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(err.error || "Fehler beim Speichern");
      }

      // Bei Ersteinrichtung: Scan erstellen
      if (isFirstSetup) {
        const scanData = {
          box_id: box.id,
          object_id: box.object_id || box.objects?.id,
          status: "green",
          activity: "keine",
          quantity: "0",
          notes: "Ersteinrichtung" + (finalBait ? ` | Köder: ${finalBait}` : ""),
          scan_type: "setup"
        };
        await fetch(`${API}/scans`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(scanData)
        });
      }

      onSave && onSave();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getBoxNumber = () => {
    if (box?.qr_code) {
      const match = box.qr_code.match(/(\d+)$/);
      if (match) return parseInt(match[1], 10).toString();
    }
    return box?.id || "?";
  };

  return (
    <div 
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0d1117",
          borderRadius: 8,
          width: "92%",
          maxWidth: 380,
          maxHeight: "90vh",
          color: "#fff",
          border: "1px solid #21262d",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "10px 14px",
          borderBottom: "1px solid #21262d",
          background: "#161b22"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              background: isFirstSetup ? "#238636" : "#1f6feb",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 13
            }}>
              {getBoxNumber()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {isFirstSetup ? "Ersteinrichtung" : "Box bearbeiten"}
              </div>
              <div style={{ fontSize: 11, color: "#8b949e" }}>{box?.qr_code}</div>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer", padding: 4, display: "flex" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body - scrollbar */}
        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
          
          {isFirstSetup && (
            <div style={{
              background: "rgba(35, 134, 54, 0.15)",
              border: "1px solid rgba(35, 134, 54, 0.3)",
              borderRadius: 6,
              padding: "10px 12px",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#3fb950",
              fontSize: 12
            }}>
              <CheckCircle size={16} />
              Ersteinrichtungs-Scan wird automatisch erstellt
            </div>
          )}

          {error && (
            <div style={{
              background: "rgba(248, 81, 73, 0.15)",
              border: "1px solid rgba(248, 81, 73, 0.3)",
              borderRadius: 6,
              padding: "10px 12px",
              marginBottom: 14,
              color: "#f85149",
              fontSize: 12
            }}>
              {error}
            </div>
          )}

          {/* Box-Typ */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 500, color: "#8b949e" }}>
              Box-Typ *
            </label>
            <select
              value={boxTypeId}
              onChange={(e) => setBoxTypeId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#161b22",
                border: "1px solid #30363d",
                borderRadius: 6,
                color: "#e6edf3",
                fontSize: 13
              }}
            >
              <option value="">Bitte auswählen...</option>
              {boxTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          {/* Köder */}
          {isRodentStation && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 500, color: "#8b949e" }}>
                Rodentizid / Köder
              </label>
              <select
                value={bait}
                onChange={(e) => {
                  setBait(e.target.value);
                  if (e.target.value !== "custom") setCustomBait("");
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "#161b22",
                  border: "1px solid #30363d",
                  borderRadius: 6,
                  color: "#e6edf3",
                  fontSize: 13
                }}
              >
                <option value="">Kein Köder / Leer</option>
                {COMMON_BAITS.map(b => <option key={b} value={b}>{b}</option>)}
                <option value="custom">Anderer...</option>
              </select>
              {bait === "custom" && (
                <input
                  type="text"
                  value={customBait}
                  onChange={(e) => setCustomBait(e.target.value)}
                  placeholder="Köder eingeben..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#161b22",
                    border: "1px solid #30363d",
                    borderRadius: 6,
                    color: "#e6edf3",
                    fontSize: 13,
                    marginTop: 8,
                    boxSizing: "border-box"
                  }}
                />
              )}
            </div>
          )}

          {/* Kontrollintervall */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 500, color: "#8b949e" }}>
              Kontrollintervall (Tage)
            </label>
            <select
              value={controlInterval}
              onChange={(e) => setControlInterval(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#161b22",
                border: "1px solid #30363d",
                borderRadius: 6,
                color: "#e6edf3",
                fontSize: 13
              }}
            >
              <option value="7">7 Tage (wöchentlich)</option>
              <option value="14">14 Tage</option>
              <option value="21">21 Tage</option>
              <option value="30">30 Tage (monatlich)</option>
              <option value="60">60 Tage</option>
              <option value="90">90 Tage (quartalsweise)</option>
            </select>
          </div>

          {/* Notizen */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 500, color: "#8b949e" }}>
              Notizen
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Hinweise zur Box, Standort-Details..."
              rows={2}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#161b22",
                border: "1px solid #30363d",
                borderRadius: 6,
                color: "#e6edf3",
                fontSize: 13,
                resize: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Position Buttons - nur wenn nicht Ersteinrichtung */}
          {!isFirstSetup && (
            <div style={{ 
              display: "flex", 
              gap: 8, 
              marginBottom: 14,
              paddingTop: 10,
              borderTop: "1px solid #21262d"
            }}>
              <button
                onClick={() => { onAdjustPosition && onAdjustPosition(); }}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#1f6feb20",
                  border: "1px solid #1f6feb",
                  borderRadius: 6,
                  color: "#58a6ff",
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
              >
                <MapPin size={14} /> Position verschieben
              </button>
              <button
                onClick={() => { 
                  // Prüfen ob Mobile
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  if (!isMobile) {
                    alert("⚠️ GPS setzen funktioniert nur auf Mobilgeräten!\n\nAm PC bitte 'Position verschieben' nutzen und auf die Karte klicken.");
                    return;
                  }
                  onSetGPS && onSetGPS(); 
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#161b22",
                  border: "1px solid #30363d",
                  borderRadius: 6,
                  color: "#8b949e",
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
              >
                <Navigation size={14} /> GPS (Mobil)
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          display: "flex", 
          gap: 8, 
          padding: "12px 14px",
          borderTop: "1px solid #21262d",
          background: "#161b22"
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              background: "#21262d",
              border: "none",
              borderRadius: 6,
              color: "#e6edf3",
              cursor: "pointer",
              fontSize: 13
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !boxTypeId}
            style={{
              flex: 1,
              padding: "10px",
              background: saving || !boxTypeId ? "#21262d" : "#238636",
              border: "none",
              borderRadius: 6,
              color: "#fff",
              cursor: saving || !boxTypeId ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6
            }}
          >
            <Save size={14} />
            {saving ? "..." : isFirstSetup ? "Einrichten" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}