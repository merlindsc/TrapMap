/* ============================================================
   TRAPMAP - OBJECT SIDEBAR
   Rechte Sidebar (350px) mit Boxliste & History
   Sortierung: Unplatzierte zuerst, dann nach Nummer
   ============================================================ */

import { useState, useEffect, useMemo } from "react";
import { X, Edit, History, MapPin } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function ObjectSidebar({
  object,
  boxes = [],
  onClose,
  onBoxClick,
  onEditObject,
}) {
  const token = localStorage.getItem("trapmap_token");
  const [history, setHistory] = useState([]);

  // Load history for this object (last 90 days)
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const res = await fetch(
          `${API}/scans?object_id=${object.id}&after=${ninetyDaysAgo.toISOString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const json = await res.json();
        const scans = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];

        console.log("📋 Loaded history:", scans.length);
        setHistory(scans.slice(0, 10));
      } catch (e) {
        console.error("❌ Error loading history:", e);
      }
    };

    if (object) {
      loadHistory();
    }
  }, [object, token]);

  // ============================================
  // SORTIERTE BOXEN
  // 1. Unplatzierte (position_type = none/null) zuerst
  // 2. Dann nach Nummer sortiert
  // ============================================
  const sortedBoxes = useMemo(() => {
    if (!boxes || boxes.length === 0) return [];

    return [...boxes].sort((a, b) => {
      // Unplatzierte zuerst
      const aPlaced = a.position_type && a.position_type !== 'none';
      const bPlaced = b.position_type && b.position_type !== 'none';

      if (!aPlaced && bPlaced) return -1;
      if (aPlaced && !bPlaced) return 1;

      // Dann nach Nummer
      const aNum = a.number || 0;
      const bNum = b.number || 0;
      return aNum - bNum;
    });
  }, [boxes]);

  // Zähler für unplatzierte
  const unplacedCount = useMemo(() => {
    return boxes.filter(b => !b.position_type || b.position_type === 'none').length;
  }, [boxes]);

  // ============================================
  // BOX NAME - Nummer aus QR-Code extrahieren (DSE-0096 → 96)
  // ============================================
  const getBoxName = (box) => {
    // Wenn QR-Code vorhanden, Nummer extrahieren
    if (box.qr_code) {
      const match = box.qr_code.match(/(\d+)$/);
      if (match) {
        return parseInt(match[1], 10).toString(); // "0096" → "96"
      }
      return box.qr_code;
    }
    // Sonst Nummer
    if (box.number) {
      return String(box.number);
    }
    // Fallback
    return `#${box.id}`;
  };

  // Get icon based on box type
  const getBoxIcon = (box) => {
    const typeName = (box.box_type_name || "").toLowerCase();

    if (typeName.includes("schlag") || typeName.includes("trap")) return "T";
    if (typeName.includes("gift") || typeName.includes("bait") || typeName.includes("rodent") || typeName.includes("nager")) return "R";
    if (typeName.includes("insekt") || typeName.includes("insect")) return "I";
    if (typeName.includes("uv") || typeName.includes("licht")) return "L";

    return "B";
  };

  // Get status color
  const getStatusColor = (status) => {
    const statusMap = {
      green: "green",
      ok: "green",
      yellow: "yellow",
      "geringe aufnahme": "yellow",
      orange: "orange",
      "auffällig": "orange",
      red: "red",
      "starker befall": "red",
    };

    const normalized = (status || "").toLowerCase();
    return statusMap[normalized] || "gray";
  };

  // Ist Box platziert?
  const isPlaced = (box) => {
    return box.position_type && box.position_type !== 'none';
  };

  return (
    <div className="object-sidebar-v6">
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

        {/* Box List */}
        <div className="sidebar-section-v6">
          <h3>
            Boxen ({(boxes || []).length})
            {unplacedCount > 0 && (
              <span style={{ 
                marginLeft: 8, 
                fontSize: 12, 
                color: '#f59e0b',
                fontWeight: 'normal'
              }}>
                {unplacedCount} unplatziert
              </span>
            )}
          </h3>

          {(!boxes || boxes.length === 0) ? (
            <p style={{ color: "#9ca3af", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
              Keine Boxen vorhanden
            </p>
          ) : (
            <div className="box-list-v6">
              {sortedBoxes.map((box) => {
                const placed = isPlaced(box);
                
                return (
                  <div
                    key={box.id}
                    className={`box-item-v6 ${!placed ? 'unplaced' : ''}`}
                    draggable={!placed}
                    onDragStart={(e) => {
                      if (!placed) {
                        e.dataTransfer.setData('box', JSON.stringify(box));
                        e.dataTransfer.effectAllowed = 'move';
                      }
                    }}
                    onClick={() => {
                      // Nur platzierte Boxen sind anklickbar
                      if (placed) {
                        onBoxClick(box);
                      }
                    }}
                    style={{
                      opacity: placed ? 1 : 0.7,
                      borderLeft: placed ? 'none' : '3px solid #f59e0b',
                      cursor: placed ? 'pointer' : 'grab'
                    }}
                    title={placed ? 'Box anzeigen' : 'Auf Karte ziehen zum Platzieren'}
                  >
                    <span className="box-icon-v6">{getBoxIcon(box)}</span>
                    <div className="box-info-v6">
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {getBoxName(box)}
                        {!placed && (
                          <MapPin size={12} style={{ color: '#f59e0b' }} />
                        )}
                      </h4>
                      <p>{box.box_type_name || 'Kein Typ'}</p>
                    </div>
                    {placed ? (
                      <span
                        className={`box-status-v6 ${getStatusColor(
                          box.current_status || box.status
                        )}`}
                      />
                    ) : (
                      <span style={{ 
                        fontSize: 11, 
                        color: '#f59e0b',
                        whiteSpace: 'nowrap'
                      }}>
                        ⇢ Ziehen
                      </span>
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
                <div key={scan.id} className="history-item-v6">
                  <span
                    className={`box-status-v6 ${getStatusColor(scan.status)}`}
                  />
                  <span className="history-date-v6">
                    {(scan.scanned_at || scan.created_at) 
                      ? new Date(scan.scanned_at || scan.created_at).toLocaleDateString("de-DE") 
                      : "-"}
                  </span>
                  <span className="history-user-v6">
                    {scan.users?.first_name || scan.users?.email || "Unbekannt"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}