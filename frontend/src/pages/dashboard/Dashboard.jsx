/* ============================================================
   TRAPMAP - DASHBOARD V3 INTERACTIVE
   - Klickbare KPI-Karten mit Detail-Ansichten
   - Objekt-Filter Dropdown
   - Überfällige Boxen (über Kontrollintervall)
   - Letzte 10 Scans
   - Sortierung: kleinste Box-Nummer zuerst
   ============================================================ */

import React, { useEffect, useState, useMemo } from "react";
import { 
  Package, BarChart3, AlertTriangle, Radio, 
  TrendingUp, CheckCircle, XCircle, Clock,
  ChevronDown, X, ArrowLeft, Calendar,
  Building2, Filter, ExternalLink, WifiOff
} from "lucide-react";
import { Link } from "react-router-dom";
import "./Dashboard.css";

// 🆕 Offline API statt axios
import { 
  getObjects, 
  getBoxes, 
  isOnline 
} from "../../utils/offlineAPI";
import { useOffline } from "../../context/OfflineContext";
import { getRecentScans as fetchRecentScans } from "../../api/dashboard";

const API = import.meta.env.VITE_API_URL;

export default function Dashboard() {
  // Data States
  const [stats, setStats] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [allBoxes, setAllBoxes] = useState([]);
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 🆕 Offline-Status
  const { isOffline } = useOffline();

  // UI States
  const [activeView, setActiveView] = useState("overview"); // overview, warnings, status, scans
  const [selectedStatus, setSelectedStatus] = useState(null); // green, yellow, orange, red
  const [selectedObject, setSelectedObject] = useState("all");
  const [objectDropdownOpen, setObjectDropdownOpen] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      // 🆕 Offline-fähiges Laden
      const [boxesResult, objectsResult, scansData] = await Promise.all([
        getBoxes().catch(err => {
          console.error("Boxes load error:", err);
          return { success: false, data: [] };
        }),
        getObjects().catch(err => {
          console.error("Objects load error:", err);
          return { success: false, data: [] };
        }),
        // Echte Scans vom Dashboard-Endpoint laden
        isOnline() ? fetchRecentScans().catch(err => {
          console.error("Scans load error:", err);
          return [];
        }) : Promise.resolve([])
      ]);

      const boxes = boxesResult.success ? boxesResult.data : [];
      const objects = objectsResult.success ? objectsResult.data : [];

      // Dashboard-Stats aus geladenen Daten berechnen
      const stats = calculateStats(boxes);
      // Echte Scans verwenden wenn vorhanden, sonst aus Boxen extrahieren
      const recentScans = (Array.isArray(scansData) && scansData.length > 0) 
        ? scansData 
        : extractRecentScans(boxes);

      console.log("📊 Dashboard geladen:", { 
        boxes: boxes.length, 
        objects: objects.length,
        scans: recentScans.length,
        offline: boxesResult.offline || objectsResult.offline 
      });

      setStats(stats);
      setRecentScans(recentScans);
      setAllBoxes(boxes);
      setObjects(objects);
    } catch (err) {
      console.error("Dashboard load error:", err);
      setError(err.message);
      setStats({ boxes: 0, scansToday: 0, warnings: 0, green: 0, yellow: 0, orange: 0, red: 0 });
      setRecentScans([]);
      setAllBoxes([]);
      setObjects([]);
    } finally {
      setLoading(false);
    }
  }

  // 🆕 Dashboard-Statistiken aus Boxen berechnen
  function calculateStats(boxes) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let green = 0, yellow = 0, orange = 0, red = 0;
    let scansToday = 0;
    let warnings = 0;

    boxes.forEach(box => {
      // Status-Farben zählen
      switch (box.current_status) {
        case 'green': green++; break;
        case 'yellow': yellow++; break;
        case 'orange': orange++; break;
        case 'red': red++; break;
      }

      // Scans heute zählen
      if (box.last_scan_at) {
        const scanDate = new Date(box.last_scan_at);
        if (scanDate >= todayStart) scansToday++;
      }

      // Warnungen (überfällige Boxen)
      if (box.last_scan_at && box.status !== 'archived') {
        const lastScan = new Date(box.last_scan_at);
        const daysSince = Math.floor((now - lastScan) / (1000 * 60 * 60 * 24));
        if (daysSince > 30) warnings++; // Über 30 Tage = Warnung
      }
    });

    return {
      boxes: boxes.length,
      scansToday,
      warnings,
      green,
      yellow,
      orange,
      red
    };
  }

  // 🆕 Letzte Scans aus Boxen extrahieren
  function extractRecentScans(boxes) {
    return boxes
      .filter(box => box.last_scan_at)
      .sort((a, b) => new Date(b.last_scan_at) - new Date(a.last_scan_at))
      .slice(0, 10)
      .map(box => ({
        id: `box-${box.id}`,
        box_id: box.id,
        box_name: box.name || `Box ${box.id}`,
        box_qr_code: box.qr_code,
        object_id: box.object_id,
        object_name: box.object_name,
        created_at: box.last_scan_at,
        scanned_at: box.last_scan_at,
        status: box.current_status,
        message: box.notes || '',
        technician_name: box.last_scan_user || 'System',
        user: { email: box.last_scan_user || 'System' }
      }));
  }

  // ============================================================
  // BERECHNUNGEN
  // ============================================================

  // Box-Nummer aus QR-Code extrahieren (für Sortierung)
  const getBoxNumber = (box) => {
    const qr = box.qr_code || box.name || "";
    const match = qr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 999999;
  };

  // Sortiere Boxen nach Nummer (kleinste zuerst)
  const sortByNumber = (boxes) => {
    return [...boxes].sort((a, b) => getBoxNumber(a) - getBoxNumber(b));
  };

  // Überfällige Boxen berechnen
  const overdueBoxes = useMemo(() => {
    const now = new Date();
    return allBoxes.filter(box => {
      if (!box.last_scan || box.status === 'archived') return false;
      
      const lastScan = new Date(box.last_scan);
      const daysSince = Math.floor((now - lastScan) / (1000 * 60 * 60 * 24));
      
      // Check gegen Kontrollintervall
      if (box.control_interval_type === 'range') {
        return daysSince > (box.control_interval_max || 30);
      } else {
        return daysSince > (box.control_interval_days || 30);
      }
    });
  }, [allBoxes]);

  // Boxen nach Status filtern (current_status ist der Scan-Status)
  const boxesByStatus = useMemo(() => {
    return {
      green: allBoxes.filter(b => b.current_status === 'green'),
      yellow: allBoxes.filter(b => b.current_status === 'yellow'),
      orange: allBoxes.filter(b => b.current_status === 'orange'),
      red: allBoxes.filter(b => b.current_status === 'red'),
    };
  }, [allBoxes]);

  // Objekt-Filter anwenden
  const filterByObject = (items, objectField = 'object_id') => {
    if (selectedObject === 'all') return items;
    return items.filter(item => item[objectField] === selectedObject);
  };

  // Objekt-Name finden
  const getObjectName = (objectId) => {
    const obj = objects.find(o => o.id === objectId);
    return obj?.name || 'Unbekannt';
  };

  // Tage seit letztem Scan
  const getDaysSinceLastScan = (lastScanAt) => {
    if (!lastScanAt) return null;
    const now = new Date();
    const lastScan = new Date(lastScanAt);
    return Math.floor((now - lastScan) / (1000 * 60 * 60 * 24));
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return <DashboardSkeleton />;
  }

  const safeStats = stats || {};

  return (
    <div className="dashboard">
      {/* Header mit Objekt-Filter */}
      <div className="dashboard-header">
        <div className="header-left">
          {activeView !== "overview" && (
            <button className="back-btn" onClick={() => { setActiveView("overview"); setSelectedStatus(null); }}>
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="dashboard-title">
              {activeView === "overview" && "Dashboard"}
              {activeView === "warnings" && "Überfällige Boxen"}
              {activeView === "status" && `Status: ${getStatusLabel(selectedStatus)}`}
              {activeView === "scans" && "Letzte Scans"}
              {activeView === "boxes" && "Alle Boxen"}
            </h1>
            <p className="dashboard-subtitle">
              {activeView === "overview" && "Übersicht über alle Aktivitäten"}
              {activeView === "warnings" && `${filterByObject(sortByNumber(overdueBoxes)).length} Boxen über Kontrollintervall`}
              {activeView === "status" && `${filterByObject(sortByNumber(boxesByStatus[selectedStatus] || [])).length} Boxen mit diesem Status`}
              {activeView === "scans" && "Die letzten 10 Kontrollen"}
              {activeView === "boxes" && `${filterByObject(sortByNumber(allBoxes)).length} aktive Boxen`}
            </p>
          </div>
        </div>

        <div className="header-right-section">
          {/* 🆕 Offline-Indikator */}
          {isOffline && (
            <div className="offline-indicator">
              <WifiOff size={16} />
              <span>Offline</span>
            </div>
          )}

          {/* Objekt-Filter */}
          <div className="object-filter">
            <button 
              className="object-filter-btn"
            onClick={() => setObjectDropdownOpen(!objectDropdownOpen)}
          >
            <Building2 size={18} />
            <span>{selectedObject === 'all' ? 'Alle Objekte' : getObjectName(selectedObject)}</span>
            <ChevronDown size={16} className={objectDropdownOpen ? 'rotated' : ''} />
          </button>

          {objectDropdownOpen && (
            <div className="object-dropdown">
              <div 
                className={`dropdown-item ${selectedObject === 'all' ? 'active' : ''}`}
                onClick={() => { setSelectedObject('all'); setObjectDropdownOpen(false); }}
              >
                <Filter size={16} />
                Alle Objekte
              </div>
              {objects.map(obj => (
                <div 
                  key={obj.id}
                  className={`dropdown-item ${selectedObject === obj.id ? 'active' : ''}`}
                  onClick={() => { setSelectedObject(obj.id); setObjectDropdownOpen(false); }}
                >
                  <Building2 size={16} />
                  {obj.name}
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          ⚠️ Verbindungsproblem: {error}
        </div>
      )}

      {/* ============================================================
          OVERVIEW - Klickbare KPIs
          ============================================================ */}
      {activeView === "overview" && (
        <>
          {/* KPI Cards - Klickbar! */}
          <div className="kpi-grid">
            <KPICard
              title="Aktive Boxen"
              value={filterByObject(allBoxes).length}
              icon={Package}
              color="indigo"
              onClick={() => setActiveView("boxes")}
              clickable
            />
            <KPICard
              title="Scans heute"
              value={safeStats.scansToday || 0}
              icon={BarChart3}
              color="green"
              onClick={() => setActiveView("scans")}
              clickable
            />
            <KPICard
              title="Überfällig"
              value={filterByObject(overdueBoxes).length}
              icon={AlertTriangle}
              color="yellow"
              onClick={() => setActiveView("warnings")}
              clickable
              highlight={filterByObject(overdueBoxes).length > 0}
            />
            <KPICard
              title="Letzte Sync"
              value={formatTime(safeStats.lastSync)}
              icon={Radio}
              color="purple"
              isText
            />
          </div>

          {/* Status Cards - Klickbar! */}
          <div className="status-section">
            <h2 className="section-title">Status Übersicht</h2>
            <div className="status-grid">
              <StatusCard 
                label="OK" 
                count={filterByObject(boxesByStatus.green).length} 
                color="green" 
                icon={CheckCircle}
                onClick={() => { setSelectedStatus('green'); setActiveView('status'); }}
                clickable
              />
              <StatusCard 
                label="Auffällig" 
                count={filterByObject(boxesByStatus.yellow).length} 
                color="yellow" 
                icon={AlertTriangle}
                onClick={() => { setSelectedStatus('yellow'); setActiveView('status'); }}
                clickable
              />
              <StatusCard 
                label="Erhöht" 
                count={filterByObject(boxesByStatus.orange).length} 
                color="orange" 
                icon={TrendingUp}
                onClick={() => { setSelectedStatus('orange'); setActiveView('status'); }}
                clickable
              />
              <StatusCard 
                label="Befall" 
                count={filterByObject(boxesByStatus.red).length} 
                color="red" 
                icon={XCircle}
                onClick={() => { setSelectedStatus('red'); setActiveView('status'); }}
                clickable
              />
            </div>
          </div>

          {/* Recent Scans Preview */}
          <RecentScansSection 
            scans={filterByObject(recentScans, 'object_id').slice(0, 5)} 
            objects={objects}
            onViewAll={() => setActiveView("scans")}
          />
        </>
      )}

      {/* ============================================================
          WARNINGS - Überfällige Boxen
          ============================================================ */}
      {activeView === "warnings" && (
        <BoxList 
          boxes={filterByObject(sortByNumber(overdueBoxes))}
          objects={objects}
          showDaysOverdue
          emptyMessage="Keine überfälligen Boxen! 🎉"
        />
      )}

      {/* ============================================================
          STATUS - Boxen nach Status
          ============================================================ */}
      {activeView === "status" && selectedStatus && (
        <BoxList 
          boxes={filterByObject(sortByNumber(boxesByStatus[selectedStatus] || []))}
          objects={objects}
          emptyMessage={`Keine Boxen mit Status "${getStatusLabel(selectedStatus)}"`}
        />
      )}

      {/* ============================================================
          SCANS - Letzte 10 Scans
          ============================================================ */}
      {activeView === "scans" && (
        <ScansList 
          scans={filterByObject(recentScans, 'object_id').slice(0, 10)}
          objects={objects}
        />
      )}

      {/* ============================================================
          BOXES - Alle Boxen
          ============================================================ */}
      {activeView === "boxes" && (
        <BoxList 
          boxes={filterByObject(sortByNumber(allBoxes))}
          objects={objects}
          emptyMessage="Keine Boxen gefunden"
        />
      )}
    </div>
  );
}

/* ============================================================
   KPI CARD (Klickbar)
   ============================================================ */
function KPICard({ title, value, icon: Icon, color, trend, isText, onClick, clickable, highlight }) {
  const colorClasses = {
    indigo: "kpi-indigo",
    green: "kpi-green",
    yellow: "kpi-yellow",
    purple: "kpi-purple"
  };

  return (
    <div 
      className={`kpi-card ${colorClasses[color]} ${clickable ? 'clickable' : ''} ${highlight ? 'highlight' : ''}`}
      onClick={clickable ? onClick : undefined}
    >
      <div className="kpi-icon-wrapper">
        <Icon className="kpi-icon" />
      </div>
      <div className="kpi-content">
        <div className={`kpi-value ${isText ? 'text' : ''}`}>{value}</div>
        <div className="kpi-label">{title}</div>
        {trend && <div className="kpi-trend">{trend}</div>}
      </div>
      {clickable && <ChevronDown size={16} className="kpi-arrow" style={{ transform: 'rotate(-90deg)' }} />}
    </div>
  );
}

/* ============================================================
   STATUS CARD (Klickbar)
   ============================================================ */
function StatusCard({ label, count, color, icon: Icon, onClick, clickable }) {
  return (
    <div 
      className={`status-card status-${color} ${clickable ? 'clickable' : ''}`}
      onClick={clickable ? onClick : undefined}
    >
      <div className="status-icon-wrapper">
        <Icon className="status-icon" />
      </div>
      <div className="status-count">{count}</div>
      <div className="status-label">{label}</div>
      {clickable && <div className="status-click-hint">Klicken für Details</div>}
    </div>
  );
}

/* ============================================================
   BOX LIST (für Warnings, Status, Alle Boxen)
   ============================================================ */
function BoxList({ boxes, objects, showDaysOverdue, emptyMessage }) {
  const getObjectName = (objectId) => {
    const obj = objects.find(o => o.id === objectId);
    return obj?.name || 'Unbekannt';
  };

  const getDaysOverdue = (box) => {
    if (!box.last_scan) return null;
    const now = new Date();
    const lastScan = new Date(box.last_scan);
    const daysSince = Math.floor((now - lastScan) / (1000 * 60 * 60 * 24));
    
    const maxDays = box.control_interval_type === 'range' 
      ? (box.control_interval_max || 30)
      : (box.control_interval_days || 30);
    
    return daysSince - maxDays;
  };

  if (boxes.length === 0) {
    return (
      <div className="empty-state">
        <CheckCircle size={48} />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="box-list">
      {boxes.map(box => {
        const daysOverdue = showDaysOverdue ? getDaysOverdue(box) : null;
        
        return (
          <Link 
            key={box.id} 
            to={`/boxes?highlight=${box.id}`}
            className="box-list-item"
          >
            <div className="box-left">
              <div className={`box-status-dot status-${box.current_status || box.status || 'gray'}`} />
              <div className="box-info">
                <div className="box-name">{box.qr_code || box.name || `Box ${box.id}`}</div>
                <div className="box-object">{getObjectName(box.object_id)}</div>
              </div>
            </div>
            <div className="box-right">
              {showDaysOverdue && daysOverdue !== null && daysOverdue > 0 && (
                <div className="days-overdue">
                  <Clock size={14} />
                  <span>{daysOverdue} Tage überfällig</span>
                </div>
              )}
              {box.last_scan && (
                <div className="last-scan">
                  <Calendar size={14} />
                  <span>Letzter Scan: {formatDate(box.last_scan)}</span>
                </div>
              )}
              <ExternalLink size={16} className="link-icon" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ============================================================
   SCANS LIST
   ============================================================ */
function ScansList({ scans, objects }) {
  const getObjectName = (objectId) => {
    const obj = objects.find(o => o.id === objectId);
    return obj?.name || 'Unbekannt';
  };

  if (scans.length === 0) {
    return (
      <div className="empty-state">
        <BarChart3 size={48} />
        <p>Keine Scans vorhanden</p>
      </div>
    );
  }

  return (
    <div className="scans-list-detail">
      {scans.map((scan, index) => {
        const scanDate = scan.created_at ? new Date(scan.created_at) : null;
        const dateStr = scanDate ? scanDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
        const timeStr = scanDate ? scanDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
        return (
          <div key={scan.id || index} className="scan-detail-item">
            <div className="scan-number">{index + 1}</div>
            <div className={`scan-status-dot status-${scan.status || 'gray'}`} />
            <div className="scan-info">
              <div className="scan-box-name">
                {scan.box_qr_code || scan.qr_code || 'Unbekannt'}
              </div>
              <div className="scan-object">{scan.object_name || getObjectName(scan.object_id)}</div>
              <div className="scan-message">{scan.message || `Status: ${scan.status}`}</div>
            </div>
            <div className="scan-meta">
              <div className="scan-date">{dateStr} {timeStr}</div>
              <div className="scan-tech">{scan.technician_name || 'Unbekannt'}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   RECENT SCANS SECTION (Preview mit "Alle anzeigen")
   ============================================================ */
function RecentScansSection({ scans, objects, onViewAll }) {
  if (!scans || scans.length === 0) {
    return (
      <div className="scans-section">
        <div className="section-header">
          <h2 className="section-title">Letzte Scans</h2>
        </div>
        <div className="empty-state small">
          <BarChart3 size={32} />
          <p>Noch keine Scans vorhanden</p>
        </div>
      </div>
    );
  }

  // Gruppiere nach Objekt
  const groupedScans = scans.reduce((acc, scan) => {
    const objName = scan.object_name || "Sonstiges";
    if (!acc[objName]) acc[objName] = [];
    acc[objName].push(scan);
    return acc;
  }, {});

  return (
    <div className="scans-section">
      <div className="section-header">
        <h2 className="section-title">Letzte Scans</h2>
        <button className="view-all-btn" onClick={onViewAll}>
          Alle anzeigen
          <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
        </button>
      </div>

      <div className="scans-preview">
        {Object.entries(groupedScans).map(([objectName, objScans]) => (
          <div key={objectName} className="scan-group">
            <div className="scan-group-header">
              <div className="group-dot" />
              <span className="group-title">{objectName}</span>
              <div className="group-line" />
              <span className="group-count">{objScans.length} Scans</span>
            </div>
            <div className="scan-items">
              {objScans.slice(0, 3).map(scan => {
                const scanDate = scan.created_at ? new Date(scan.created_at) : null;
                const dateStr = scanDate ? scanDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
                const timeStr = scanDate ? scanDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
                return (
                  <div key={scan.id} className="scan-item">
                    <div className="scan-left">
                      <div className={`scan-dot status-${scan.status || 'gray'}`} />
                      <div className="scan-info">
                        <div className="scan-box">
                          {scan.box_qr_code || scan.qr_code || 'Unbekannt'}
                        </div>
                        <div className="scan-message">{scan.message || `Status: ${scan.status}`}</div>
                      </div>
                    </div>
                    <div className="scan-right">
                      <div className="scan-date">{dateStr} {timeStr}</div>
                      <div className="scan-tech">{scan.technician_name || 'Unbekannt'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   SKELETON
   ============================================================ */
function DashboardSkeleton() {
  return (
    <div className="dashboard skeleton">
      <div className="skeleton-header" />
      <div className="kpi-grid">
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-card" />)}
      </div>
      <div className="skeleton-section" />
      <div className="skeleton-section large" />
    </div>
  );
}

/* ============================================================
   HELPERS
   ============================================================ */
function formatTime(ts) {
  if (!ts) return "Keine Daten";
  const diff = (Date.now() - new Date(ts).getTime()) / 60000;
  if (diff < 1) return "Gerade eben";
  if (diff < 60) return `vor ${Math.round(diff)} Min`;
  const hours = Math.round(diff / 60);
  if (hours < 24) return `vor ${hours} Std`;
  return `vor ${Math.round(hours / 24)} Tagen`;
}

function timeAgo(ts) {
  if (!ts) return "";
  const diff = (Date.now() - new Date(ts).getTime()) / 60000;
  if (diff < 1) return "Gerade eben";
  if (diff < 60) return `vor ${Math.round(diff)} Min`;
  const h = Math.round(diff / 60);
  if (h < 24) return `vor ${h} Std`;
  return `vor ${Math.round(h / 24)} Tagen`;
}

function formatDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString('de-DE', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

function getStatusLabel(status) {
  const labels = {
    green: 'OK',
    yellow: 'Auffällig',
    orange: 'Erhöht',
    red: 'Befall'
  };
  return labels[status] || status;
}