/* ============================================================
   TRAPMAP - OBJECT SIDEBAR V7
   Rechte Sidebar mit Boxliste, History & Bulk-Return
   
   FEATURES:
   - Boxen sortiert nach QR-Nummer (klein → groß)
   - QR-Anzeige ohne führende Nullen
   - Unplatzierte Boxen zuerst
   - Bulk-Return: Mehrere Boxen auf einmal zurück ins Lager
   - Box-Anforderung aus Pool
   ============================================================ */

import { useState, useEffect, useMemo } from "react";
import { X, Edit, History, MapPin, Archive, Plus, Check, Package, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

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

export default function ObjectSidebar({
  object,
  boxes = [],
  onClose,
  onBoxClick,
  onEditObject,
  onBoxesChanged, // Callback wenn Boxen geändert wurden
}) {
  const token = localStorage.getItem("trapmap_token");
  const [history, setHistory] = useState([]);
  
  // ============================================
  // NEU: States für Bulk-Return
  // ============================================
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedBoxes, setSelectedBoxes] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [toast, setToast] = useState(null);
  
  // ============================================
  // NEU: States für Pool-Boxen Anforderung
  // ============================================
  const [showPoolSelector, setShowPoolSelector] = useState(false);
  const [poolBoxes, setPoolBoxes] = useState([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [selectedPoolBoxes, setSelectedPoolBoxes] = useState(new Set());

  // Load history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const res = await fetch(
          `${API}/scans?object_id=${object.id}&after=${ninetyDaysAgo.toISOString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const json = await res.json();
        const scans = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];
        setHistory(scans.slice(0, 10));
      } catch (e) {
        console.error("Error loading history:", e);
      }
    };

    if (object) loadHistory();
  }, [object, token]);

  // ============================================
  // SORTIERTE BOXEN (QR klein → groß)
  // ============================================
  const sortedBoxes = useMemo(() => {
    if (!boxes || boxes.length === 0) return [];

    return [...boxes].sort((a, b) => {
      // Unplatzierte zuerst
      const aPlaced = a.position_type && a.position_type !== 'none';
      const bPlaced = b.position_type && b.position_type !== 'none';

      if (!aPlaced && bPlaced) return -1;
      if (aPlaced && !bPlaced) return 1;

      // Dann nach QR-Nummer (klein → groß)
      return extractQrNumber(a.qr_code) - extractQrNumber(b.qr_code);
    });
  }, [boxes]);

  const unplacedCount = useMemo(() => {
    return boxes.filter(b => !b.position_type || b.position_type === 'none').length;
  }, [boxes]);

  // ============================================
  // Pool-Boxen laden
  // ============================================
  const loadPoolBoxes = async () => {
    setPoolLoading(true);
    try {
      const res = await fetch(`${API}/boxes/pool`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Sortieren nach QR-Nummer
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

  // Box Name/Nummer
  const getBoxName = (box) => {
    const qrNum = formatQrNumber(box.qr_code);
    if (qrNum) return qrNum;
    if (box.number) return String(box.number);
    return `#${box.id}`;
  };

  // Box Icon
  const getBoxIcon = (box) => {
    const typeName = (box.box_type_name || "").toLowerCase();
    if (typeName.includes("schlag") || typeName.includes("trap")) return "T";
    if (typeName.includes("gift") || typeName.includes("bait") || typeName.includes("rodent") || typeName.includes("nager")) return "R";
    if (typeName.includes("insekt") || typeName.includes("insect")) return "I";
    if (typeName.includes("uv") || typeName.includes("licht")) return "L";
    return "B";
  };

  // Status Color
  const getStatusColor = (status) => {
    const statusMap = {
      green: "green", ok: "green",
      yellow: "yellow", "geringe aufnahme": "yellow",
      orange: "orange", "auffällig": "orange",
      red: "red", "starker befall": "red",
    };
    return statusMap[(status || "").toLowerCase()] || "gray";
  };

  const isPlaced = (box) => box.position_type && box.position_type !== 'none';

  // ============================================
  // BULK RETURN HANDLERS
  // ============================================
  const toggleBoxSelection = (boxId) => {
    const newSet = new Set(selectedBoxes);
    if (newSet.has(boxId)) {
      newSet.delete(boxId);
    } else {
      newSet.add(boxId);
    }
    setSelectedBoxes(newSet);
  };

  const selectAllBoxes = () => {
    setSelectedBoxes(new Set(boxes.map(b => b.id)));
  };

  const deselectAllBoxes = () => {
    setSelectedBoxes(new Set());
  };

  const handleBulkReturn = async () => {
    if (selectedBoxes.size === 0) return;
    
    setBulkLoading(true);
    try {
      const res = await fetch(`${API}/boxes/bulk-return`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ box_ids: Array.from(selectedBoxes) })
      });

      if (res.ok) {
        const data = await res.json();
        setToast({ type: "success", msg: `${data.count} Boxen zurück ins Lager` });
        setShowBulkConfirm(false);
        setSelectionMode(false);
        setSelectedBoxes(new Set());
        
        // Parent informieren
        if (onBoxesChanged) onBoxesChanged();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Fehler");
      }
    } catch (e) {
      setToast({ type: "error", msg: e.message });
    }
    setBulkLoading(false);
  };

  // ============================================
  // POOL BOX ASSIGN HANDLERS
  // ============================================
  const togglePoolBoxSelection = (boxId) => {
    const newSet = new Set(selectedPoolBoxes);
    if (newSet.has(boxId)) {
      newSet.delete(boxId);
    } else {
      newSet.add(boxId);
    }
    setSelectedPoolBoxes(newSet);
  };

  const handleAssignPoolBoxes = async () => {
    if (selectedPoolBoxes.size === 0) return;
    
    setBulkLoading(true);
    try {
      const res = await fetch(`${API}/boxes/bulk-assign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          box_ids: Array.from(selectedPoolBoxes),
          object_id: object.id
        })
      });

      if (res.ok) {
        const data = await res.json();
        setToast({ type: "success", msg: `${data.count} Boxen hinzugefügt` });
        setShowPoolSelector(false);
        setSelectedPoolBoxes(new Set());
        
        if (onBoxesChanged) onBoxesChanged();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Fehler");
      }
    } catch (e) {
      setToast({ type: "error", msg: e.message });
    }
    setBulkLoading(false);
  };

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  return (
    <div className="object-sidebar-v6">
      {/* Toast */}
      {toast && (
        <div style={{
          position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
          padding: "8px 16px", borderRadius: 6, zIndex: 100,
          background: toast.type === "success" ? "#238636" : "#da3633",
          color: "#fff", fontSize: 13, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 6
        }}>
          {toast.type === "success" ? <Check size={14}/> : <AlertTriangle size={14}/>}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="sidebar-header-v6">
        <div className="sidebar-title-v6">
          <h2>{object.name}</h2>
          <p>
            {object.address}
            {object.city && `, ${object.zip} ${object.city}`}
          </p>
        </div>
        <button className="sidebar-close-v6" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="sidebar-content-v6">
        {/* Action Buttons */}
        <div className="sidebar-actions-v6">
          <button className="sidebar-btn-v6" onClick={onEditObject}>
            <Edit size={16} />
            Bearbeiten
          </button>
        </div>

        {/* Box List Section */}
        <div className="sidebar-section-v6">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              Boxen ({(boxes || []).length})
              {unplacedCount > 0 && (
                <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 'normal' }}>
                  {unplacedCount} unplatziert
                </span>
              )}
            </h3>
            
            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 6 }}>
              {/* Pool-Boxen anfordern */}
              <button
                onClick={() => {
                  setShowPoolSelector(!showPoolSelector);
                  if (!showPoolSelector) loadPoolBoxes();
                }}
                style={{
                  padding: "4px 8px", borderRadius: 4,
                  background: showPoolSelector ? "#238636" : "#21262d",
                  border: "1px solid #30363d", color: showPoolSelector ? "#fff" : "#8b949e",
                  fontSize: 11, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4
                }}
              >
                <Plus size={12} />
                Anfordern
              </button>
              
              {/* Bulk Return Toggle */}
              {boxes.length > 0 && (
                <button
                  onClick={() => {
                    setSelectionMode(!selectionMode);
                    setSelectedBoxes(new Set());
                    setShowPoolSelector(false);
                  }}
                  style={{
                    padding: "4px 8px", borderRadius: 4,
                    background: selectionMode ? "#da3633" : "#21262d",
                    border: "1px solid #30363d", color: selectionMode ? "#fff" : "#8b949e",
                    fontSize: 11, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4
                  }}
                >
                  <Archive size={12} />
                  {selectionMode ? "Abbrechen" : "Zurücksenden"}
                </button>
              )}
            </div>
          </div>

          {/* ============================================
              POOL SELECTOR
              ============================================ */}
          {showPoolSelector && (
            <div style={{
              marginBottom: 12, padding: 12, background: "#0d1117",
              borderRadius: 8, border: "1px solid #238636"
            }}>
              <div style={{ 
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 10
              }}>
                <span style={{ fontSize: 12, color: "#3fb950", fontWeight: 500 }}>
                  <Package size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                  Boxen aus Lager ({poolBoxes.length} verfügbar)
                </span>
                {selectedPoolBoxes.size > 0 && (
                  <span style={{ fontSize: 11, color: "#8b949e" }}>
                    {selectedPoolBoxes.size} ausgewählt
                  </span>
                )}
              </div>
              
              {poolLoading ? (
                <div style={{ textAlign: "center", padding: 20, color: "#8b949e" }}>Lade...</div>
              ) : poolBoxes.length === 0 ? (
                <div style={{ textAlign: "center", padding: 20, color: "#8b949e", fontSize: 12 }}>
                  Keine Boxen im Lager
                </div>
              ) : (
                <>
                  <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 10 }}>
                    {poolBoxes.map(box => (
                      <div
                        key={box.id}
                        onClick={() => togglePoolBoxSelection(box.id)}
                        style={{
                          padding: "8px 10px", marginBottom: 4,
                          background: selectedPoolBoxes.has(box.id) ? "#23863620" : "#161b22",
                          border: selectedPoolBoxes.has(box.id) ? "1px solid #238636" : "1px solid #21262d",
                          borderRadius: 6, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 10
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: 4,
                          border: selectedPoolBoxes.has(box.id) ? "none" : "1px solid #30363d",
                          background: selectedPoolBoxes.has(box.id) ? "#238636" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          {selectedPoolBoxes.has(box.id) && <Check size={12} color="#fff" />}
                        </div>
                        <span style={{ fontSize: 13, color: "#e6edf3", fontWeight: 500 }}>
                          {formatQrNumber(box.qr_code) || box.number}
                        </span>
                        <span style={{ fontSize: 11, color: "#8b949e" }}>
                          QR: {box.qr_code}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={handleAssignPoolBoxes}
                    disabled={selectedPoolBoxes.size === 0 || bulkLoading}
                    style={{
                      width: "100%", padding: 10, borderRadius: 6,
                      background: selectedPoolBoxes.size > 0 ? "#238636" : "#21262d",
                      border: "none", color: "#fff", fontSize: 12, fontWeight: 500,
                      cursor: selectedPoolBoxes.size > 0 ? "pointer" : "not-allowed",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                    }}
                  >
                    <Plus size={14} />
                    {bulkLoading ? "Wird hinzugefügt..." : `${selectedPoolBoxes.size} Boxen hinzufügen`}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ============================================
              SELECTION MODE CONTROLS
              ============================================ */}
          {selectionMode && boxes.length > 0 && (
            <div style={{
              marginBottom: 10, padding: "8px 10px", background: "#da363320",
              borderRadius: 6, border: "1px solid #da363350",
              display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={selectAllBoxes}
                  style={{
                    padding: "4px 8px", borderRadius: 4,
                    background: "#21262d", border: "1px solid #30363d",
                    color: "#8b949e", fontSize: 11, cursor: "pointer"
                  }}
                >
                  Alle
                </button>
                <button
                  onClick={deselectAllBoxes}
                  style={{
                    padding: "4px 8px", borderRadius: 4,
                    background: "#21262d", border: "1px solid #30363d",
                    color: "#8b949e", fontSize: 11, cursor: "pointer"
                  }}
                >
                  Keine
                </button>
              </div>
              
              <button
                onClick={() => setShowBulkConfirm(true)}
                disabled={selectedBoxes.size === 0}
                style={{
                  padding: "6px 12px", borderRadius: 4,
                  background: selectedBoxes.size > 0 ? "#da3633" : "#21262d",
                  border: "none", color: "#fff", fontSize: 11, fontWeight: 500,
                  cursor: selectedBoxes.size > 0 ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", gap: 4
                }}
              >
                <Archive size={12} />
                {selectedBoxes.size} zurücksenden
              </button>
            </div>
          )}

          {/* Box List */}
          {(!boxes || boxes.length === 0) ? (
            <p style={{ color: "#9ca3af", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
              Keine Boxen vorhanden
            </p>
          ) : (
            <div className="box-list-v6">
              {sortedBoxes.map((box) => {
                const placed = isPlaced(box);
                const isSelected = selectedBoxes.has(box.id);
                
                return (
                  <div
                    key={box.id}
                    className={`box-item-v6 ${!placed ? 'unplaced' : ''}`}
                    draggable={!placed && !selectionMode}
                    onDragStart={(e) => {
                      if (!placed && !selectionMode) {
                        e.dataTransfer.setData('box', JSON.stringify(box));
                        e.dataTransfer.effectAllowed = 'move';
                      }
                    }}
                    onClick={() => {
                      if (selectionMode) {
                        toggleBoxSelection(box.id);
                      } else if (placed) {
                        onBoxClick(box);
                      }
                    }}
                    style={{
                      opacity: placed ? 1 : 0.7,
                      borderLeft: selectionMode && isSelected 
                        ? '3px solid #da3633' 
                        : (!placed ? '3px solid #f59e0b' : 'none'),
                      cursor: selectionMode ? 'pointer' : (placed ? 'pointer' : 'grab'),
                      background: isSelected ? '#da363315' : undefined
                    }}
                    title={selectionMode ? 'Klicken zum Auswählen' : (placed ? 'Box anzeigen' : 'Auf Karte ziehen zum Platzieren')}
                  >
                    {/* Selection Checkbox */}
                    {selectionMode && (
                      <div style={{
                        width: 20, height: 20, borderRadius: 4,
                        border: isSelected ? "none" : "1px solid #30363d",
                        background: isSelected ? "#da3633" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        marginRight: 8, flexShrink: 0
                      }}>
                        {isSelected && <Check size={12} color="#fff" />}
                      </div>
                    )}
                    
                    <span className="box-icon-v6">{getBoxIcon(box)}</span>
                    <div className="box-info-v6">
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {getBoxName(box)}
                        {!placed && !selectionMode && (
                          <MapPin size={12} style={{ color: '#f59e0b' }} />
                        )}
                      </h4>
                      <p>{box.box_type_name || 'Kein Typ'}</p>
                    </div>
                    {!selectionMode && (
                      placed ? (
                        <span className={`box-status-v6 ${getStatusColor(box.current_status || box.status)}`} />
                      ) : (
                        <span style={{ fontSize: 11, color: '#f59e0b', whiteSpace: 'nowrap' }}>
                          ⇢ Ziehen
                        </span>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="sidebar-section-v6">
            <h3>
              <History size={16} style={{ display: "inline", marginRight: "6px" }} />
              Letzte 90 Tage
            </h3>

            <div className="history-list-v6">
              {history.map((scan) => (
                <div key={scan.id} className="history-item-v6" style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "10px",
                  borderBottom: "1px solid #30363d"
                }}>
                  <span className={`box-status-v6 ${getStatusColor(scan.status)}`} style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    marginTop: "4px",
                    flexShrink: 0
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      color: "#e6edf3", 
                      fontSize: "13px", 
                      fontWeight: 600,
                      marginBottom: "4px"
                    }}>
                      {scan.boxes?.number ? `Box ${scan.boxes.number}` : 'Box'} {scan.boxes?.qr_code || ''}
                    </div>
                    <div style={{ 
                      color: "#8b949e", 
                      fontSize: "11px",
                      marginBottom: scan.notes ? "4px" : "0"
                    }}>
                      {(scan.scanned_at || scan.created_at) 
                        ? new Date(scan.scanned_at || scan.created_at).toLocaleString("de-DE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : "-"}
                    </div>
                    {scan.notes && (
                      <div style={{ 
                        color: "#c9d1d9", 
                        fontSize: "12px",
                        fontStyle: "italic"
                      }}>
                        {scan.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============================================
          BULK RETURN CONFIRMATION MODAL
          ============================================ */}
      {showBulkConfirm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 20
        }}>
          <div style={{
            background: "#161b22", borderRadius: 12, width: "100%", maxWidth: 380,
            border: "1px solid #30363d", overflow: "hidden"
          }}>
            <div style={{
              padding: "16px 20px", background: "#21262d",
              borderBottom: "1px solid #30363d",
              display: "flex", alignItems: "center", gap: 12
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "rgba(239, 68, 68, 0.15)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <AlertTriangle size={20} color="#ef4444" />
              </div>
              <div>
                <div style={{ color: "#e6edf3", fontWeight: 600, fontSize: 15 }}>
                  {selectedBoxes.size} Boxen zurücksenden?
                </div>
                <div style={{ color: "#8b949e", fontSize: 12 }}>
                  Diese Aktion kann nicht rückgängig gemacht werden
                </div>
              </div>
            </div>

            <div style={{ padding: 20 }}>
              <p style={{ color: "#c9d1d9", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                Die ausgewählten Boxen werden:
              </p>
              <ul style={{ color: "#8b949e", fontSize: 12, margin: "12px 0", paddingLeft: 20, lineHeight: 1.8 }}>
                <li>Vom Objekt entfernt</li>
                <li>Vollständig zurückgesetzt</li>
                <li>Zurück ins Lager verschoben</li>
              </ul>
              <div style={{
                padding: 10, background: "#0d1117", borderRadius: 6,
                border: "1px solid #21262d", fontSize: 11, color: "#8b949e"
              }}>
                💡 Die Scan-Historie bleibt erhalten.
              </div>
            </div>

            <div style={{
              padding: "12px 20px", background: "#0d1117",
              borderTop: "1px solid #21262d",
              display: "flex", gap: 10
            }}>
              <button
                onClick={() => setShowBulkConfirm(false)}
                disabled={bulkLoading}
                style={{
                  flex: 1, padding: "10px 16px", borderRadius: 6,
                  border: "1px solid #30363d", background: "transparent",
                  color: "#8b949e", fontSize: 13, cursor: "pointer"
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleBulkReturn}
                disabled={bulkLoading}
                style={{
                  flex: 1, padding: "10px 16px", borderRadius: 6,
                  border: "none", background: "#da3633",
                  color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: bulkLoading ? "wait" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                }}
              >
                {bulkLoading ? "Wird zurückgesetzt..." : (
                  <>
                    <Archive size={14} />
                    Ja, zurücksenden
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}