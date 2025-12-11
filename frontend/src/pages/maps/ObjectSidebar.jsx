/* ============================================================
   TRAPMAP - OBJECT SIDEBAR V3
   - Faltbar/Minimierbar
   - Mobile: Bottom-Sheet mit Expand/Collapse
   - Desktop: Slide-in/out von rechts
   - GPS-Boxen und Floorplan-Boxen getrennt
   ============================================================ */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  X, Edit, Plus, History, MapPin, Map, ChevronRight, 
  ChevronUp, ChevronDown, PanelRightClose, PanelRightOpen 
} from "lucide-react";

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
  
  // Minimized State
  const [minimized, setMinimized] = useState(false);

  // Boxen aufteilen
  const gpsBoxes = (boxes || []).filter(box => !box.floor_plan_id);
  const floorPlanBoxes = (boxes || []).filter(box => box.floor_plan_id);

  const boxesByFloorPlan = floorPlanBoxes.reduce((acc, box) => {
    const planId = box.floor_plan_id;
    if (!acc[planId]) acc[planId] = [];
    acc[planId].push(box);
    return acc;
  }, {});

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
    if (object) loadFloorPlans();
  }, [object, token]);

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

  const getFloorPlanName = (planId) => {
    const plan = floorPlans.find(p => p.id === planId);
    return plan?.name || `Lageplan ${planId}`;
  };

  const goToFloorPlan = (planId) => {
    navigate(`/objects/${object.id}?tab=floorplans&plan=${planId}`);
    onClose();
  };

  const getBoxIcon = (box) => {
    const typeName = (box.box_type_name || "").toLowerCase();
    if (typeName.includes("schlag") || typeName.includes("trap")) return "T";
    if (typeName.includes("gift") || typeName.includes("bait") || typeName.includes("nager")) return "R";
    if (typeName.includes("insekt") || typeName.includes("insect")) return "I";
    if (typeName.includes("uv") || typeName.includes("licht")) return "L";
    return "B";
  };

  const getStatusColor = (status) => {
    const map = { green: "green", ok: "green", yellow: "yellow", orange: "orange", red: "red" };
    return map[(status || "").toLowerCase()] || "gray";
  };

  const renderBoxItem = (box, isFloorPlanBox = false) => (
    <div
      key={box.id}
      className="box-item-v6"
      onClick={() => isFloorPlanBox ? goToFloorPlan(box.floor_plan_id) : onBoxClick(box)}
    >
      <span className="box-icon-v6">{getBoxIcon(box)}</span>
      <div className="box-info-v6">
        <h4>{box.box_name || box.number || `Box #${box.id}`}</h4>
        <p>
          {box.box_type_name}
          {isFloorPlanBox && box.grid_position && (
            <span style={{ color: "#60a5fa", marginLeft: 6 }}>[{box.grid_position}]</span>
          )}
        </p>
      </div>
      <span className={`box-status-v6 ${getStatusColor(box.current_status || box.status)}`} />
      {isFloorPlanBox && <ChevronRight size={16} style={{ color: "#6b7280" }} />}
    </div>
  );

  const toggleMinimized = () => setMinimized(!minimized);

  return (
    <div className={`object-sidebar-v6 ${minimized ? 'minimized' : ''}`}>
      {/* Header */}
      <div className="sidebar-header-v6">
        {/* Drag Handle - Mobile */}
        <div className="sidebar-drag-handle" onClick={toggleMinimized}>
          <div className="drag-bar" />
        </div>
        
        <div className="sidebar-title-row">
          <div className="sidebar-title-v6">
            <h2>{object.name}</h2>
            {!minimized && (
              <p>{object.address}{object.city && `, ${object.zip} ${object.city}`}</p>
            )}
          </div>
          
          <div className="sidebar-header-buttons">
            {/* Toggle Desktop */}
            <button className="sidebar-toggle-btn desktop-only" onClick={toggleMinimized} title={minimized ? "Erweitern" : "Minimieren"}>
              {minimized ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
            </button>
            
            {/* Toggle Mobile */}
            <button className="sidebar-toggle-btn mobile-only" onClick={toggleMinimized}>
              {minimized ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            
            <button className="sidebar-close-v6" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Minimized Stats */}
        {minimized && (
          <div className="sidebar-minimized-stats">
            <span className="stat-item"><MapPin size={14} /> {gpsBoxes.length} GPS</span>
            <span className="stat-item"><Map size={14} /> {floorPlanBoxes.length} Plan</span>
          </div>
        )}
      </div>

      {/* Content */}
      {!minimized && (
        <div className="sidebar-content-v6">
          <div className="sidebar-actions-v6">
            <button className="sidebar-btn-v6" onClick={onEditObject}>
              <Edit size={16} /> Bearbeiten
            </button>
            <button className="sidebar-btn-v6" onClick={onCreateBox} style={{ background: "#10b981" }}>
              <Plus size={16} /> GPS-Box
            </button>
          </div>

          <div className="sidebar-section-v6">
            <h3><MapPin size={16} style={{ color: "#10b981", marginRight: 8 }} />GPS-Boxen ({gpsBoxes.length})</h3>
            {gpsBoxes.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: "12px", padding: "8px 0" }}>Keine GPS-Boxen</p>
            ) : (
              <div className="box-list-v6">{gpsBoxes.map(box => renderBoxItem(box, false))}</div>
            )}
          </div>

          {Object.keys(boxesByFloorPlan).length > 0 && (
            <div className="sidebar-section-v6">
              <h3><Map size={16} style={{ color: "#6366f1", marginRight: 8 }} />Lageplan-Boxen ({floorPlanBoxes.length})</h3>
              {Object.entries(boxesByFloorPlan).map(([planId, planBoxes]) => (
                <div key={planId} style={{ marginBottom: 12 }}>
                  <div onClick={() => goToFloorPlan(parseInt(planId))} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 10px", background: "rgba(99, 102, 241, 0.1)",
                    borderRadius: 6, cursor: "pointer", marginBottom: 6
                  }}>
                    <span style={{ color: "#a5b4fc", fontSize: 13, fontWeight: 500 }}>{getFloorPlanName(parseInt(planId))}</span>
                    <span style={{ color: "#6b7280", fontSize: 12 }}>{planBoxes.length} Boxen <ChevronRight size={14} /></span>
                  </div>
                  <div className="box-list-v6">{planBoxes.map(box => renderBoxItem(box, true))}</div>
                </div>
              ))}
            </div>
          )}

          {boxes.length === 0 && (
            <p style={{ color: "#9ca3af", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>Keine Boxen</p>
          )}

          {history.length > 0 && (
            <div className="sidebar-section-v6">
              <h3><History size={16} style={{ marginRight: 6 }} />Letzte 90 Tage</h3>
              <div className="history-list-v6">
                {history.map(scan => (
                  <div key={scan.id} className="history-item-v6">
                    <span className={`box-status-v6 ${getStatusColor(scan.status)}`} />
                    <span className="history-date-v6">
                      {(scan.scanned_at || scan.created_at) ? new Date(scan.scanned_at || scan.created_at).toLocaleDateString("de-DE") : "-"}
                    </span>
                    <span className="history-user-v6">{scan.users?.first_name || scan.users?.email || "Unbekannt"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}