/* ============================================================
   BOX POOL (Lager) - THEME-AWARE VERSION
   - Alle Farben über CSS-Variablen
   - Schnellzuweisung & Top 10
   ============================================================ */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArchiveBoxIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  Squares2X2Icon,
  ArrowRightIcon,
  ArrowPathIcon,
  QrCodeIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  RocketLaunchIcon,
  CubeIcon
} from "@heroicons/react/24/outline";
import { extractQrCodesFromPoolBoxes } from "../../utils/boxUtils";
import "./BoxPool.css";

const API = import.meta.env.VITE_API_URL;

export default function BoxPool() {
  const navigate = useNavigate();
  
  let token = null;
  try {
    token = localStorage.getItem("trapmap_token");
  } catch (error) {
    console.error("localStorage nicht verfügbar:", error);
  }

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
        fetch(`${API}/boxes`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/objects`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (boxRes.ok) {
        const data = await boxRes.json();
        console.log("📦 All boxes loaded:", data?.length || 0, "boxes");
        // Debug: Show first box structure
        if (data && data.length > 0) {
          console.log("📦 First box structure:", {
            id: data[0].id,
            qr_code: data[0].qr_code,
            number: data[0].number,
            object_id: data[0].object_id
          });
        }
        setBoxes(data || []);
      }
      
      if (objRes.ok) {
        const data = await objRes.json();
        setObjects(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error("❌ Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Nummer extrahieren - Arbeitet jetzt mit flacher Box-Struktur
  const extractNumber = (box) => {
    // Direkt von box.number
    if (box.number != null && !isNaN(box.number)) {
      return box.number;
    }
    // Aus QR-Code extrahieren (z.B. "DSE-0096" -> 96)
    if (box.qr_code) {
      const match = box.qr_code.match(/(\d+)$/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    // Fallback: Aus ID extrahieren
    if (box.id) {
      const match = box.id.match(/(\d+)$/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return 999999;
  };

  // Stats berechnen - Jetzt mit flacher Struktur
  const stats = useMemo(() => ({
    pool: boxes.filter((box) => !box.object_id).length,
    assigned: boxes.filter((box) => box.object_id && (!box.position_type || box.position_type === "none")).length,
    placed: boxes.filter((box) => box.position_type && box.position_type !== "none").length,
    total: boxes.length
  }), [boxes]);

  // Gefilterte & sortierte Boxen - Flache Struktur
  const filteredBoxes = useMemo(() => {
    return boxes
      .filter((box) => {
        if (filter === "pool" && box.object_id) return false;
        if (filter === "assigned") {
          const hasObject = !!box.object_id;
          const isPlaced = box.position_type && box.position_type !== "none";
          if (!hasObject || isPlaced) return false;
        }
        if (filter === "placed" && (!box.position_type || box.position_type === "none")) return false;

        if (search) {
          const term = search.toLowerCase();
          const matchCode = box.qr_code?.toLowerCase().includes(term);
          const matchNumber = extractNumber(box).toString().includes(term);
          const matchObject = box.objects?.name?.toLowerCase().includes(term);
          if (!matchCode && !matchNumber && !matchObject) return false;
        }
        return true;
      })
      .sort((a, b) => extractNumber(a) - extractNumber(b));
  }, [boxes, filter, search]);

  // Nur Pool-Boxen (verfügbar für Zuweisung) - Flache Struktur
  const poolBoxes = useMemo(() => {
    return boxes
      .filter(box => !box.object_id)
      .sort((a, b) => extractNumber(a) - extractNumber(b));
  }, [boxes]);

  // Status-Badge - Direkter Zugriff auf Box-Properties
  const getStatusBadge = (box) => {
    if (!box) return { label: "Fehler", color: "red", Icon: ExclamationCircleIcon };
    if (!box.object_id) return { label: "Im Lager", color: "gray", Icon: ArchiveBoxIcon };
    if (!box.position_type || box.position_type === "none") {
      return { label: "Unplatziert", color: "yellow", Icon: ClockIcon };
    }
    if (box.position_type === "gps") return { label: "Auf Karte", color: "blue", Icon: MapPinIcon };
    if (box.position_type === "floorplan") return { label: "Auf Lageplan", color: "purple", Icon: Squares2X2Icon };
    return { label: "Aktiv", color: "green", Icon: CheckCircleIcon };
  };

  // ============================================
  // SCHNELLZUWEISUNG
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

    if (poolBoxes.length < count) {
      setAssignMessage({ 
        type: "error", 
        text: `Nicht genug Boxen vorhanden! Verfügbar: ${poolBoxes.length}, Angefordert: ${count}` 
      });
      return;
    }

    // ✅ Verwende QR-Codes statt Box-IDs - QR-Codes sind immer unique!
    const qrCodes = extractQrCodesFromPoolBoxes(poolBoxes, count);
    
    if (import.meta.env.DEV) {
      console.log("📦 Quick assign:", { count, available: poolBoxes.length, extracted: qrCodes.length });
      console.log("📦 First 5 pool boxes:", poolBoxes.slice(0, 5).map(b => ({ id: b.id, qr_code: b.qr_code, number: b.number })));
    }
    
    // Fallback auf box_ids wenn qr_codes leer ist
    let requestPayload;
    if (qrCodes.length > 0) {
      requestPayload = { 
        qr_codes: qrCodes,
        object_id: quickObjectId 
      };
      if (import.meta.env.DEV) {
        console.log("✅ Using qr_codes for bulk assign");
      }
    } else {
      // Fallback: verwende box_ids
      const boxIds = poolBoxes.slice(0, count).map(b => b.id).filter(id => id);
      if (import.meta.env.DEV) {
        console.log("⚠️ No valid QR codes, falling back to box_ids:", boxIds.length);
      }
      
      if (boxIds.length === 0) {
        console.error("❌ Keine gültigen Box-IDs oder QR-Codes gefunden");
        setAssignMessage({ type: "error", text: "Keine gültigen Boxen gefunden" });
        return;
      }
      
      requestPayload = {
        box_ids: boxIds,
        object_id: quickObjectId
      };
    }

    const assignCount = qrCodes.length || requestPayload.box_ids?.length || 0;
    
    if (assignCount < count) {
      console.warn(`⚠️ Nur ${assignCount} von ${count} Boxen haben gültige Identifikatoren`);
    }

    setAssigning(true);
    setAssignMessage({ type: "info", text: `Weise ${assignCount} Boxen zu...` });

    try {
      const res = await fetch(`${API}/boxes/bulk-assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestPayload)
      });

      if (res.ok) {
        const data = await res.json();
        const objName = objects.find(o => o.id == quickObjectId)?.name || "Objekt";
        
        setAssignMessage({ 
          type: "success", 
          text: `✓ ${data.count || assignCount} Boxen zu "${objName}" zugewiesen` 
        });
      } else {
        const err = await res.json();
        if (import.meta.env.DEV) {
          console.error("❌ Bulk assign error response:", err);
        }
        setAssignMessage({ 
          type: "error", 
          text: err.error || "Zuweisung fehlgeschlagen" 
        });
      }
    } catch (err) {
      console.error("Bulk assign error:", err);
      setAssignMessage({ 
        type: "error", 
        text: "Netzwerkfehler beim Zuweisen" 
      });
    } finally {
      setQuickCount("");
      loadData();
      setAssigning(false);
    }
  };

  // Einzelne Box zuweisen - Box-ID ist jetzt direkt verfügbar
  const handleSingleAssign = async (box, objectId) => {
    const boxId = box.id;
    if (!boxId || !objectId) {
      console.error("❌ Missing boxId or objectId:", { boxId, objectId });
      return;
    }

    console.log("📦 Single assign:", { boxId, qr_code: box.qr_code, objectId });
    
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
        console.log("✅ Box assigned successfully");
        loadData();
      } else {
        const err = await res.json();
        console.error("❌ Assign failed:", err);
        alert(err.error || "Fehler beim Zuweisen");
      }
    } catch (err) {
      console.error("❌ Network error:", err);
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
    <div className="box-pool-page">
      {/* Header */}
      <div className="box-pool-header">
        <h1 className="box-pool-title">
          <ArchiveBoxIcon className="title-icon" />
          Box-Lager
        </h1>
        <button 
          onClick={loadData} 
          disabled={loading}
          className={`refresh-btn ${loading ? 'loading' : ''}`}
        >
          <ArrowPathIcon className={`btn-icon ${loading ? 'spin' : ''}`} />
          {loading ? "Lädt..." : "Aktualisieren"}
        </button>
      </div>

      {/* Schnellzuweisung */}
      <div className="quick-assign-card">
        <div className="quick-assign-header">
          <RocketLaunchIcon className="quick-assign-icon" />
          <h2>Schnellzuweisung</h2>
        </div>
        
        <p className="quick-assign-desc">
          Weise mehrere Boxen auf einmal einem Objekt zu. Gib die gewünschte Anzahl ein 
          und wähle das Ziel-Objekt. Die Boxen werden automatisch aus dem Lager-Pool genommen 
          (kleinste Nummern zuerst).
        </p>

        <div className="quick-assign-form">
          {/* Anzahl Eingabe */}
          <div className="form-group">
            <label>Anzahl Boxen</label>
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
              className="count-input"
            />
          </div>

          {/* Objekt Dropdown */}
          <div className="form-group flex-grow">
            <label>Ziel-Objekt</label>
            <select
              value={quickObjectId}
              onChange={(e) => {
                setQuickObjectId(e.target.value);
                setAssignMessage(null);
              }}
              className="object-select"
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
            className={`assign-btn ${assigning ? 'loading' : ''} ${(!quickCount || !quickObjectId) ? 'disabled' : ''}`}
          >
            {assigning ? (
              <ArrowPathIcon className="btn-icon spin" />
            ) : (
              <ArrowRightIcon className="btn-icon" />
            )}
            {assigning ? "Zuweisen..." : "Zuweisen"}
          </button>
        </div>

        {/* Verfügbare Boxen Info */}
        <div className="pool-info">
          <CubeIcon className="pool-info-icon" />
          <span>
            <strong className="pool-count">{stats.pool}</strong> Boxen verfügbar im Lager
          </span>
        </div>

        {/* Feedback Message */}
        {assignMessage && (
          <div className={`assign-message ${assignMessage.type}`}>
            {assignMessage.text}
          </div>
        )}
      </div>

      {/* Stats-Karten */}
      <div className="stats-grid">
        <StatCard 
          label="Im Lager" 
          value={stats.pool} 
          color="gray" 
          active={filter === "pool"} 
          onClick={() => setFilter(filter === "pool" ? "all" : "pool")} 
          icon={ArchiveBoxIcon} 
        />
        <StatCard 
          label="Zugewiesen" 
          value={stats.assigned} 
          color="yellow" 
          active={filter === "assigned"} 
          onClick={() => setFilter(filter === "assigned" ? "all" : "assigned")} 
          icon={ClockIcon} 
        />
        <StatCard 
          label="Platziert" 
          value={stats.placed} 
          color="green" 
          active={filter === "placed"} 
          onClick={() => setFilter(filter === "placed" ? "all" : "placed")} 
          icon={CheckCircleIcon} 
        />
        <StatCard 
          label="Gesamt" 
          value={stats.total} 
          color="blue" 
          active={filter === "all"} 
          onClick={() => setFilter("all")} 
          icon={Squares2X2Icon} 
        />
      </div>

      {/* Suchfeld */}
      <div className="search-wrapper">
        <MagnifyingGlassIcon className="search-icon" />
        <input
          type="text"
          placeholder="Suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Box Liste */}
      {loading ? (
        <div className="loading-state">
          <ArrowPathIcon className="loading-spinner" />
          Laden...
        </div>
      ) : first10Boxes.length === 0 ? (
        <div className="empty-state">
          {boxes.length === 0 ? "Noch keine Boxen vorhanden." : "Keine Boxen gefunden"}
        </div>
      ) : (
        <>
          <div className="box-list">
            {first10Boxes.map(box => (
              <BoxRow 
                key={box.id} 
                box={box} 
                extractNumber={extractNumber}
                getStatusBadge={getStatusBadge}
                activeObjects={activeObjects}
                onAssign={handleSingleAssign}
                assigning={assigning}
                navigate={navigate}
              />
            ))}
          </div>

          {/* Weitere Boxen */}
          {remainingBoxes.length > 0 && (
            <details className="more-boxes">
              <summary className="more-boxes-summary">
                <ChevronDownIcon className="chevron-icon" />
                Weitere {remainingBoxes.length} Boxen anzeigen
              </summary>
              
              <div className="box-list">
                {remainingBoxes.map(box => (
                  <BoxRow 
                    key={box.id} 
                    box={box} 
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
    </div>
  );
}

// ============================================
// BOX ROW COMPONENT - Flache Box-Struktur
// ============================================
function BoxRow({ box, extractNumber, getStatusBadge, activeObjects, onAssign, assigning, navigate }) {
  const [showAssign, setShowAssign] = useState(false);
  const status = getStatusBadge(box);
  const StatusIcon = status.Icon;
  const num = extractNumber(box);

  return (
    <div className={`box-row status-${status.color}`}>
      {/* Nummer */}
      <div className={`box-number bg-${status.color}`}>
        <span className={num > 999 ? 'small' : ''}>
          {num < 999999 ? num : "?"}
        </span>
      </div>

      {/* Info */}
      <div className="box-info">
        <div className="box-qr">
          <QrCodeIcon className="qr-icon" />
          <span>{box.qr_code || box.id}</span>
        </div>
        <div className="box-object">
          {box.objects?.name || <span className="no-object">Kein Objekt</span>}
        </div>
      </div>

      {/* Status Badge */}
      <div className={`status-badge bg-${status.color}`}>
        <StatusIcon className="status-icon" />
        {status.label}
      </div>

      {/* Actions */}
      {!box.object_id ? (
        showAssign ? (
          <div className="assign-dropdown">
            <select
              autoFocus
              onChange={(e) => {
                if (e.target.value) {
                  onAssign(box, e.target.value);
                  setShowAssign(false);
                }
              }}
              onBlur={() => setTimeout(() => setShowAssign(false), 200)}
              disabled={assigning}
              className="assign-select"
            >
              <option value="">Objekt wählen...</option>
              {activeObjects.map(obj => (
                <option key={obj.id} value={obj.id}>{obj.name}</option>
              ))}
            </select>
            <button
              onClick={() => setShowAssign(false)}
              className="cancel-btn"
            >
              ✕
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setShowAssign(true)} 
            className="action-btn primary"
          >
            <ArrowRightIcon className="btn-icon" />
            Zuweisen
          </button>
        )
      ) : (
        <button 
          onClick={() => navigate(`/objects/${box.object_id}`)} 
          className="action-btn secondary"
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
      className={`stat-card color-${color} ${active ? 'active' : ''}`}
    >
      <div className="stat-header">
        <Icon className="stat-icon" />
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
    </button>
  );
}