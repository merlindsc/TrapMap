/* ============================================================
   TRAPMAP - BOX SCAN DIALOG  
   Kontrolle + Verlauf + Position-Optionen
   
   WICHTIG: GPS-Buttons nur wenn onAdjustPosition/onSetGPS übergeben!
   Für Lageplan-Boxen diese Props NICHT übergeben!
   ============================================================ */

import { useState, useEffect } from "react";
import { X, Save, Camera, Clock, CheckCircle, AlertCircle, Edit3, MapPin, Navigation } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

const STATUS = {
  green: { label: "OK", color: "#238636" },
  yellow: { label: "Leicht", color: "#9e6a03" },
  orange: { label: "Mittel", color: "#bd561d" },
  red: { label: "Stark", color: "#da3633" }
};

// Helper: QR-Nummer extrahieren (ohne führende Null)
const getShortQr = (box) => {
  if (box?.qr_code) {
    const match = box.qr_code.match(/(\d+)/);
    if (match) return parseInt(match[1], 10).toString();
  }
  return null;
};

export default function BoxScanDialog({ 
  box, 
  onClose, 
  onSave, 
  onEdit,
  onAdjustPosition,  // Position auf Karte/Plan anpassen - OPTIONAL
  onSetGPS           // GPS-Position setzen - OPTIONAL (NUR für GPS-Boxen!)
}) {
  const token = localStorage.getItem("trapmap_token");
  
  const [tab, setTab] = useState("scan");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Form
  const [consumption, setConsumption] = useState("0");
  const [status, setStatus] = useState("green");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  // History
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  // Box-Nummer aus QR-Code (ohne führende Null)
  const shortQr = getShortQr(box);
  const boxNum = shortQr || box?.id || "?";

  const typeName = box?.box_types?.name || box?.box_type_name || "Unbekannt";
  
  // Ist das eine Lageplan-Box?
  const isFloorplanBox = box?.position_type === 'floorplan' || box?.floor_plan_id;

  // Status auto
  useEffect(() => {
    const c = parseInt(consumption);
    if (c === 0) setStatus("green");
    else if (c <= 25) setStatus("yellow");
    else if (c <= 75) setStatus("orange");
    else setStatus("red");
  }, [consumption]);

  // History laden beim ersten Öffnen
  useEffect(() => {
    loadHistory();
  }, [box?.id]);

  const loadHistory = async () => {
    if (!box?.id) return;
    setHistLoading(true);
    try {
      const r = await fetch(`${API}/scans?box_id=${box.id}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) {
        const d = await r.json();
        setHistory(Array.isArray(d) ? d : d.data || []);
      }
    } catch (e) {
      console.error(e);
    }
    setHistLoading(false);
  };

  const handlePhoto = (e) => {
    const f = e.target.files[0];
    if (f) {
      setPhoto(f);
      setPhotoPreview(URL.createObjectURL(f));
    }
  };

  const submit = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("box_id", box.id);
      fd.append("object_id", box.object_id || box.objects?.id || "");
      fd.append("status", status);
      fd.append("consumption", consumption);
      fd.append("notes", notes);
      if (photo) fd.append("photo", photo);

      const r = await fetch(`${API}/scans`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });

      if (r.ok) {
        setToast({ type: "success", msg: "Kontrolle gespeichert!" });
        setTimeout(() => { onSave && onSave(); }, 800);
      } else {
        throw new Error("Fehler beim Speichern");
      }
    } catch (e) {
      setToast({ type: "error", msg: e.message });
    }
    setLoading(false);
  };

  // User-Name aus History-Eintrag extrahieren
  const getUserName = (scan) => {
    if (scan.users) {
      const u = scan.users;
      if (u.first_name || u.last_name) {
        return `${u.first_name || ''} ${u.last_name || ''}`.trim();
      }
      if (u.email) return u.email.split('@')[0];
    }
    return scan.user_name || scan.technician_name || "Unbekannt";
  };

  // Position-Buttons nur anzeigen wenn Props übergeben wurden
  const showPositionButtons = onAdjustPosition || onSetGPS;

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          padding: "8px 16px", borderRadius: 6, zIndex: 10001,
          background: toast.type === "success" ? "#238636" : "#da3633",
          color: "#fff", fontSize: 13, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 6
        }}>
          {toast.type === "success" ? <CheckCircle size={14}/> : <AlertCircle size={14}/>}
          {toast.msg}
        </div>
      )}

      {/* Overlay */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
        zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: "#0d1117", borderRadius: 8, width: "92%", maxWidth: 380,
          border: "1px solid #21262d", overflow: "hidden", maxHeight: "90vh",
          display: "flex", flexDirection: "column"
        }}>
          
          {/* Header */}
          <div style={{
            padding: "10px 14px", background: "#161b22",
            borderBottom: "1px solid #21262d",
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 6,
                background: STATUS[box?.current_status]?.color || "#1f6feb",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 12, color: "#fff"
              }}>
                {boxNum}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3", display: "flex", alignItems: "center", gap: 8 }}>
                  Kontrolle
                  <button
                    onClick={() => onEdit && onEdit()}
                    style={{
                      padding: "4px 10px", 
                      background: "#1f6feb", 
                      border: "none",
                      borderRadius: 4, 
                      color: "#fff", 
                      fontSize: 11, 
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex", 
                      alignItems: "center", 
                      gap: 4
                    }}
                  >
                    <Edit3 size={11}/> Bearbeiten
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "#8b949e" }}>
                  {typeName}
                  {box?.bait && <span style={{ color: "#58a6ff" }}> • {box.bait}</span>}
                  {isFloorplanBox && <span style={{ color: "#8b5cf6" }}> • Lageplan</span>}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: "none", border: "none", color: "#8b949e", cursor: "pointer", padding: 4
            }}>
              <X size={18}/>
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", background: "#161b22", borderBottom: "1px solid #21262d" }}>
            <button onClick={() => setTab("scan")} style={{
              flex: 1, padding: "10px", background: "none", border: "none",
              color: tab === "scan" ? "#58a6ff" : "#8b949e",
              borderBottom: tab === "scan" ? "2px solid #58a6ff" : "2px solid transparent",
              fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
            }}>
              <CheckCircle size={13}/> Neue Kontrolle
            </button>
            <button onClick={() => setTab("history")} style={{
              flex: 1, padding: "10px", background: "none", border: "none",
              color: tab === "history" ? "#58a6ff" : "#8b949e",
              borderBottom: tab === "history" ? "2px solid #58a6ff" : "2px solid transparent",
              fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
            }}>
              <Clock size={13}/> Verlauf ({history.length})
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
            {tab === "scan" ? (
              <>
                {/* Verbrauch */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 500, color: "#8b949e" }}>
                    Köderverbrauch *
                  </label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["0", "25", "50", "75", "100"].map(v => (
                      <button key={v} onClick={() => setConsumption(v)} style={{
                        flex: 1, padding: "10px 0",
                        background: consumption === v ? "#21262d" : "transparent",
                        border: consumption === v ? "2px solid #58a6ff" : "1px solid #30363d",
                        borderRadius: 6, color: consumption === v ? "#e6edf3" : "#8b949e",
                        fontSize: 12, fontWeight: consumption === v ? 600 : 400, cursor: "pointer"
                      }}>
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div style={{
                  background: STATUS[status].color, borderRadius: 6,
                  padding: "10px 12px", marginBottom: 14,
                  display: "flex", alignItems: "center", gap: 8,
                  color: "#fff", fontSize: 12, fontWeight: 500
                }}>
                  <div style={{ width: 8, height: 8, background: "#fff", borderRadius: "50%" }}/>
                  Status: {STATUS[status].label}
                </div>

                {/* Notizen */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 500, color: "#8b949e" }}>
                    Notizen
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Bemerkungen zur Kontrolle..."
                    rows={2}
                    style={{
                      width: "100%", padding: "10px", background: "#161b22",
                      border: "1px solid #30363d", borderRadius: 6, color: "#e6edf3",
                      fontSize: 12, resize: "none", boxSizing: "border-box"
                    }}
                  />
                </div>

                {/* Foto */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 500, color: "#8b949e" }}>
                    Foto (optional)
                  </label>
                  {photoPreview ? (
                    <div style={{ position: "relative" }}>
                      <img src={photoPreview} alt="" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 6 }}/>
                      <button onClick={() => { setPhoto(null); setPhotoPreview(null); }} style={{
                        position: "absolute", top: 4, right: 4, background: "#da3633",
                        border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        <X size={12} color="#fff"/>
                      </button>
                    </div>
                  ) : (
                    <label style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "12px", border: "1px dashed #30363d", borderRadius: 6,
                      background: "#161b22", color: "#8b949e", fontSize: 12, cursor: "pointer"
                    }}>
                      <Camera size={16}/> Foto aufnehmen
                      <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: "none" }}/>
                    </label>
                  )}
                </div>

                {/* Position Buttons - NUR wenn Props übergeben wurden! */}
                {showPositionButtons && (
                  <div style={{ 
                    display: "flex", 
                    gap: 8,
                    paddingTop: 10,
                    borderTop: "1px solid #21262d"
                  }}>
                    {/* Position verschieben - nur wenn onAdjustPosition übergeben */}
                    {onAdjustPosition && (
                      <button
                        onClick={() => { onAdjustPosition(box); }}
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: "#1f6feb20",
                          border: "1px solid #1f6feb",
                          borderRadius: 6,
                          color: "#58a6ff",
                          fontSize: 11,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6
                        }}
                      >
                        <MapPin size={14} /> 
                        {isFloorplanBox ? "Position auf Plan" : "Position verschieben"}
                      </button>
                    )}
                    
                    {/* GPS setzen - NUR wenn onSetGPS übergeben UND KEINE Lageplan-Box! */}
                    {onSetGPS && !isFloorplanBox && (
                      <button
                        onClick={() => { 
                          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                          if (!isMobile) {
                            alert("⚠️ GPS setzen funktioniert nur auf Mobilgeräten!\n\nAm PC bitte 'Position verschieben' nutzen und auf die Karte klicken.");
                            return;
                          }
                          onSetGPS(box); 
                        }}
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: "#161b22",
                          border: "1px solid #30363d",
                          borderRadius: 6,
                          color: "#8b949e",
                          fontSize: 11,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6
                        }}
                      >
                        <Navigation size={14} /> GPS (Mobil)
                      </button>
                    )}
                  </div>
                )}

                {/* Warnung für Lageplan-Boxen */}
                {isFloorplanBox && (
                  <div style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    background: "#8b5cf620",
                    border: "1px solid #8b5cf650",
                    borderRadius: 6,
                    color: "#a78bfa",
                    fontSize: 11
                  }}>
                    📍 Diese Box ist auf einem Lageplan platziert. Position nur über den Lageplan-Editor ändern.
                  </div>
                )}
              </>
            ) : (
              /* History */
              histLoading ? (
                <div style={{ textAlign: "center", color: "#8b949e", padding: 24, fontSize: 12 }}>Lade...</div>
              ) : history.length === 0 ? (
                <div style={{ textAlign: "center", color: "#8b949e", padding: 24, fontSize: 12 }}>Keine Kontrollen</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {history.map((s, i) => (
                    <div key={s.id || i} style={{
                      padding: "12px", background: "#161b22", borderRadius: 6, border: "1px solid #21262d"
                    }}>
                      {/* Kopfzeile: Status + Datum */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS[s.status]?.color || "#8b949e" }}/>
                        <div style={{ flex: 1, fontSize: 12, color: "#e6edf3", fontWeight: 500 }}>
                          {new Date(s.scanned_at || s.created_at).toLocaleDateString("de-DE", {
                            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </div>
                        {s.consumption !== undefined && s.consumption !== null && (
                          <div style={{ fontSize: 11, color: "#8b949e", background: "#21262d", padding: "2px 8px", borderRadius: 4 }}>
                            {s.consumption}%
                          </div>
                        )}
                      </div>
                      
                      {/* Details */}
                      <div style={{ fontSize: 11, color: "#8b949e", display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <span style={{ color: "#6e7681" }}>Kontrolleur:</span>
                          <span style={{ color: "#e6edf3" }}>{getUserName(s)}</span>
                        </div>
                        
                        {(s.bait || s.notes?.includes("Köder:")) && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <span style={{ color: "#6e7681" }}>Köder:</span>
                            <span style={{ color: "#e6edf3" }}>
                              {s.bait || s.notes?.match(/Köder:\s*([^|]+)/)?.[1]?.trim() || "-"}
                            </span>
                          </div>
                        )}
                        
                        {s.notes && !s.notes.startsWith("Ersteinrichtung") && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <span style={{ color: "#6e7681" }}>Notiz:</span>
                            <span style={{ color: "#e6edf3" }}>{s.notes}</span>
                          </div>
                        )}
                        
                        {s.scan_type === "setup" && (
                          <div style={{ 
                            marginTop: 4, 
                            fontSize: 10, 
                            color: "#3fb950", 
                            background: "rgba(35,134,54,0.15)", 
                            padding: "2px 6px", 
                            borderRadius: 3,
                            display: "inline-block",
                            width: "fit-content"
                          }}>
                            Ersteinrichtung
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Footer */}
          {tab === "scan" && (
            <div style={{ padding: "12px 14px", background: "#161b22", borderTop: "1px solid #21262d" }}>
              <button onClick={submit} disabled={loading} style={{
                width: "100%", padding: "11px", borderRadius: 6, border: "none",
                background: loading ? "#21262d" : "#238636", color: "#fff",
                fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6
              }}>
                <Save size={14}/> {loading ? "..." : "Kontrolle speichern"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}