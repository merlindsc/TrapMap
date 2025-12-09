/* ============================================================
   TRAPMAP — OBJECT SIDEBAR
   Alle Objekte + Boxen beim Klick
   ============================================================ */

import { useState } from "react";
import { X, Edit, Plus, ChevronDown, ChevronRight, Building2, MapPin } from "lucide-react";

export default function ObjectSidebar({
  objects,
  selectedObject,
  boxes,
  onClose,
  onSelectObject,
  onBoxClick,
  onEditObject,
  onCreateBox,
}) {
  const [expandedObjectId, setExpandedObjectId] = useState(selectedObject?.id || null);

  // Get icon based on box type
  const getBoxIcon = (box) => {
    const typeName = (box.box_type_name || "").toLowerCase();

    if (typeName.includes("schlag") || typeName.includes("trap")) return "🪤";
    if (typeName.includes("gift") || typeName.includes("bait") || typeName.includes("köder")) return "🐭";
    if (typeName.includes("monitoring") && (typeName.includes("maus") || typeName.includes("ratte"))) return "🧀";
    if (typeName.includes("insekt") || typeName.includes("insect")) return "🦟";
    if (typeName.includes("uv") || typeName.includes("licht")) return "💡";

    return "📦";
  };

  // Get status color
  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case "green": case "ok": return "green";
      case "yellow": return "yellow";
      case "red": return "red";
      default: return "gray";
    }
  };

  // Handle object click
  const handleObjectClick = (obj) => {
    if (expandedObjectId === obj.id) {
      // Schon offen - zuklappen
      setExpandedObjectId(null);
      onSelectObject(null);
    } else {
      // Aufklappen
      setExpandedObjectId(obj.id);
      onSelectObject(obj);
    }
  };

  return (
    <div className="object-sidebar-v6">
      {/* Header */}
      <div className="sidebar-header-v6">
        <div className="sidebar-title-v6">
          <h2>🏢 Objekte</h2>
          <p>{objects.length} Objekte</p>
        </div>
        <button className="sidebar-close-v6" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="sidebar-content-v6" style={{ padding: 0 }}>
        
        {objects.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: "13px", textAlign: "center", padding: "40px 20px" }}>
            Keine Objekte vorhanden
          </p>
        ) : (
          <div className="object-list-v6">
            {objects.map((obj) => {
              const isExpanded = expandedObjectId === obj.id;
              const isSelected = selectedObject?.id === obj.id;
              
              return (
                <div key={obj.id} className="object-group-v6">
                  {/* Object Header */}
                  <div
                    className={`object-item-v6 ${isSelected ? "selected" : ""}`}
                    onClick={() => handleObjectClick(obj)}
                  >
                    <div className="object-expand-icon">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                    
                    <div className="object-icon-v6">
                      <Building2 size={20} />
                    </div>
                    
                    <div className="object-info-v6">
                      <h4>{obj.name}</h4>
                      <p>
                        <MapPin size={12} style={{ display: "inline", marginRight: "4px" }} />
                        {obj.address}{obj.city && `, ${obj.city}`}
                      </p>
                    </div>
                  </div>

                  {/* Expanded Content - Buttons + Boxes */}
                  {isExpanded && isSelected && (
                    <div className="object-expanded-v6">
                      {/* Action Buttons */}
                      <div className="sidebar-actions-v6" style={{ padding: "8px 12px" }}>
                        <button 
                          className="sidebar-btn-v6 small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditObject();
                          }}
                        >
                          <Edit size={14} />
                          Bearbeiten
                        </button>
                        <button 
                          className="sidebar-btn-v6 secondary small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateBox();
                          }}
                        >
                          <Plus size={14} />
                          Box
                        </button>
                      </div>

                      {/* Box List */}
                      {boxes.length === 0 ? (
                        <p style={{ 
                          color: "#6b7280", 
                          fontSize: "12px", 
                          textAlign: "center", 
                          padding: "12px",
                          background: "#0a0a0a"
                        }}>
                          Keine Boxen
                        </p>
                      ) : (
                        <div className="box-list-v6 nested">
                          {boxes.map((box) => (
                            <div
                              key={box.id}
                              className="box-item-v6 small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onBoxClick(box);
                              }}
                            >
                              <span className="box-icon-v6">{getBoxIcon(box)}</span>
                              <div className="box-info-v6">
                                <h4>{box.number || box.box_name || `Box #${box.id}`}</h4>
                                <p>{box.box_type_name}</p>
                              </div>
                              <span className={`box-status-v6 ${getStatusColor(box.current_status || box.status)}`} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}