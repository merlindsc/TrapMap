/* ============================================================
   TRAPMAP - OBJECT SIDEBAR
   Rechte Sidebar (350px) mit Boxliste & History
   ============================================================ */

import { useState, useEffect } from "react";
import { X, Edit, Plus, History } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function ObjectSidebar({
  object,
  boxes = [],
  onClose,
  onBoxClick,
  onEditObject,
  onCreateBox,
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

        console.log("B Loaded history:", scans.length);
        setHistory(scans.slice(0, 10)); // Top 10
      } catch (e) {
        console.error("- Error loading history:", e);
      }
    };

    if (object) {
      loadHistory();
    }
  }, [object, token]);

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
      "auffÃ¤llig": "orange",
      red: "red",
      "starker befall": "red",
    };

    const normalized = (status || "").toLowerCase();
    return statusMap[normalized] || "gray";
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
          <button className="sidebar-btn-v6 secondary" onClick={onCreateBox}>
            <Plus size={16} />
            Box
          </button>
        </div>

        {/* Box List */}
        <div className="sidebar-section-v6">
          <h3>Boxen ({(boxes || []).length})</h3>

          {(!boxes || boxes.length === 0) ? (
            <p style={{ color: "#9ca3af", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
              Keine Boxen vorhanden
            </p>
          ) : (
            <div className="box-list-v6">
              {boxes.map((box) => (
                <div
                  key={box.id}
                  className="box-item-v6"
                  onClick={() => onBoxClick(box)}
                >
                  <span className="box-icon-v6">{getBoxIcon(box)}</span>
                  <div className="box-info-v6">
                    <h4>{box.box_name || `Box #${box.id}`}</h4>
                    <p>{box.box_type_name}</p>
                  </div>
                  <span
                    className={`box-status-v6 ${getStatusColor(
                      box.current_status || box.status
                    )}`}
                  />
                </div>
              ))}
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