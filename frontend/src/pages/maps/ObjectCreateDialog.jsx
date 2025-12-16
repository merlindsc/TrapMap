/* ============================================================
   TRAPMAP – OBJECT CREATE DIALOG V2
   Neues Objekt auf Karte erstellen
   + Direkt Boxen aus Pool zuweisen
   
   FEATURES:
   - Objekt erstellen mit Position
   - Boxen aus Pool auswählen (sortiert nach QR, klein→groß)
   - QR-Nummern ohne führende Nullen
   ============================================================ */

import { useState, useEffect, useMemo } from "react";
import { X, Save, MapPin, Building2, Package, Check, ChevronDown, ChevronUp, Plus, Minus } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

// QR-Nummer extrahieren (DSE-0096 → 96)
function extractQrNumber(qrCode) {
  if (!qrCode) return 999999;
  const match = qrCode.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 999999;
}

// QR-Nummer formatiert (ohne führende Nullen)
function formatQrNumber(qrCode) {
  if (!qrCode) return null;
  const match = qrCode.match(/(\d+)/);
  return match ? parseInt(match[1], 10).toString() : qrCode;
}

export default function ObjectCreateDialog({ latLng, onClose, onSave }) {
  const token = localStorage.getItem("trapmap_token");

  // Object Form
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Box Assignment
  const [showBoxSelector, setShowBoxSelector] = useState(false);
  const [poolBoxes, setPoolBoxes] = useState([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [selectedBoxIds, setSelectedBoxIds] = useState(new Set());
  const [boxCount, setBoxCount] = useState(0); // Schnellauswahl: Anzahl Boxen

  // Load pool boxes
  useEffect(() => {
    loadPoolBoxes();
  }, []);

  const loadPoolBoxes = async () => {
    setPoolLoading(true);
    try {
      const res = await fetch(`${API}/boxes/pool`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Sortieren nach QR-Nummer (klein → groß)
        const sorted = (Array.isArray(data) ? data : []).sort((a, b) => 
          extractQrNumber(a.qr_code) - extractQrNumber(b.qr_code)
        );
        setPoolBoxes(sorted);
      }
    } catch (e) {
      console.error("Error loading pool:", e);
    }
    setPoolLoading(false);
  };

  // Sortierte Pool-Boxen für Anzeige
  const sortedPoolBoxes = useMemo(() => {
    return [...poolBoxes].sort((a, b) => 
      extractQrNumber(a.qr_code) - extractQrNumber(b.qr_code)
    );
  }, [poolBoxes]);

  // Schnellauswahl: Erste N Boxen auswählen
  const selectFirstNBoxes = (n) => {
    const ids = sortedPoolBoxes.slice(0, n).map(b => b.id);
    setSelectedBoxIds(new Set(ids));
    setBoxCount(n);
  };

  // Box-Auswahl toggeln
  const toggleBoxSelection = (boxId) => {
    const newSet = new Set(selectedBoxIds);
    if (newSet.has(boxId)) {
      newSet.delete(boxId);
    } else {
      newSet.add(boxId);
    }
    setSelectedBoxIds(newSet);
    setBoxCount(newSet.size);
  };

  // Alle/Keine auswählen
  const selectAll = () => {
    setSelectedBoxIds(new Set(poolBoxes.map(b => b.id)));
    setBoxCount(poolBoxes.length);
  };

  const selectNone = () => {
    setSelectedBoxIds(new Set());
    setBoxCount(0);
  };

  // Schnellauswahl +/- Buttons
  const incrementBoxCount = () => {
    const newCount = Math.min(boxCount + 1, poolBoxes.length);
    selectFirstNBoxes(newCount);
  };

  const decrementBoxCount = () => {
    const newCount = Math.max(boxCount - 1, 0);
    selectFirstNBoxes(newCount);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Bitte Objektname eingeben!");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Objekt erstellen
      const objectData = {
        name,
        address,
        zip,
        city,
        contact_person: contactPerson,
        phone,
        notes,
        lat: latLng.lat,
        lng: latLng.lng,
      };

      const res = await fetch(`${API}/objects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(objectData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Fehler beim Erstellen");
      }

      const newObject = await res.json();
      console.log("✅ Objekt erstellt:", newObject.id);

      // 2. Boxen zuweisen (falls ausgewählt)
      if (selectedBoxIds.size > 0) {
        const boxRes = await fetch(`${API}/boxes/bulk-assign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            box_ids: Array.from(selectedBoxIds),
            object_id: newObject.id
          }),
        });

        if (boxRes.ok) {
          const boxData = await boxRes.json();
          console.log(`✅ ${boxData.count} Boxen zugewiesen`);
        } else {
          console.error("⚠️ Boxen konnten nicht zugewiesen werden");
        }
      }

      onSave(newObject);
    } catch (e) {
      console.error("Error creating object:", e);
      setError(e.message || "Fehler beim Erstellen");
    } finally {
      setSaving(false);
    }
  };

  // Styles
  const styles = {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.8)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: 20,
    },
    dialog: {
      background: "#111827",
      borderRadius: 16,
      width: "100%",
      maxWidth: 520,
      maxHeight: "90vh",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 20px",
      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      background: "#0d1117",
    },
    headerTitle: {
      display: "flex",
      alignItems: "center",
      gap: 12,
    },
    headerIcon: {
      width: 40,
      height: 40,
      background: "rgba(99, 102, 241, 0.2)",
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#818cf8",
    },
    title: {
      color: "#fff",
      fontSize: 18,
      fontWeight: 600,
      margin: 0,
    },
    subtitle: {
      color: "#6b7280",
      fontSize: 13,
      margin: 0,
    },
    closeBtn: {
      background: "transparent",
      border: "none",
      color: "#6b7280",
      cursor: "pointer",
      padding: 4,
      display: "flex",
      transition: "color 0.2s",
    },
    body: {
      flex: 1,
      overflowY: "auto",
      padding: 20,
    },
    fieldGroup: {
      marginBottom: 16,
    },
    label: {
      display: "block",
      color: "#9ca3af",
      fontSize: 13,
      fontWeight: 500,
      marginBottom: 6,
    },
    input: {
      width: "100%",
      padding: "12px 14px",
      background: "#0d1117",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: 10,
      color: "#fff",
      fontSize: 14,
      outline: "none",
      transition: "border-color 0.2s",
      boxSizing: "border-box",
    },
    textarea: {
      width: "100%",
      padding: "12px 14px",
      background: "#0d1117",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: 10,
      color: "#fff",
      fontSize: 14,
      outline: "none",
      resize: "vertical",
      minHeight: 80,
      boxSizing: "border-box",
    },
    row: {
      display: "grid",
      gridTemplateColumns: "1fr 2fr",
      gap: 12,
    },
    positionBox: {
      padding: 14,
      background: "#0d1117",
      borderRadius: 10,
      border: "1px solid rgba(99, 102, 241, 0.3)",
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginTop: 8,
    },
    positionIcon: {
      color: "#6366f1",
    },
    positionText: {
      color: "#9ca3af",
      fontSize: 13,
      fontFamily: "monospace",
    },
    errorBox: {
      padding: 12,
      background: "rgba(239, 68, 68, 0.15)",
      border: "1px solid rgba(239, 68, 68, 0.3)",
      borderRadius: 8,
      color: "#f87171",
      fontSize: 13,
      marginBottom: 16,
    },
    footer: {
      display: "flex",
      gap: 12,
      padding: "16px 20px",
      borderTop: "1px solid rgba(255, 255, 255, 0.1)",
      background: "#0d1117",
    },
    btnSecondary: {
      flex: 1,
      padding: "12px 20px",
      background: "rgba(255, 255, 255, 0.05)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: 10,
      color: "#9ca3af",
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      transition: "all 0.2s",
    },
    btnPrimary: {
      flex: 1,
      padding: "12px 20px",
      background: "#10b981",
      border: "none",
      borderRadius: 10,
      color: "#fff",
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      transition: "all 0.2s",
    },
    btnDisabled: {
      background: "#374151",
      color: "#6b7280",
      cursor: "not-allowed",
    },
  };

  return (
    <div
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <div style={styles.headerIcon}>
              <Building2 size={20} />
            </div>
            <div>
              <h2 style={styles.title}>Neues Objekt erstellen</h2>
              <p style={styles.subtitle}>Position auf Karte gewählt</p>
            </div>
          </div>
          <button
            style={styles.closeBtn}
            onClick={onClose}
            onMouseEnter={(e) => (e.target.style.color = "#fff")}
            onMouseLeave={(e) => (e.target.style.color = "#6b7280")}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Error */}
          {error && <div style={styles.errorBox}>{error}</div>}

          {/* Objektname */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Objektname *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Bäckerei Müller"
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.1)")}
              autoFocus
            />
          </div>

          {/* Adresse */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Adresse</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Straße & Hausnummer"
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.1)")}
            />
          </div>

          {/* PLZ + Stadt */}
          <div style={{ ...styles.fieldGroup, ...styles.row }}>
            <div>
              <label style={styles.label}>PLZ</label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="12345"
                style={styles.input}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.1)")}
              />
            </div>
            <div>
              <label style={styles.label}>Stadt</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="z.B. Berlin"
                style={styles.input}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.1)")}
              />
            </div>
          </div>

          {/* Kontaktperson */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Kontaktperson</label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Name des Ansprechpartners"
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.1)")}
            />
          </div>

          {/* Telefon */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Telefon</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+49 123 456789"
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.1)")}
            />
          </div>

          {/* Notizen */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Notizen</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zusätzliche Informationen..."
              style={styles.textarea}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.1)")}
            />
          </div>

          {/* ============================================
              BOX ASSIGNMENT SECTION
              ============================================ */}
          <div style={{
            marginTop: 20, padding: 16, background: "#0d1117",
            borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.1)"
          }}>
            <div 
              style={{ 
                display: "flex", alignItems: "center", justifyContent: "space-between",
                cursor: "pointer"
              }}
              onClick={() => setShowBoxSelector(!showBoxSelector)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Package size={18} color="#10b981" />
                <div>
                  <div style={{ color: "#e5e7eb", fontSize: 14, fontWeight: 500 }}>
                    Boxen zuweisen
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    {poolBoxes.length} Boxen im Lager verfügbar
                  </div>
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {selectedBoxIds.size > 0 && (
                  <span style={{
                    padding: "4px 10px", borderRadius: 20,
                    background: "#10b98120", color: "#10b981",
                    fontSize: 12, fontWeight: 600
                  }}>
                    {selectedBoxIds.size} ausgewählt
                  </span>
                )}
                {showBoxSelector ? <ChevronUp size={18} color="#6b7280" /> : <ChevronDown size={18} color="#6b7280" />}
              </div>
            </div>

            {/* Box Selector Content */}
            {showBoxSelector && (
              <div style={{ marginTop: 16 }}>
                {/* Schnellauswahl */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  marginBottom: 12, padding: "10px 12px",
                  background: "#161b22", borderRadius: 8
                }}>
                  <span style={{ color: "#9ca3af", fontSize: 12, whiteSpace: "nowrap" }}>
                    Schnellauswahl:
                  </span>
                  
                  {/* Counter mit +/- Buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); decrementBoxCount(); }}
                      disabled={boxCount === 0}
                      style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: "#21262d", border: "1px solid #30363d",
                        color: boxCount === 0 ? "#4b5563" : "#e5e7eb",
                        cursor: boxCount === 0 ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    
                    <input
                      type="number"
                      min="0"
                      max={poolBoxes.length}
                      value={boxCount}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(parseInt(e.target.value) || 0, poolBoxes.length));
                        selectFirstNBoxes(val);
                      }}
                      style={{
                        width: 50, padding: "4px 8px", textAlign: "center",
                        background: "#0d1117", border: "1px solid #30363d",
                        borderRadius: 6, color: "#fff", fontSize: 14
                      }}
                    />
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); incrementBoxCount(); }}
                      disabled={boxCount >= poolBoxes.length}
                      style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: "#21262d", border: "1px solid #30363d",
                        color: boxCount >= poolBoxes.length ? "#4b5563" : "#e5e7eb",
                        cursor: boxCount >= poolBoxes.length ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  <span style={{ color: "#6b7280", fontSize: 11 }}>
                    von {poolBoxes.length}
                  </span>
                  
                  {/* Preset Buttons */}
                  <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                    {[5, 10, 20].filter(n => n <= poolBoxes.length).map(n => (
                      <button
                        key={n}
                        onClick={(e) => { e.stopPropagation(); selectFirstNBoxes(n); }}
                        style={{
                          padding: "4px 8px", borderRadius: 4,
                          background: boxCount === n ? "#10b981" : "#21262d",
                          border: "1px solid #30363d",
                          color: boxCount === n ? "#fff" : "#9ca3af",
                          fontSize: 11, cursor: "pointer"
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Box Liste */}
                {poolLoading ? (
                  <div style={{ textAlign: "center", padding: 20, color: "#6b7280" }}>
                    Lade Boxen...
                  </div>
                ) : poolBoxes.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 20, color: "#6b7280", fontSize: 13 }}>
                    Keine Boxen im Lager verfügbar
                  </div>
                ) : (
                  <div style={{ maxHeight: 200, overflowY: "auto" }}>
                    {sortedPoolBoxes.map((box, index) => (
                      <div
                        key={box.id}
                        onClick={(e) => { e.stopPropagation(); toggleBoxSelection(box.id); }}
                        style={{
                          padding: "8px 12px", marginBottom: 4,
                          background: selectedBoxIds.has(box.id) ? "#10b98115" : "#161b22",
                          border: selectedBoxIds.has(box.id) ? "1px solid #10b981" : "1px solid #21262d",
                          borderRadius: 8, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 10,
                          transition: "all 0.15s"
                        }}
                      >
                        {/* Checkbox */}
                        <div style={{
                          width: 20, height: 20, borderRadius: 4,
                          border: selectedBoxIds.has(box.id) ? "none" : "1px solid #374151",
                          background: selectedBoxIds.has(box.id) ? "#10b981" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0
                        }}>
                          {selectedBoxIds.has(box.id) && <Check size={12} color="#fff" />}
                        </div>
                        
                        {/* Box Info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            color: "#e5e7eb", fontSize: 14, fontWeight: 600,
                            display: "flex", alignItems: "center", gap: 8
                          }}>
                            {formatQrNumber(box.qr_code) || box.number || `#${box.id}`}
                            <span style={{ 
                              color: "#6b7280", fontSize: 11, fontWeight: 400,
                              fontFamily: "monospace"
                            }}>
                              {box.qr_code}
                            </span>
                          </div>
                        </div>
                        
                        {/* Index Badge */}
                        {selectedBoxIds.has(box.id) && (
                          <span style={{
                            padding: "2px 6px", borderRadius: 4,
                            background: "#10b98130", color: "#10b981",
                            fontSize: 10, fontWeight: 600
                          }}>
                            #{Array.from(selectedBoxIds).indexOf(box.id) + 1}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Auswahl Actions */}
                {poolBoxes.length > 0 && (
                  <div style={{ 
                    display: "flex", gap: 8, marginTop: 10,
                    paddingTop: 10, borderTop: "1px solid #21262d"
                  }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); selectAll(); }}
                      style={{
                        padding: "6px 12px", borderRadius: 6,
                        background: "#21262d", border: "1px solid #30363d",
                        color: "#9ca3af", fontSize: 11, cursor: "pointer"
                      }}
                    >
                      Alle auswählen
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); selectNone(); }}
                      style={{
                        padding: "6px 12px", borderRadius: 6,
                        background: "#21262d", border: "1px solid #30363d",
                        color: "#9ca3af", fontSize: 11, cursor: "pointer"
                      }}
                    >
                      Keine
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Position */}
          <div style={styles.positionBox}>
            <MapPin size={18} style={styles.positionIcon} />
            <span style={styles.positionText}>
              {latLng.lat.toFixed(6)}, {latLng.lng.toFixed(6)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            style={styles.btnSecondary}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.1)";
              e.target.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.05)";
              e.target.style.color = "#9ca3af";
            }}
          >
            Abbrechen
          </button>
          <button
            style={{
              ...styles.btnPrimary,
              ...(saving || !name.trim() ? styles.btnDisabled : {}),
            }}
            onClick={handleSave}
            disabled={saving || !name.trim()}
            onMouseEnter={(e) => {
              if (!saving && name.trim()) {
                e.target.style.background = "#059669";
              }
            }}
            onMouseLeave={(e) => {
              if (!saving && name.trim()) {
                e.target.style.background = "#10b981";
              }
            }}
          >
            <Save size={16} />
            {saving ? "Erstelle..." : (
              selectedBoxIds.size > 0 
                ? `Erstellen + ${selectedBoxIds.size} Boxen`
                : "Erstellen"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}