// ============================================
// BOX POOL (Lager) - SCHNELLZUWEISUNG & TOP 10
// - Schnellzuweisung: Anzahl eingeben → X Boxen zuweisen
// - Erste 10 Boxen immer sichtbar
// ============================================

import { useState, useEffect, useCallback, useMemo } from "react";
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
  ChevronDownIcon,
  ChevronUpIcon,
  RocketLaunchIcon,
  CubeIcon
} from "@heroicons/react/24/outline";

const API = import.meta.env.VITE_API_URL;

export default function BoxPool() {
  const navigate = useNavigate();
  const token = localStorage.getItem("trapmap_token");

  const [boxes, setBoxes] = useState([]);
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  
  // Schnellzuweisung State
  const [quickCount, setQuickCount] = useState("");
  const [quickObjectId, setQuickObjectId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState(null);

  // Daten laden
  const loadData = useCallback(async () => {
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
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Nummer extrahieren
  const extractNumber = (qr) => {
    if (qr.sequence_number != null && !isNaN(qr.sequence_number)) {
      return qr.sequence_number;
    }
    if (qr.boxes?.number != null && !isNaN(qr.boxes.number)) {
      return qr.boxes.number;
    }
    const match = qr.id?.match(/(\d+)$/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 999999;
  };

  // Stats berechnen
  const stats = useMemo(() => ({
    pool: boxes.filter((q) => !q.boxes?.object_id).length,
    assigned: boxes.filter((q) => q.boxes?.object_id && (!q.boxes?.position_type || q.boxes?.position_type === "none")).length,
    placed: boxes.filter((q) => q.boxes?.position_type && q.boxes?.position_type !== "none").length,
    total: boxes.length
  }), [boxes]);

  // Gefilterte & sortierte Boxen
  const filteredBoxes = useMemo(() => {
    return boxes
      .filter((qr) => {
        const box = qr.boxes;
        if (filter === "pool" && box?.object_id) return false;
        if (filter === "assigned") {
          const hasObject = !!box?.object_id;
          const isPlaced = box?.position_type && box?.position_type !== "none";
          if (!hasObject || isPlaced) return false;
        }
        if (filter === "placed" && (!box?.position_type || box?.position_type === "none")) return false;

        if (search) {
          const term = search.toLowerCase();
          const matchCode = qr.id?.toLowerCase().includes(term);
          const matchNumber = extractNumber(qr).toString().includes(term);
          const matchObject = box?.objects?.name?.toLowerCase().includes(term);
          if (!matchCode && !matchNumber && !matchObject) return false;
        }
        return true;
      })
      .sort((a, b) => extractNumber(a) - extractNumber(b));
  }, [boxes, filter, search]);

  // Nur Pool-Boxen (verfügbar für Zuweisung)
  const poolBoxes = useMemo(() => {
    return boxes
      .filter(qr => !qr.boxes?.object_id)
      .sort((a, b) => extractNumber(a) - extractNumber(b));
  }, [boxes]);

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

  // ============================================
  // SCHNELLZUWEISUNG: X Boxen einem Objekt zuweisen
  // ============================================
  const handleQuickAssign = async () => {
    const count = parseInt(quickCount, 10);
    
    if (isNaN(count) || count < 1) {
      setAssignMessage({ type: "error", text: "Bitte gültige Anzahl eingeben (mind. 1)" });
      return;
    }
    
    if (count > 300) {
      setAssignMessage({ type: "error", text: "Maximal 300 Boxen auf einmal" });
      return;
    }
    
    if (!quickObjectId) {
      setAssignMessage({ type: "error", text: "Bitte Objekt auswählen" });
      return;
    }

    // Prüfen ob genug Boxen im Pool
    if (poolBoxes.length < count) {
      setAssignMessage({ 
        type: "error", 
        text: `Nicht genug Boxen vorhanden! Verfügbar: ${poolBoxes.length}, Angefordert: ${count}` 
      });
      return;
    }

    // Die ersten X Pool-Boxen nehmen
    const boxesToAssign = poolBoxes.slice(0, count);
    
    setAssigning(true);
    setAssignMessage({ type: "info", text: `Weise ${count} Boxen zu...` });

    let successCount = 0;
    let errorCount = 0;

    for (const qr of boxesToAssign) {
      const boxId = qr.boxes?.id || qr.box_id;
      if (!boxId) {
        errorCount++;
        continue;
      }

      try {
        const res = await fetch(`${API}/boxes/${boxId}/assign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ object_id: quickObjectId })
        });

        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
      }
    }

    const objName = objects.find(o => o.id == quickObjectId)?.name || "Objekt";
    
    if (errorCount === 0) {
      setAssignMessage({ 
        type: "success", 
        text: `✓ ${successCount} Boxen erfolgreich "${objName}" zugewiesen` 
      });
    } else {
      setAssignMessage({ 
        type: "warning", 
        text: `${successCount} Boxen zugewiesen, ${errorCount} fehlgeschlagen` 
      });
    }

    setQuickCount("");
    loadData();
    setAssigning(false);
  };

  // Einzelne Box zuweisen
  const handleSingleAssign = async (qr, objectId) => {
    const boxId = qr.boxes?.id || qr.box_id;
    if (!boxId || !objectId) return;

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
      } else {
        const err = await res.json();
        alert(err.error || "Fehler beim Zuweisen");
      }
    } catch (err) {
      alert("Netzwerkfehler");
    } finally {
      setAssigning(false);
    }
  };

  // Aktive Objekte
  const activeObjects = useMemo(() => 
    objects.filter(o => o.active !== false),
  [objects]);

  // Erste 10 Boxen
  const first10Boxes = useMemo(() => filteredBoxes.slice(0, 10), [filteredBoxes]);
  const remainingBoxes = useMemo(() => filteredBoxes.slice(10), [filteredBoxes]);

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
          disabled={loading}
          style={{ 
            padding: "8px 16px", 
            background: loading ? "#1f2937" : "#374151", 
            border: "none", 
            borderRadius: 8, 
            color: "#fff", 
            cursor: loading ? "wait" : "pointer", 
            display: "flex", 
            alignItems: "center", 
            gap: 8,
            opacity: loading ? 0.6 : 1
          }}
        >
          <ArrowPathIcon style={{ width: 16, height: 16, animation: loading ? "spin 1s linear infinite" : "none" }} />
          {loading ? "Lädt..." : "Aktualisieren"}
        </button>
      </div>

      {/* ============================================ */}
      {/* SCHNELLZUWEISUNG - Mehrere Boxen auf einmal */}
      {/* ============================================ */}
      <div style={{ 
        background: "linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%)", 
        borderRadius: 12, 
        padding: 20, 
        marginBottom: 24,
        border: "1px solid #3b82f6"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <RocketLaunchIcon style={{ width: 20, height: 20, color: "#60a5fa" }} />
          <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 600, margin: 0 }}>Schnellzuweisung</h2>
        </div>
        
        {/* Erklärung */}
        <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
          Weise mehrere Boxen auf einmal einem Objekt zu. Gib die gewünschte Anzahl ein 
          und wähle das Ziel-Objekt. Die Boxen werden automatisch aus dem Lager-Pool genommen 
          (kleinste Nummern zuerst).
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          {/* Anzahl Eingabe */}
          <div style={{ flex: "0 0 140px" }}>
            <label style={{ color: "#9ca3af", fontSize: 12, marginBottom: 4, display: "block" }}>
              Anzahl Boxen
            </label>
            <input
              type="number"
              min="1"
              max="300"
              placeholder="z.B. 10"
              value={quickCount}
              onChange={(e) => {
                setQuickCount(e.target.value);
                setAssignMessage(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleQuickAssign()}
              style={{ 
                width: "100%",
                padding: "10px 12px", 
                background: "#0f172a", 
                border: "1px solid #374151", 
                borderRadius: 8, 
                color: "#fff", 
                fontSize: 16,
                fontWeight: 600,
                textAlign: "center"
              }}
            />
          </div>

          {/* Objekt Dropdown */}
          <div style={{ flex: "1 1 200px", minWidth: 180 }}>
            <label style={{ color: "#9ca3af", fontSize: 12, marginBottom: 4, display: "block" }}>
              Ziel-Objekt
            </label>
            <select
              value={quickObjectId}
              onChange={(e) => {
                setQuickObjectId(e.target.value);
                setAssignMessage(null);
              }}
              style={{ 
                width: "100%",
                padding: "10px 12px", 
                background: "#0f172a", 
                border: "1px solid #374151", 
                borderRadius: 8, 
                color: "#fff", 
                fontSize: 14,
                cursor: "pointer"
              }}
            >
              <option value="">-- Objekt wählen --</option>
              {activeObjects.map(obj => (
                <option key={obj.id} value={obj.id}>{obj.name}</option>
              ))}
            </select>
          </div>

          {/* Zuweisen Button */}
          <button
            onClick={handleQuickAssign}
            disabled={assigning || !quickCount || !quickObjectId}
            style={{ 
              padding: "10px 24px", 
              background: assigning ? "#374151" : "#3b82f6", 
              border: "none", 
              borderRadius: 8, 
              color: "#fff", 
              cursor: assigning ? "wait" : "pointer", 
              fontSize: 14,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity: (!quickCount || !quickObjectId) ? 0.5 : 1,
              transition: "all 0.15s"
            }}
          >
            {assigning ? (
              <ArrowPathIcon style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
            ) : (
              <ArrowRightIcon style={{ width: 16, height: 16 }} />
            )}
            {assigning ? "Zuweisen..." : "Zuweisen"}
          </button>
        </div>

        {/* Verfügbare Boxen Info */}
        <div style={{ 
          marginTop: 12, 
          padding: "8px 12px", 
          background: "#0f172a40", 
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          <CubeIcon style={{ width: 16, height: 16, color: "#6b7280" }} />
          <span style={{ color: "#94a3b8", fontSize: 13 }}>
            <strong style={{ color: "#10b981" }}>{stats.pool}</strong> Boxen verfügbar im Lager
          </span>
        </div>

        {/* Feedback Message */}
        {assignMessage && (
          <div style={{ 
            marginTop: 12, 
            padding: "10px 14px", 
            background: assignMessage.type === "success" ? "#10b98120" : 
                        assignMessage.type === "error" ? "#ef444420" : 
                        assignMessage.type === "warning" ? "#f59e0b20" : "#3b82f620",
            borderRadius: 6,
            color: assignMessage.type === "success" ? "#10b981" : 
                   assignMessage.type === "error" ? "#ef4444" : 
                   assignMessage.type === "warning" ? "#f59e0b" : "#60a5fa",
            fontSize: 14,
            fontWeight: 500
          }}>
            {assignMessage.text}
          </div>
        )}
      </div>

      {/* Stats-Karten */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard label="Im Lager" value={stats.pool} color="#6b7280" active={filter === "pool"} onClick={() => setFilter(filter === "pool" ? "all" : "pool")} icon={ArchiveBoxIcon} />
        <StatCard label="Zugewiesen" value={stats.assigned} color="#f59e0b" active={filter === "assigned"} onClick={() => setFilter(filter === "assigned" ? "all" : "assigned")} icon={ClockIcon} />
        <StatCard label="Platziert" value={stats.placed} color="#10b981" active={filter === "placed"} onClick={() => setFilter(filter === "placed" ? "all" : "placed")} icon={CheckCircleIcon} />
        <StatCard label="Gesamt" value={stats.total} color="#3b82f6" active={filter === "all"} onClick={() => setFilter("all")} icon={Squares2X2Icon} />
      </div>

      {/* Suchfeld */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: "relative", maxWidth: 300 }}>
          <MagnifyingGlassIcon style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, color: "#6b7280" }} />
          <input
            type="text"
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              width: "100%", 
              padding: "10px 12px 10px 40px", 
              background: "#1f2937", 
              border: "1px solid #374151", 
              borderRadius: 8, 
              color: "#fff", 
              fontSize: 14 
            }}
          />
        </div>
      </div>

      {/* ============================================ */}
      {/* ERSTE 10 BOXEN - Immer sichtbar */}
      {/* ============================================ */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
          <ArrowPathIcon style={{ width: 24, height: 24, margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
          Laden...
        </div>
      ) : first10Boxes.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", background: "#1f2937", borderRadius: 8 }}>
          {boxes.length === 0 ? "Noch keine Boxen vorhanden." : "Keine Boxen gefunden"}
        </div>
      ) : (
        <>
          {/* Box-Liste */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {first10Boxes.map(qr => (
              <BoxRow 
                key={qr.id} 
                qr={qr} 
                extractNumber={extractNumber}
                getStatusBadge={getStatusBadge}
                activeObjects={activeObjects}
                onAssign={handleSingleAssign}
                assigning={assigning}
                navigate={navigate}
              />
            ))}
          </div>

          {/* ============================================ */}
          {/* WEITERE BOXEN - Aufklappbar */}
          {/* ============================================ */}
          {remainingBoxes.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ 
                color: "#9ca3af", 
                cursor: "pointer", 
                padding: "12px 16px",
                fontSize: 14,
                userSelect: "none",
                background: "#1f2937",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <ChevronDownIcon style={{ width: 16, height: 16 }} />
                Weitere {remainingBoxes.length} Boxen anzeigen
              </summary>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {remainingBoxes.map(qr => (
                  <BoxRow 
                    key={qr.id} 
                    qr={qr} 
                    extractNumber={extractNumber}
                    getStatusBadge={getStatusBadge}
                    activeObjects={activeObjects}
                    onAssign={handleSingleAssign}
                    assigning={assigning}
                    navigate={navigate}
                  />
                ))}
              </div>
            </details>
          )}
        </>
      )}

      {/* CSS */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        select option {
          background: #1f2937;
          color: #fff;
        }
        details summary::-webkit-details-marker {
          display: none;
        }
        details[open] summary svg:first-child {
          transform: rotate(180deg);
        }
        details summary svg:first-child {
          transition: transform 0.2s;
        }
      `}</style>
    </div>
  );
}

// ============================================
// BOX ROW COMPONENT
// ============================================
function BoxRow({ qr, extractNumber, getStatusBadge, activeObjects, onAssign, assigning, navigate }) {
  const [showAssign, setShowAssign] = useState(false);
  const box = qr.boxes;
  const status = getStatusBadge(box);
  const StatusIcon = status.Icon;
  const num = extractNumber(qr);

  return (
    <div 
      style={{ 
        background: "#1f2937", 
        borderRadius: 8, 
        padding: "12px 16px", 
        display: "flex", 
        alignItems: "center", 
        gap: 12, 
        borderLeft: `4px solid ${status.color}`,
        transition: "all 0.15s ease"
      }}
    >
      {/* Nummer */}
      <div style={{ 
        width: 40, 
        height: 40, 
        background: `${status.color}20`, 
        borderRadius: 6, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        flexShrink: 0
      }}>
        <span style={{ 
          color: status.color, 
          fontWeight: 700, 
          fontSize: num > 999 ? 11 : 14,
          fontFamily: "monospace"
        }}>
          {num < 999999 ? num : "?"}
        </span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <QrCodeIcon style={{ width: 12, height: 12, color: "#6b7280" }} />
          <span style={{ color: "#9ca3af", fontSize: 11, fontFamily: "monospace" }}>{qr.id}</span>
        </div>
        <div style={{ color: "#d1d5db", fontSize: 13 }}>
          {box?.objects?.name || <span style={{ color: "#6b7280" }}>Kein Objekt</span>}
        </div>
      </div>

      {/* Status Badge */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 4, 
        padding: "4px 10px", 
        background: `${status.color}20`, 
        borderRadius: 12, 
        color: status.color, 
        fontSize: 12,
        flexShrink: 0
      }}>
        <StatusIcon style={{ width: 12, height: 12 }} />
        {status.label}
      </div>

      {/* Actions */}
      {!box?.object_id ? (
        showAssign ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              autoFocus
              onChange={(e) => {
                if (e.target.value) {
                  onAssign(qr, e.target.value);
                  setShowAssign(false);
                }
              }}
              onBlur={() => setTimeout(() => setShowAssign(false), 200)}
              disabled={assigning}
              style={{
                padding: "6px 10px",
                background: "#0f172a",
                border: "1px solid #3b82f6",
                borderRadius: 6,
                color: "#fff",
                fontSize: 13,
                cursor: "pointer",
                minWidth: 150
              }}
            >
              <option value="">Objekt wählen...</option>
              {activeObjects.map(obj => (
                <option key={obj.id} value={obj.id}>{obj.name}</option>
              ))}
            </select>
            <button
              onClick={() => setShowAssign(false)}
              style={{
                padding: "6px 10px",
                background: "#374151",
                border: "none",
                borderRadius: 6,
                color: "#fff",
                cursor: "pointer",
                fontSize: 12
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setShowAssign(true)} 
            style={{ 
              padding: "6px 14px", 
              background: "#3b82f6", 
              border: "none", 
              borderRadius: 6, 
              color: "#fff", 
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              gap: 4, 
              fontSize: 13,
              flexShrink: 0
            }}
          >
            <ArrowRightIcon style={{ width: 14, height: 14 }} />
            Zuweisen
          </button>
        )
      ) : (
        <button 
          onClick={() => navigate(`/objects/${box.object_id}`)} 
          style={{ 
            padding: "6px 14px", 
            background: "#374151", 
            border: "none", 
            borderRadius: 6, 
            color: "#fff", 
            cursor: "pointer", 
            fontSize: 13,
            flexShrink: 0
          }}
        >
          Öffnen
        </button>
      )}
    </div>
  );
}

// ============================================
// STAT CARD COMPONENT
// ============================================
function StatCard({ label, value, color, active, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      style={{ 
        background: active ? `${color}15` : "#1f2937", 
        padding: 12, 
        borderRadius: 8, 
        borderLeft: `3px solid ${color}`,
        border: active ? `2px solid ${color}` : "2px solid transparent",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.2s ease",
        outline: "none"
      }}
      onMouseEnter={(e) => !active && (e.currentTarget.style.background = "#283548")}
      onMouseLeave={(e) => !active && (e.currentTarget.style.background = "#1f2937")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Icon style={{ width: 14, height: 14, color: active ? color : "#6b7280" }} />
        <span style={{ color: active ? color : "#9ca3af", fontSize: 11 }}>{label}</span>
      </div>
      <div style={{ color: active ? color : "#fff", fontSize: 24, fontWeight: 700 }}>{value}</div>
    </button>
  );
}