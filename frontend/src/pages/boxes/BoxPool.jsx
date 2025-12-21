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

  const [allBoxes, setAllBoxes] = useState([]); // ALL boxes for stats calculation
  const [poolBoxes, setPoolBoxes] = useState([]); // Only pool boxes for quick assignment
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
      // Fetch ALL boxes for stats + Pool boxes for assignment + Objects
      const [allBoxesRes, poolBoxesRes, objRes] = await Promise.all([
        fetch(`${API}/boxes`, { headers: { Authorization: `Bearer ${token}` } }), // ALL boxes for stats
        fetch(`${API}/boxes/pool`, { headers: { Authorization: `Bearer ${token}` } }), // Pool boxes for assignment
        fetch(`${API}/objects`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (allBoxesRes.ok) {
        const data = await allBoxesRes.json();
        console.log("📦 All boxes loaded:", data?.length || 0, "boxes");
        setAllBoxes(data || []);
      }

      if (poolBoxesRes.ok) {
        const data = await poolBoxesRes.json();
        console.log("📦 Pool boxes loaded:", data?.length || 0, "boxes");
        // Debug: Show first box structure
        if (data && data.length > 0) {
          console.log("📦 First pool box structure:", {
            id: data[0].id,
            qr_code: data[0].qr_code,
            number: data[0].number,
            object_id: data[0].object_id
          });
        }
        setPoolBoxes(data || []);
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

  // Stats berechnen - Now using allBoxes to get correct counts
  const stats = useMemo(() => ({
    pool: allBoxes.filter((box) => !box.object_id).length,
    assigned: allBoxes.filter((box) => box.object_id && (!box.position_type || box.position_type === "none")).length,
    placed: allBoxes.filter((box) => box.position_type && box.position_type !== "none").length,
    total: allBoxes.length
  }), [allBoxes]);

  // Gefilterte & sortierte Boxen - Use appropriate data source based on filter
  const filteredBoxes = useMemo(() => {
    let sourceBoxes = allBoxes;
    
    // For pool filter, use poolBoxes directly (already filtered by backend)
    if (filter === "pool") {
      sourceBoxes = poolBoxes;
    }
    
    return sourceBoxes
      .filter((box) => {
        // Apply filter logic (pool boxes don't need additional filtering)
        if (filter === "pool") return true; // Already filtered by backend
        if (filter === "assigned") {
          const hasObject = !!box.object_id;
          const isPlaced = box.position_type && box.position_type !== "none";
          if (!hasObject || isPlaced) return false;
        }
        if (filter === "placed" && (!box.position_type || box.position_type === "none")) return false;

        // Apply search filter
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
  }, [allBoxes, poolBoxes, filter, search]);

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

    // ========================================
    // NEUER CODE: Robustere Extraktion
    // ========================================
    
    // Hole die ersten 'count' Boxen, sortiert nach Nummer
    const selectedBoxes = poolBoxes.slice(0, count);
    
    console.log("📦 Selected boxes for assignment:", selectedBoxes.map(b => ({
      id: b.id,
      qr_code: b.qr_code,
      number: b.number
    })));
    
    // Extrahiere QR-Codes (bevorzugt) oder Box-IDs (Fallback)
    const qrCodes = selectedBoxes
      .map(box => box.qr_code)
      .filter(qr => qr && typeof qr === 'string' && qr.trim().length > 0);
    
    const boxIds = selectedBoxes
      .map(box => box.id)
      .filter(id => id !== null && id !== undefined);
    
    console.log("📦 Extracted identifiers:", {
      qr_codes: qrCodes,
      box_ids: boxIds,
      object_id: quickObjectId
    });
    
    // Baue Payload - bevorzuge QR-Codes, Fallback auf Box-IDs
    let payload;
    if (qrCodes.length > 0) {
      payload = { 
        qr_codes: qrCodes,
        object_id: parseInt(quickObjectId) // Konvertiere zu Integer!
      };
      console.log("✅ Using QR codes for assignment");
    } else if (boxIds.length > 0) {
      payload = { 
        box_ids: boxIds,
        object_id: parseInt(quickObjectId) // Konvertiere zu Integer!
      };
      console.log("✅ Using Box IDs for assignment");
    } else {
      console.error("❌ Keine gültigen Identifikatoren gefunden!");
      setAssignMessage({ type: "error", text: "Keine gültigen Boxen gefunden" });
      return;
    }
    
    console.log("📦 Final payload:", JSON.stringify(payload));

    setAssigning(true);
    setAssignMessage({ type: "info", text: `Weise ${payload.qr_codes?.length || payload.box_ids?.length} Boxen zu...` });

    try {
      const res = await fetch(`${API}/boxes/bulk-assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const responseData = await res.json();
      console.log("📦 API Response:", responseData);

      if (res.ok) {
        const objName = objects.find(o => o.id == quickObjectId)?.name || "Objekt";
        const assignedCount = responseData.count || 0;
        const skippedCount = responseData.skipped || 0;
        
        // Build user-friendly message
        let message;
        if (skippedCount > 0) {
          message = `✓ ${assignedCount} von ${assignedCount + skippedCount} Boxen zu "${objName}" zugewiesen (${skippedCount} bereits vergeben)`;
        } else {
          message = `✓ ${assignedCount} Boxen zu "${objName}" zugewiesen`;
        }
        
        setAssignMessage({ 
          type: "success", 
          text: message
        });
      } else {
        console.error("❌ Bulk assign failed:", responseData);
        setAssignMessage({ 
          type: "error", 
          text: responseData.error || "Zuweisung fehlgeschlagen" 
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
      // Always reload data after assignment attempt to reflect current state
      try {
        await loadData();
      } catch (error) {
        console.error("Failed to reload data after assignment:", error);
      }
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
          {allBoxes.length === 0 ? "Noch keine Boxen vorhanden." : "Keine Boxen gefunden"}
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