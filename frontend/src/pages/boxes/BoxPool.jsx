// ============================================
// BOX POOL (Lager) - VERBESSERT
// Klickbare Stats, sortiert nach Nummer, Quick-Actions
// ============================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArchiveBoxIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  Squares2X2Icon,
  BuildingOfficeIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  QrCodeIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  BoltIcon
} from "@heroicons/react/24/outline";

const API = import.meta.env.VITE_API_URL;

export default function BoxPool() {
  const navigate = useNavigate();
  const token = localStorage.getItem("trapmap_token");

  const [boxes, setBoxes] = useState([]);
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, pool, assigned, placed
  const [search, setSearch] = useState("");
  const [assignDialog, setAssignDialog] = useState(null);
  const [assigning, setAssigning] = useState(false);

  // Daten laden
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [boxRes, objRes] = await Promise.all([
        fetch(`${API}/qr/codes`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/objects`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (boxRes.ok) {
        const data = await boxRes.json();
        setBoxes(data || []);
      }
      if (objRes.ok) {
        const data = await objRes.json();
        setObjects(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Box einem Objekt zuweisen
  const handleAssign = async (objectId) => {
    if (!assignDialog || !objectId) return;
    
    const boxId = assignDialog.boxes?.id || assignDialog.box_id;
    
    if (!boxId) {
      alert('Keine Box gefunden! Dieser QR-Code hat noch keine verknüpfte Box.');
      return;
    }
    
    setAssigning(true);

    try {
      const res = await fetch(`${API}/boxes/${boxId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ object_id: objectId })
      });

      if (res.ok) {
        loadData();
        setAssignDialog(null);
      } else {
        const err = await res.json();
        alert(err.error || 'Fehler beim Zuweisen');
      }
    } catch (err) {
      console.error("Assign error:", err);
      alert('Netzwerkfehler');
    } finally {
      setAssigning(false);
    }
  };

  // Stats berechnen
  const stats = {
    pool: boxes.filter((q) => !q.boxes?.object_id).length,
    assigned: boxes.filter((q) => q.boxes?.object_id && (!q.boxes?.position_type || q.boxes?.position_type === "none")).length,
    placed: boxes.filter((q) => q.boxes?.position_type && q.boxes?.position_type !== "none").length,
    total: boxes.length
  };

  // Gefilterte & sortierte Boxen
  const filteredBoxes = boxes
    .filter((qr) => {
      const box = qr.boxes;

      // Status-Filter
      if (filter === "pool" && box?.object_id) return false;
      if (filter === "assigned") {
        const hasObject = !!box?.object_id;
        const isPlaced = box?.position_type && box?.position_type !== "none";
        if (!hasObject || isPlaced) return false;
      }
      if (filter === "placed" && (!box?.position_type || box?.position_type === "none")) return false;

      // Suche
      if (search) {
        const term = search.toLowerCase();
        const matchCode = qr.id?.toLowerCase().includes(term);
        const matchNumber = box?.number?.toString().includes(term);
        const matchObject = box?.objects?.name?.toLowerCase().includes(term);
        if (!matchCode && !matchNumber && !matchObject) return false;
      }

      return true;
    })
    // SORTIERUNG: Nach Box-Nummer (kleinste zuerst)
    .sort((a, b) => {
      const numA = a.boxes?.number || 999999;
      const numB = b.boxes?.number || 999999;
      return numA - numB;
    });

  // Status-Badge
  const getStatusBadge = (box) => {
    if (!box) return { label: "Fehler", color: "#ef4444", Icon: ExclamationCircleIcon };
    if (!box.object_id) return { label: "Im Lager", color: "#6b7280", Icon: ArchiveBoxIcon };
    if (!box.position_type || box.position_type === "none") {
      return { label: "Unplatziert", color: "#f59e0b", Icon: ClockIcon };
    }
    if (box.position_type === "gps") return { label: "Auf Karte", color: "#3b82f6", Icon: MapPinIcon };
    if (box.position_type === "floorplan") return { label: "Auf Lageplan", color: "#8b5cf6", Icon: Squares2X2Icon };
    return { label: "Aktiv", color: "#10b981", Icon: CheckCircleIcon };
  };

  // Quick Actions berechnen
  const getQuickActions = () => {
    const actions = [];
    
    // Kritische Boxen (rot/orange Status)
    const criticalBoxes = boxes.filter(q => 
      q.boxes?.status === "red" || q.boxes?.status === "orange"
    );
    if (criticalBoxes.length > 0) {
      actions.push({
        id: "critical",
        label: `${criticalBoxes.length} kritisch`,
        icon: ExclamationTriangleIcon,
        color: "#ef4444",
        bgColor: "#ef444420",
        count: criticalBoxes.length
      });
    }

    // Boxen ohne Scan (länger als 30 Tage)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const overdueBoxes = boxes.filter(q => {
      if (!q.boxes?.last_scan) return q.boxes?.object_id; // Zugewiesen aber nie gescannt
      return new Date(q.boxes.last_scan) < thirtyDaysAgo;
    });
    if (overdueBoxes.length > 0) {
      actions.push({
        id: "overdue",
        label: `${overdueBoxes.length} überfällig`,
        icon: ClockIcon,
        color: "#f59e0b",
        bgColor: "#f59e0b20",
        count: overdueBoxes.length
      });
    }

    // Heute gescannt
    const today = new Date().toDateString();
    const scannedToday = boxes.filter(q => 
      q.boxes?.last_scan && new Date(q.boxes.last_scan).toDateString() === today
    );
    if (scannedToday.length > 0) {
      actions.push({
        id: "today",
        label: `${scannedToday.length} heute`,
        icon: SparklesIcon,
        color: "#10b981",
        bgColor: "#10b98120",
        count: scannedToday.length
      });
    }

    return actions;
  };

  const quickActions = getQuickActions();

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
          <ArchiveBoxIcon style={{ width: 28, height: 28 }} />
          Box-Lager
        </h1>
        <button 
          onClick={loadData} 
          style={{ 
            padding: "8px 16px", 
            background: "#374151", 
            border: "none", 
            borderRadius: 8, 
            color: "#fff", 
            cursor: "pointer", 
            display: "flex", 
            alignItems: "center", 
            gap: 8 
          }}
        >
          <ArrowPathIcon style={{ width: 16, height: 16 }} />
          Aktualisieren
        </button>
      </div>

      {/* Quick Actions Gadget */}
      {quickActions.length > 0 && (
        <div style={{ 
          display: "flex", 
          gap: 12, 
          marginBottom: 20, 
          padding: 16, 
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", 
          borderRadius: 12,
          border: "1px solid #334155",
          flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", marginRight: 8 }}>
            <BoltIcon style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Quick Status</span>
          </div>
          {quickActions.map(action => {
            const ActionIcon = action.icon;
            return (
              <div 
                key={action.id}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 6, 
                  padding: "6px 12px", 
                  background: action.bgColor, 
                  borderRadius: 20, 
                  color: action.color, 
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                <ActionIcon style={{ width: 14, height: 14 }} />
                {action.label}
              </div>
            );
          })}
        </div>
      )}

      {/* Suchfeld */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: "relative", maxWidth: 400 }}>
          <MagnifyingGlassIcon style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, color: "#6b7280" }} />
          <input
            type="text"
            placeholder="QR-Code, Box-Nr, Objekt suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              width: "100%", 
              padding: "12px 12px 12px 40px", 
              background: "#1f2937", 
              border: "1px solid #374151", 
              borderRadius: 10, 
              color: "#fff", 
              fontSize: 14 
            }}
          />
        </div>
      </div>

      {/* KLICKBARE Stats-Karten als Filter */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard
          label="Im Lager"
          value={stats.pool}
          color="#6b7280"
          active={filter === "pool"}
          onClick={() => setFilter(filter === "pool" ? "all" : "pool")}
          icon={ArchiveBoxIcon}
        />
        <StatCard
          label="Zugewiesen"
          value={stats.assigned}
          color="#f59e0b"
          active={filter === "assigned"}
          onClick={() => setFilter(filter === "assigned" ? "all" : "assigned")}
          icon={ClockIcon}
        />
        <StatCard
          label="Platziert"
          value={stats.placed}
          color="#10b981"
          active={filter === "placed"}
          onClick={() => setFilter(filter === "placed" ? "all" : "placed")}
          icon={CheckCircleIcon}
        />
        <StatCard
          label="Gesamt"
          value={stats.total}
          color="#3b82f6"
          active={filter === "all"}
          onClick={() => setFilter("all")}
          icon={Squares2X2Icon}
        />
      </div>

      {/* Aktiver Filter Hinweis */}
      {filter !== "all" && (
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          padding: "10px 16px", 
          background: "#1e3a5f", 
          borderRadius: 8, 
          marginBottom: 16,
          border: "1px solid #3b82f6"
        }}>
          <span style={{ color: "#93c5fd", fontSize: 14 }}>
            Filter aktiv: <strong>{filter === "pool" ? "Im Lager" : filter === "assigned" ? "Zugewiesen" : "Platziert"}</strong>
            {" "}({filteredBoxes.length} Boxen)
          </span>
          <button 
            onClick={() => setFilter("all")}
            style={{ 
              padding: "4px 12px", 
              background: "#3b82f6", 
              border: "none", 
              borderRadius: 6, 
              color: "#fff", 
              cursor: "pointer",
              fontSize: 13
            }}
          >
            Filter aufheben
          </button>
        </div>
      )}

      {/* Box Liste */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
          <ArrowPathIcon style={{ width: 24, height: 24, margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
          Laden...
        </div>
      ) : filteredBoxes.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", background: "#1f2937", borderRadius: 8 }}>
          {boxes.length === 0 ? "Noch keine Boxen vorhanden. Bitte QR-Codes über das Admin-Panel bestellen." : "Keine Boxen gefunden"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredBoxes.map((qr) => {
            const box = qr.boxes;
            const status = getStatusBadge(box);
            const StatusIcon = status.Icon;

            return (
              <div 
                key={qr.id} 
                style={{ 
                  background: "#1f2937", 
                  borderRadius: 8, 
                  padding: 16, 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 16, 
                  borderLeft: `4px solid ${status.color}`,
                  transition: "all 0.15s ease",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#283548"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#1f2937"}
              >
                {/* Box Nummer groß */}
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  background: `${status.color}20`, 
                  borderRadius: 8, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <span style={{ 
                    color: status.color, 
                    fontWeight: 700, 
                    fontSize: box?.number ? 16 : 12,
                    fontFamily: "monospace"
                  }}>
                    {box?.number || "?"}
                  </span>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <QrCodeIcon style={{ width: 14, height: 14, color: "#6b7280" }} />
                    <span style={{ color: "#9ca3af", fontSize: 12, fontFamily: "monospace" }}>{qr.id}</span>
                    {box?.box_types?.name && (
                      <span style={{ 
                        color: "#6b7280", 
                        fontSize: 11, 
                        padding: "2px 8px", 
                        background: "#374151", 
                        borderRadius: 4 
                      }}>
                        {box.box_types.name}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#d1d5db", fontSize: 14 }}>
                    {box?.objects?.name ? (
                      <>
                        <BuildingOfficeIcon style={{ width: 14, height: 14, color: "#6b7280" }} />
                        {box.objects.name}
                      </>
                    ) : (
                      <span style={{ color: "#6b7280" }}>Kein Objekt zugewiesen</span>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 6, 
                  padding: "6px 12px", 
                  background: `${status.color}20`, 
                  borderRadius: 20, 
                  color: status.color, 
                  fontSize: 13,
                  flexShrink: 0
                }}>
                  <StatusIcon style={{ width: 14, height: 14 }} />
                  {status.label}
                </div>

                {/* Actions */}
                {!box?.object_id ? (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setAssignDialog(qr); }} 
                    style={{ 
                      padding: "8px 16px", 
                      background: "#3b82f6", 
                      border: "none", 
                      borderRadius: 8, 
                      color: "#fff", 
                      cursor: "pointer", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 6, 
                      fontSize: 14,
                      flexShrink: 0,
                      transition: "background 0.15s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#2563eb"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#3b82f6"}
                  >
                    <ArrowRightIcon style={{ width: 16, height: 16 }} />
                    Zuweisen
                  </button>
                ) : (
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate(`/objects/${box.object_id}`); }} 
                    style={{ 
                      padding: "8px 16px", 
                      background: "#374151", 
                      border: "none", 
                      borderRadius: 8, 
                      color: "#fff", 
                      cursor: "pointer", 
                      fontSize: 14,
                      flexShrink: 0,
                      transition: "background 0.15s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#4b5563"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#374151"}
                  >
                    Öffnen
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Dialog */}
      {assignDialog && (
        <div 
          onClick={() => setAssignDialog(null)} 
          style={{ 
            position: "fixed", 
            inset: 0, 
            background: "rgba(0,0,0,0.7)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            zIndex: 1000, 
            padding: 20 
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              background: "#1f2937", 
              borderRadius: 12, 
              width: "100%", 
              maxWidth: 400, 
              maxHeight: "80vh", 
              overflow: "hidden",
              border: "1px solid #374151"
            }}
          >
            <div style={{ padding: 20, borderBottom: "1px solid #374151" }}>
              <h3 style={{ color: "#fff", margin: 0, fontSize: 18 }}>Box zuweisen</h3>
              <p style={{ color: "#9ca3af", margin: "8px 0 0", fontSize: 14 }}>
                {assignDialog.boxes?.number ? `Box #${assignDialog.boxes.number}` : assignDialog.id}
              </p>
            </div>

            <div style={{ padding: 20, maxHeight: 400, overflowY: "auto" }}>
              {objects.length === 0 ? (
                <p style={{ color: "#9ca3af", textAlign: "center" }}>Keine Objekte vorhanden</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {objects
                    .filter((o) => o.active !== false)
                    .map((obj) => (
                      <button
                        key={obj.id}
                        onClick={() => handleAssign(obj.id)}
                        disabled={assigning}
                        style={{ 
                          padding: 16, 
                          background: "#111827", 
                          border: "1px solid #374151", 
                          borderRadius: 8, 
                          color: "#fff", 
                          cursor: "pointer", 
                          textAlign: "left", 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 12, 
                          opacity: assigning ? 0.5 : 1,
                          transition: "all 0.15s"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#1e293b"; e.currentTarget.style.borderColor = "#3b82f6"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#111827"; e.currentTarget.style.borderColor = "#374151"; }}
                      >
                        <BuildingOfficeIcon style={{ width: 20, height: 20, color: "#6b7280" }} />
                        <div>
                          <div style={{ fontWeight: 500 }}>{obj.name}</div>
                          {obj.address && <div style={{ color: "#9ca3af", fontSize: 13 }}>{obj.address}</div>}
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div style={{ padding: 16, borderTop: "1px solid #374151", display: "flex", justifyContent: "flex-end" }}>
              <button 
                onClick={() => setAssignDialog(null)} 
                style={{ 
                  padding: "8px 20px", 
                  background: "#374151", 
                  border: "none", 
                  borderRadius: 8, 
                  color: "#fff", 
                  cursor: "pointer" 
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ============================================
// KLICKBARE STAT CARD COMPONENT
// ============================================
function StatCard({ label, value, color, active, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      style={{ 
        background: active ? `${color}15` : "#1f2937", 
        padding: 16, 
        borderRadius: 10, 
        borderLeft: `4px solid ${color}`,
        border: active ? `2px solid ${color}` : "2px solid transparent",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.2s ease",
        outline: "none"
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "#283548";
          e.currentTarget.style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "#1f2937";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon style={{ width: 16, height: 16, color: active ? color : "#6b7280" }} />
        <span style={{ color: active ? color : "#9ca3af", fontSize: 12, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ color: active ? color : "#fff", fontSize: 28, fontWeight: 700 }}>{value}</div>
      {active && (
        <div style={{ color: color, fontSize: 11, marginTop: 4 }}>
          ✓ Filter aktiv
        </div>
      )}
    </button>
  );
}