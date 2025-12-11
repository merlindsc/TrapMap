/* ============================================================
   TRAPMAP - OBJECT SIDEBAR V2
   - GPS-Boxen und Floorplan-Boxen getrennt
   - Klick auf Floorplan-Box navigiert zum Lageplan
   ============================================================ */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Edit, Plus, History, MapPin, Map, ChevronRight } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function ObjectSidebar({
  object,
  boxes = [],
  onClose,
  onBoxClick,
  onEditObject,
  onCreateBox,
}) {
  const navigate = useNavigate();
  const token = localStorage.getItem("trapmap_token");
  const [history, setHistory] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);

  // Boxen aufteilen: GPS vs Floorplan
  const gpsBoxes = (boxes || []).filter(box => !box.floor_plan_id);
  const floorPlanBoxes = (boxes || []).filter(box => box.floor_plan_id);

  // Floorplan-Boxen nach Plan gruppieren
  const boxesByFloorPlan = floorPlanBoxes.reduce((acc, box) => {
    const planId = box.floor_plan_id;
    if (!acc[planId]) {
      acc[planId] = [];
    }
    acc[planId].push(box);
    return acc;
  }, {});

  // Load floor plans for this object
  useEffect(() => {
    const loadFloorPlans = async () => {
      try {
        const res = await fetch(`${API}/floorplans/object/${object.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setFloorPlans(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error loading floor plans:", e);
      }
    };

    if (object) {
      loadFloorPlans();
    }
  }, [object, token]);

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
        setHistory(scans.slice(0, 10));
      } catch (e) {
        console.error("Error loading history:", e);
      }
    };

    if (object) {
      loadHistory();
    }
  }, [object, token]);

  // Get floor plan name by ID
  const getFloorPlanName = (planId) => {
    const plan = floorPlans.find(p => p.id === planId);
    return plan?.name || `Lageplan ${planId}`;
  };

  // Navigate to floor plan
  const goToFloorPlan = (planId) => {
    navigate(`/objects/${object.id}?tab=floorplans&plan=${planId}`);
    onClose();
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
      orange: "orange",
      red: "red",
    };
    return statusMap[(status || "").toLowerCase()] || "gray";
  };

  // Render a single box item
  const renderBoxItem = (box, isFloorPlanBox = false) => (
    <div
      key={box.id}
      className="box-item-v6"
      onClick={() => {
        if (isFloorPlanBox) {
          goToFloorPlan(box.floor_plan_id);
        } else {
          onBoxClick(box);
        }
      }}
    >
      <span className="box-icon-v6">{getBoxIcon(box)}</span>
      <div className="box-info-v6">
        <h4>{box.box_name || box.number || `Box #${box.id}`}</h4>
        <p>
          {box.box_type_name}
          {isFloorPlanBox && box.grid_position && (
            <span style={{ color: "#60a5fa", marginLeft: 6 }}>
              [{box.grid_position}]
            </span>
          )}
        </p>
      </div>
      <span className={`box-status-v6 ${getStatusColor(box.current_status || box.status)}`} />
      {isFloorPlanBox && <ChevronRight size={16} style={{ color: "#6b7280" }} />}
    </div>
  );

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
        {/* Action Buttons - 3 Buttons nebeneinander */}
        <div className="sidebar-actions-v6" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button 
            className="sidebar-btn-v6" 
            onClick={onEditObject}
            style={{ flex: 1 }}
          >
            <Edit size={16} />
            Bearbeiten
          </button>
          <button 
            className="sidebar-btn-v6" 
            onClick={onCreateBox}
            style={{ flex: 1, background: "#10b981" }}
          >
            <Plus size={16} />
            GPS-Box
          </button>
        </div>

        {/* GPS Boxen */}
        <div className="sidebar-section-v6">
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={16} style={{ color: "#10b981" }} />
            GPS-Boxen ({gpsBoxes.length})
          </h3>

          {gpsBoxes.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: "12px", padding: "8px 0" }}>
              Keine GPS-Boxen auf der Karte
            </p>
          ) : (
            <div className="box-list-v6">
              {gpsBoxes.map((box) => renderBoxItem(box, false))}
            </div>
          )}
        </div>

        {/* Floorplan Boxen - gruppiert nach Lageplan */}
        {Object.keys(boxesByFloorPlan).length > 0 && (
          <div className="sidebar-section-v6">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Map size={16} style={{ color: "#6366f1" }} />
              Lageplan-Boxen ({floorPlanBoxes.length})
            </h3>

            {Object.entries(boxesByFloorPlan).map(([planId, planBoxes]) => (
              <div key={planId} style={{ marginBottom: 12 }}>
                {/* Lageplan Header - klickbar */}
                <div
                  onClick={() => goToFloorPlan(parseInt(planId))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    background: "rgba(99, 102, 241, 0.1)",
                    borderRadius: 6,
                    cursor: "pointer",
                    marginBottom: 6,
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(99, 102, 241, 0.2)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)"}
                >
                  <span style={{ color: "#a5b4fc", fontSize: 13, fontWeight: 500 }}>
                    {getFloorPlanName(parseInt(planId))}
                  </span>
                  <span style={{ color: "#6b7280", fontSize: 12 }}>
                    {planBoxes.length} Boxen <ChevronRight size={14} style={{ display: "inline" }} />
                  </span>
                </div>

                {/* Boxen in diesem Lageplan */}
                <div className="box-list-v6">
                  {planBoxes.map((box) => renderBoxItem(box, true))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Keine Boxen */}
        {boxes.length === 0 && (
          <p style={{ color: "#9ca3af", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
            Keine Boxen vorhanden
          </p>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="sidebar-section-v6">
            <h3>
              <History size={16} style={{ display: "inline", marginRight: 6 }} />
              Letzte 90 Tage
            </h3>

            <div className="history-list-v6">
              {history.map((scan) => (
                <div key={scan.id} className="history-item-v6">
                  <span className={`box-status-v6 ${getStatusColor(scan.status)}`} />
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