/* ============================================================
   TRAPMAP - FLOOR PLAN EDITOR V9
   
   ÄNDERUNGEN V9:
   - Sidebar EXAKT wie Maps (CollapsibleBoxSection, BoxListItem)
   - Mobile Bottom Sheet wie Maps
   - Pinch-Zoom korrigiert (funktioniert jetzt!)
   - Box-Marker wie Maps
   - URL-Parameter: fp=<id> für direkten Lageplan
   - CSS-Klassen von Maps.css nutzen
   ============================================================ */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { 
  Upload, Plus, Trash2, Grid3X3, X, ZoomIn, ZoomOut, 
  Package, ChevronLeft, ChevronRight, Maximize2,
  Circle, Square, ArrowRight, Pencil, Eraser, RotateCcw,
  Hand, MousePointer, Save, Settings, LayoutGrid, Check, 
  Clock, ChevronDown, Map, Building2, Navigation, Search
} from "lucide-react";

import BoxScanDialog from "./BoxScanDialog";
import BoxEditDialog from "../pages/maps/BoxEditDialog";

// Helpers importieren
import { calculateDisplayNumbers, getShortQr, isGpsBox } from "./boxes/BoxHelpers";
import { getBoxShortLabel, getBoxLabel } from "../utils/boxUtils";

// Maps CSS importieren für einheitliche Styles!
import "../pages/maps/Maps.css";

const API = import.meta.env.VITE_API_URL;

/* ============================================================
   MOBILE DETECTION
   ============================================================ */
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768 || 'ontouchstart' in window;
};

/* ============================================================
   STATUS HELPERS
   ============================================================ */
const STATUS_COLORS = {
  green: { bg: "#10b981", label: "OK" },
  yellow: { bg: "#eab308", label: "Auffällig" },
  orange: { bg: "#f97316", label: "Erhöht" },
  red: { bg: "#ef4444", label: "Befall" },
  gray: { bg: "#6b7280", label: "Nicht geprüft" }
};

const getStatusColor = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "green" || s === "ok") return "green";
  if (s === "yellow" || s.includes("gering")) return "yellow";
  if (s === "orange" || s.includes("auffällig")) return "orange";
  if (s === "red" || s.includes("befall")) return "red";
  return "gray";
};

/* ============================================================
   GRID PRESETS
   ============================================================ */
const GRID_PRESETS = {
  coarse: { cols: 10, rows: 10, name: "Grob (10×10)", icon: "🏭" },
  medium: { cols: 20, rows: 20, name: "Mittel (20×20)", icon: "🏢" },
  fine: { cols: 26, rows: 30, name: "Fein (A-Z, 1-30)", icon: "🏠" },
  very_fine: { cols: 52, rows: 50, name: "Sehr fein (AA-AZ, 1-50)", icon: "📍" }
};

const getColLabel = (index) => {
  if (index < 26) return String.fromCharCode(65 + index);
  return 'A' + String.fromCharCode(65 + (index - 26));
};

/* ============================================================
   COLLAPSIBLE BOX SECTION - Wie Maps!
   ============================================================ */
function CollapsibleBoxSection({ title, icon, count, variant = "default", defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const variantClasses = {
    default: "",
    warning: "variant-warning",
    map: "variant-map",
    floorplan: "variant-floorplan"
  };

  return (
    <div className={`collapsible-section ${variantClasses[variant]} ${isOpen ? 'open' : 'closed'}`}>
      <button className="collapsible-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="header-left">
          {icon}
          <span className="header-title">{title}</span>
        </div>
        <div className="header-right">
          <span className="header-count">{count}</span>
          <ChevronDown size={16} className={`chevron ${isOpen ? 'rotated' : ''}`} />
        </div>
      </button>
      {isOpen && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   BOX LIST ITEM - Wie Maps!
   ============================================================ */
function BoxListItem({ box, onClick, isFloorplan = false, isUnplaced = false, isGps = false, isSelected = false, onDragStart }) {
  const formatLastScan = (lastScan) => {
    if (!lastScan) return "Nie";
    const date = new Date(lastScan);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Heute";
    if (diffDays === 1) return "Gestern";
    if (diffDays < 7) return `${diffDays}d`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  const displayNum = box.display_number || '?';
  const shortQr = getShortQr(box);
  const statusColor = getStatusColor(box.current_status || box.status);
  const isMobile = isMobileDevice();
  
  // Label mit short_code oder Fallback
  const boxLabel = box.short_code ? getBoxShortLabel(box) : `#${displayNum}`;
  const boxName = box.box_name || box.box_type_name || 'Kein Typ';
  
  // Label mit short_code oder Fallback
  const boxLabel = box.short_code ? getBoxShortLabel(box) : `#${displayNum}`;
  const boxName = box.box_name || box.box_type_name || 'Kein Typ';

  // Unplaced Style
  if (isUnplaced) {
    return (
      <div 
        className={`box-item unplaced ${isSelected ? 'selected' : ''}`}
        draggable={!isMobile}
        onDragStart={onDragStart}
        onClick={onClick}
        style={{
          cursor: isMobile ? 'pointer' : 'grab',
          background: isSelected ? 'rgba(16, 185, 129, 0.15)' : undefined,
          borderColor: isSelected ? '#10b981' : undefined
        }}
      >
        <span className={`box-icon ${statusColor}`}>{box.short_code || displayNum}</span>
        <div className="box-info">
          <h4>{boxLabel} {box.box_name && <span style={{color: '#9ca3af', fontSize: '11px'}}>({box.box_name})</span>}</h4>
          <p style={{color: '#6b7280', fontSize: '10px', fontFamily: 'monospace'}}>{box.qr_code}</p>
        </div>
        <span className="drag-hint" style={{ color: isSelected ? '#10b981' : undefined }}>
          {isMobile 
            ? (isSelected ? '✓ Plan tippen' : '→ Antippen') 
            : '⇢ Ziehen'}
        </span>
      </div>
    );
  }

  // GPS Box Style
  if (isGps) {
    return (
      <div className={`box-item-detailed gps group`} onClick={onClick}>
        <div className="box-item-main">
          <div className={`box-number-badge ${statusColor}`}>
            {box.short_code || displayNum}
          </div>
          <div className="box-item-info">
            <div className="box-item-name">
              <span>{boxLabel}</span>
              {box.box_name && <span style={{color: '#9ca3af', fontSize: '11px', marginLeft: '6px'}}>{box.box_name}</span>}
              <span className="location-badge">📍 Maps</span>
            </div>
            <div className="box-item-meta">
              <span style={{color: '#6b7280', fontSize: '10px', fontFamily: 'monospace', marginRight: '8px'}}>{box.qr_code}</span>
              <span className="last-scan">
                <Clock size={11} />
                {formatLastScan(box.last_scan)}
              </span>
            </div>
          </div>
        </div>
        <div className="box-item-right">
          <span className={`status-indicator ${statusColor}`} />
          <ChevronRight size={14} className="item-chevron" />
        </div>
      </div>
    );
  }

  // Placed Box Style
  return (
    <div className={`box-item-detailed ${isFloorplan ? 'floorplan' : ''} group`} onClick={onClick}>
      <div className="box-item-main">
        <div className={`box-number-badge ${statusColor}`}>
          {box.short_code || displayNum}
        </div>
        <div className="box-item-info">
          <div className="box-item-name">
            <span>{boxLabel}</span>
            {box.box_name && <span style={{color: '#9ca3af', fontSize: '11px', marginLeft: '6px'}}>{box.box_name}</span>}
            {box.grid_position && (
              <span className="grid-badge">{box.grid_position}</span>
            )}
          </div>
          <div className="box-item-meta">
            <span style={{color: '#6b7280', fontSize: '10px', fontFamily: 'monospace', marginRight: '8px'}}>{box.qr_code}</span>
            <span className="last-scan">
              <Clock size={11} />
              {formatLastScan(box.last_scan)}
            </span>
          </div>
        </div>
      </div>
      <div className="box-item-right">
        <span className={`status-indicator ${statusColor}`} />
        <ChevronRight size={14} className="item-chevron" />
      </div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function FloorPlanEditor({ objectId, objectName, openBoxIdProp }) {
  // URL-Parameter
  const [searchParams] = useSearchParams();
  const openBoxId = openBoxIdProp || searchParams.get("openBox");
  const shouldPlaceBox = searchParams.get("place") === "true" || searchParams.get("placeBox");
  const urlFloorPlanId = searchParams.get("fp"); // Direkt zu diesem Lageplan!

  // Data State
  const [floorPlans, setFloorPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [boxesOnPlan, setBoxesOnPlan] = useState([]);
  const [unplacedBoxes, setUnplacedBoxes] = useState([]);
  const [gpsBoxes, setGpsBoxes] = useState([]);
  const [boxTypes, setBoxTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // URL-Parameter State (um mehrfache Ausführung zu verhindern)
  const [urlParamsProcessed, setUrlParamsProcessed] = useState(false);

  // View State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Grid
  const [showGrid, setShowGrid] = useState(true);
  const [hoveredCell, setHoveredCell] = useState(null);
  
  // Mode
  const [mode, setMode] = useState("view");
  const [drawTool, setDrawTool] = useState(null);
  
  // Mobile
  const [isMobile, setIsMobile] = useState(isMobileDevice());
  const [sheetState, setSheetState] = useState('half'); // 'peek', 'half', 'full'
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Dialogs
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showGridSetup, setShowGridSetup] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createPosition, setCreatePosition] = useState({ x: 0, y: 0, gridPosition: "" });
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [selectedBox, setSelectedBox] = useState(null);
  const [showGridSettings, setShowGridSettings] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  
  // Drag & Place
  const [draggedBox, setDraggedBox] = useState(null);
  const [relocatingBox, setRelocatingBox] = useState(null);
  const [boxToPlace, setBoxToPlace] = useState(null); // Mobile: ausgewählte Box
  
  // Annotations
  const [annotations, setAnnotations] = useState([]);
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [annotationColor, setAnnotationColor] = useState("#ef4444");
  
  // UI
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Refs
  const containerRef = useRef(null);
  const planRef = useRef(null);
  const sheetRef = useRef(null);
  const lastPinchDistance = useRef(0);
  const lastPinchCenter = useRef({ x: 0, y: 0 });
  const initialPinchPan = useRef({ x: 0, y: 0 });
  
  const token = localStorage.getItem("trapmap_token");
  const headers = { Authorization: `Bearer ${token}` };

  // Grid-Konfiguration
  const gridConfig = selectedPlan ? {
    cols: selectedPlan.grid_cols || 20,
    rows: selectedPlan.grid_rows || 20
  } : { cols: 20, rows: 20 };

  // Resize Handler
  useEffect(() => {
    const handleResize = () => setIsMobile(isMobileDevice());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* ============================================================
     TOUCH/ZOOM HANDLERS - KORRIGIERT!
     ============================================================ */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Mausrad Zoom
    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      setZoom(prev => Math.max(0.3, Math.min(5, prev + delta)));
    };

    // Touch Distance
    const getTouchDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (touches) => ({
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    });

    const handleTouchStart = (e) => {
      // ZWEI Finger = Pinch Zoom
      if (e.touches.length === 2) {
        e.preventDefault();
        lastPinchDistance.current = getTouchDistance(e.touches);
        lastPinchCenter.current = getTouchCenter(e.touches);
        initialPinchPan.current = { x: pan.x, y: pan.y };
      } 
      // EIN Finger = Pan (nur wenn NICHT im Place-Modus)
      else if (e.touches.length === 1 && mode !== "place" && mode !== "create") {
        setPanStart({ 
          x: e.touches[0].clientX - pan.x, 
          y: e.touches[0].clientY - pan.y 
        });
        setIsPanning(true);
      }
    };

    const handleTouchMove = (e) => {
      // ZWEI Finger = Pinch Zoom
      if (e.touches.length === 2) {
        e.preventDefault();
        const newDistance = getTouchDistance(e.touches);
        const newCenter = getTouchCenter(e.touches);
        
        // Zoom berechnen
        const scale = newDistance / lastPinchDistance.current;
        setZoom(prev => {
          const newZoom = prev * scale;
          return Math.max(0.3, Math.min(5, newZoom));
        });
        
        // Pan während Zoom
        setPan({
          x: initialPinchPan.current.x + (newCenter.x - lastPinchCenter.current.x),
          y: initialPinchPan.current.y + (newCenter.y - lastPinchCenter.current.y)
        });
        
        lastPinchDistance.current = newDistance;
      } 
      // EIN Finger = Pan
      else if (e.touches.length === 1 && isPanning) {
        setPan({
          x: e.touches[0].clientX - panStart.x,
          y: e.touches[0].clientY - panStart.y
        });
      }
    };

    const handleTouchEnd = () => {
      lastPinchDistance.current = 0;
      setIsPanning(false);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pan, panStart, isPanning, mode]);

  /* ============================================================
     LOAD DATA
     ============================================================ */
  useEffect(() => {
    if (objectId) {
      loadFloorPlans();
      loadUnplacedBoxes();
      loadGpsBoxes();
      loadBoxTypes();
    }
  }, [objectId]);

  // URL-Parameter: Direkt zu Lageplan via fp=
  useEffect(() => {
    if (urlFloorPlanId && floorPlans.length > 0 && !selectedPlan) {
      const targetPlan = floorPlans.find(p => p.id === parseInt(urlFloorPlanId));
      if (targetPlan) {
        setSelectedPlan(targetPlan);
      }
    }
  }, [urlFloorPlanId, floorPlans]);

  useEffect(() => {
    if (selectedPlan) {
      loadBoxesOnPlan(selectedPlan.id);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setAnnotations([]);
    }
  }, [selectedPlan]);

  // URL-Parameter: Box per openBox öffnen
  useEffect(() => {
    if (openBoxId && boxesOnPlan.length > 0 && !urlParamsProcessed) {
      const boxToOpen = boxesOnPlan.find(b => b.id === parseInt(openBoxId));
      
      if (boxToOpen) {
        const needsSetup = !boxToOpen.box_type_id;
        setSelectedBox(boxToOpen);
        
        if (needsSetup) {
          setIsFirstSetup(true);
          setEditDialogOpen(true);
        } else {
          setScanDialogOpen(true);
        }
        
        // URL-Parameter entfernen und als verarbeitet markieren
        clearUrlParams();
        setUrlParamsProcessed(true);
      }
    }
  }, [openBoxId, boxesOnPlan, urlParamsProcessed]);

  // URL-Parameter: Box platzieren
  useEffect(() => {
    if (shouldPlaceBox && unplacedBoxes.length > 0 && !urlParamsProcessed) {
      const boxId = searchParams.get("placeBox") || openBoxId;
      const boxToPlaceFound = unplacedBoxes.find(b => b.id === parseInt(boxId));
      
      if (boxToPlaceFound) {
        if (isMobile) {
          setBoxToPlace(boxToPlaceFound);
          setSheetState('peek');
        } else {
          setDraggedBox(boxToPlaceFound);
        }
        setMode("place");
        clearUrlParams();
        setUrlParamsProcessed(true);
      }
    }
  }, [shouldPlaceBox, unplacedBoxes, urlParamsProcessed]);

  const clearUrlParams = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("openBox");
    newParams.delete("place");
    newParams.delete("placeBox");
    newParams.delete("fp");
    const newUrl = newParams.toString() 
      ? `${window.location.pathname}?${newParams}` 
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  };

  const loadFloorPlans = async () => {
    try {
      const res = await axios.get(`${API}/floorplans/object/${objectId}`, { headers });
      const plans = res.data || [];
      setFloorPlans(plans);
      if (plans.length > 0 && !selectedPlan && !urlFloorPlanId) {
        setSelectedPlan(plans[0]);
      }
    } catch (err) {
      console.error("Load floor plans error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadBoxesOnPlan = async (planId) => {
    try {
      const res = await axios.get(`${API}/floorplans/${planId}/boxes`, { headers });
      let boxesData = calculateDisplayNumbers(res.data || []);
      setBoxesOnPlan(boxesData);
    } catch (err) {
      console.error("Load boxes error:", err);
    }
  };

  const loadUnplacedBoxes = async () => {
    try {
      const res = await axios.get(`${API}/floorplans/object/${objectId}/unplaced`, { headers });
      let boxesData = calculateDisplayNumbers(res.data || []);
      setUnplacedBoxes(boxesData);
    } catch (err) {
      console.error("Load unplaced boxes error:", err);
    }
  };

  const loadGpsBoxes = async () => {
    try {
      const res = await axios.get(`${API}/floorplans/object/${objectId}/gps`, { headers });
      let boxesData = calculateDisplayNumbers(res.data || []);
      setGpsBoxes(boxesData);
    } catch (err) {
      console.error("Load GPS boxes error:", err);
    }
  };

  const loadBoxTypes = async () => {
    try {
      const res = await axios.get(`${API}/boxtypes`, { headers });
      setBoxTypes(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      console.error("Load box types error:", err);
    }
  };

  /* ============================================================
     GRID POSITION
     ============================================================ */
  const getGridPosition = useCallback((percentX, percentY) => {
    const { cols, rows } = gridConfig;
    const colIndex = Math.floor((percentX / 100) * cols);
    const rowIndex = Math.floor((percentY / 100) * rows);
    const clampedCol = Math.max(0, Math.min(cols - 1, colIndex));
    const clampedRow = Math.max(0, Math.min(rows - 1, rowIndex));
    const colLabel = getColLabel(clampedCol);
    return { 
      col: colLabel, 
      row: clampedRow + 1, 
      colIndex: clampedCol,
      rowIndex: clampedRow,
      gridPosition: `${colLabel}${clampedRow + 1}` 
    };
  }, [gridConfig]);

  const getGridCenterPosition = useCallback((colIndex, rowIndex) => {
    const { cols, rows } = gridConfig;
    const x = (colIndex + 0.5) * (100 / cols);
    const y = (rowIndex + 0.5) * (100 / rows);
    return { x, y };
  }, [gridConfig]);

  /* ============================================================
     MOUSE HANDLERS
     ============================================================ */
  const handleMouseDown = useCallback((e) => {
    if (e.button === 1 || e.button === 2 || mode === "pan") {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (mode === "draw" && drawTool && planRef.current) {
      const rect = planRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setCurrentAnnotation({ type: drawTool, startX: x, startY: y, endX: x, endY: y, color: annotationColor });
    }
  }, [mode, drawTool, pan, annotationColor]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (planRef.current && showGrid) {
      const rect = planRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        setHoveredCell(getGridPosition(x, y));
      } else {
        setHoveredCell(null);
      }
    }

    if (currentAnnotation && planRef.current) {
      const rect = planRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setCurrentAnnotation(prev => ({ ...prev, endX: x, endY: y }));
    }
  }, [isPanning, panStart, currentAnnotation, showGrid, getGridPosition]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    if (currentAnnotation) {
      const dx = Math.abs(currentAnnotation.endX - currentAnnotation.startX);
      const dy = Math.abs(currentAnnotation.endY - currentAnnotation.startY);
      if (dx > 0.5 || dy > 0.5) {
        setAnnotations(prev => [...prev, { ...currentAnnotation, id: Date.now() }]);
      }
      setCurrentAnnotation(null);
    }
  }, [currentAnnotation]);

  /* ============================================================
     PLAN CLICK - Place Box
     ============================================================ */
  const handlePlanClick = useCallback((e) => {
    if (isPanning || mode === "pan" || mode === "draw") return;
    if (!planRef.current || !selectedPlan) return;

    const rect = planRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    
    const grid = getGridPosition(clampedX, clampedY);
    const centered = getGridCenterPosition(grid.colIndex, grid.rowIndex);

    if (mode === "create") {
      setCreatePosition({ x: centered.x, y: centered.y, gridPosition: grid.gridPosition });
      setCreateDialogOpen(true);
      return;
    }

    // Mobile: boxToPlace, Desktop: draggedBox
    const boxToPlaceNow = isMobile ? boxToPlace : draggedBox;
    if (mode === "place" && boxToPlaceNow) {
      placeBox(boxToPlaceNow.id, centered.x, centered.y, grid.gridPosition);
      return;
    }

    if (mode === "relocate" && relocatingBox) {
      relocateBox(relocatingBox.id, centered.x, centered.y, grid.gridPosition);
      return;
    }
  }, [mode, selectedPlan, draggedBox, boxToPlace, relocatingBox, isPanning, getGridPosition, getGridCenterPosition, isMobile]);

  const placeBox = async (boxId, x, y, gridPosition) => {
    try {
      const response = await axios.put(`${API}/floorplans/${selectedPlan.id}/boxes/${boxId}`, {
        pos_x: x, pos_y: y, grid_position: gridPosition
      }, { headers });
      
      const placedBox = response.data || (isMobile ? boxToPlace : draggedBox);
      
      await loadBoxesOnPlan(selectedPlan.id);
      await loadUnplacedBoxes();
      await loadGpsBoxes();
      
      setDraggedBox(null);
      setBoxToPlace(null);
      setMode("view");
      
      // Nach Platzieren: Ersteinrichtung öffnen
      if (placedBox) {
        const boxForDialog = {
          ...(isMobile ? boxToPlace : draggedBox),
          ...placedBox,
          pos_x: x, pos_y: y, grid_position: gridPosition
        };
        
        setSelectedBox(boxForDialog);
        const needsSetup = !boxForDialog.box_type_id;
        if (needsSetup) {
          setIsFirstSetup(true);
          setEditDialogOpen(true);
        } else {
          setScanDialogOpen(true);
        }
      }
    } catch (err) {
      console.error("Place box error:", err);
    }
  };

  const relocateBox = async (boxId, x, y, gridPosition) => {
    try {
      await axios.put(`${API}/floorplans/${selectedPlan.id}/boxes/${boxId}`, {
        pos_x: x, pos_y: y, grid_position: gridPosition
      }, { headers });
      loadBoxesOnPlan(selectedPlan.id);
      setRelocatingBox(null);
      setMode("view");
    } catch (err) {
      console.error("Relocate box error:", err);
    }
  };

  /* ============================================================
     BOX CLICK
     ============================================================ */
  const handleBoxClick = (box, e) => {
    if (e) e.stopPropagation();
    if (mode !== "view") return;
    
    setSelectedBox(box);
    const needsSetup = !box.box_type_id;
    
    if (needsSetup) {
      setIsFirstSetup(true);
      setEditDialogOpen(true);
    } else {
      setIsFirstSetup(false);
      setScanDialogOpen(true);
    }
  };

  const handleScanCompleted = () => {
    loadBoxesOnPlan(selectedPlan.id);
    setScanDialogOpen(false);
    setSelectedBox(null);
    // URL-Parameter bleiben verarbeitet, um Wiederöffnung zu verhindern
  };

  const handleEditCompleted = () => {
    loadBoxesOnPlan(selectedPlan.id);
    loadUnplacedBoxes();
    loadGpsBoxes();
    setEditDialogOpen(false);
    setSelectedBox(null);
    setIsFirstSetup(false);
    // URL-Parameter bleiben verarbeitet, um Wiederöffnung zu verhindern
  };

  /* ============================================================
     UPLOAD & GRID
     ============================================================ */
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("object_id", objectId);
      const uploadRes = await axios.post(`${API}/floorplans/upload`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      setPendingUpload({ url: uploadRes.data.url, name: `LP${floorPlans.length + 1}` });
      setShowUpload(false);
      setShowGridSetup(true);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Fehler beim Hochladen");
    } finally {
      setUploading(false);
    }
  };

  const handleGridSetupComplete = async (gridConfigData) => {
    if (!pendingUpload) return;
    try {
      const createRes = await axios.post(`${API}/floorplans`, {
        object_id: objectId,
        name: pendingUpload.name,
        image_url: pendingUpload.url,
        ...gridConfigData
      }, { headers });
      await loadFloorPlans();
      setSelectedPlan(createRes.data);
      setShowGridSetup(false);
      setPendingUpload(null);
    } catch (err) {
      console.error("Create floor plan error:", err);
      alert("Fehler beim Erstellen");
    }
  };

  /* ============================================================
     SIDEBAR CLASSES (wie Maps)
     ============================================================ */
  const getSidebarClasses = () => {
    if (isMobile) {
      const stateClasses = {
        'peek': 'sheet-peek',
        'half': 'sheet-half',
        'full': 'sheet-full'
      };
      return `maps-sidebar mobile-sheet ${stateClasses[sheetState]}`;
    }
    return `maps-sidebar desktop ${sidebarOpen ? 'open' : 'closed'}`;
  };

  /* ============================================================
     RENDER
     ============================================================ */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const containerHeight = isFullscreen ? "100vh" : "calc(100vh - 180px)";
  const activeBoxToPlace = isMobile ? boxToPlace : draggedBox;

  return (
    <div 
      className={`maps-wrapper bg-gray-900 dark:bg-gray-950 flex flex-col ${isFullscreen ? "fixed inset-0 z-50" : "rounded-xl border border-gray-700 dark:border-gray-800"}`}
      style={{ height: containerHeight, minHeight: "600px" }}
    >
      {/* TOOLBAR */}
      <div className="flex items-center justify-between p-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700 dark:border-gray-800 flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <select
            value={selectedPlan?.id || ""}
            onChange={(e) => {
              const plan = floorPlans.find(p => p.id === parseInt(e.target.value));
              setSelectedPlan(plan);
            }}
            className="px-3 py-1.5 bg-gray-700 dark:bg-gray-800 border border-gray-600 dark:border-gray-700 rounded text-white text-sm max-w-[140px]"
          >
            {floorPlans.length === 0 && <option value="">Kein Lageplan</option>}
            {floorPlans.map(plan => (
              <option key={plan.id} value={plan.id}>{plan.name}</option>
            ))}
          </select>
          
          <button onClick={() => setShowUpload(true)} className="p-1.5 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 rounded text-white" title="Neuer Lageplan">
            <Plus className="w-4 h-4" />
          </button>
          
          {selectedPlan && (
            <button onClick={() => setShowGrid(!showGrid)} className={`p-1.5 rounded ${showGrid ? "bg-blue-600 text-white" : "bg-gray-700 dark:bg-gray-800 text-gray-400 dark:text-gray-500"}`}>
              <Grid3X3 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-gray-700 dark:bg-gray-800 p-1 rounded-lg">
          <ModeButton icon={MousePointer} label="Ansehen" active={mode === "view"} onClick={() => { setMode("view"); setDrawTool(null); setBoxToPlace(null); setDraggedBox(null); }} />
          <ModeButton icon={Hand} label="Bewegen" active={mode === "pan"} onClick={() => { setMode("pan"); setDrawTool(null); }} />
          {!isMobile && (
            <ModeButton icon={Plus} label="Box" active={mode === "create"} onClick={() => { setMode("create"); setDrawTool(null); }} color="green" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(prev => Math.max(0.3, prev - 0.25))} className="p-1.5 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 rounded text-white">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-gray-400 dark:text-gray-500 text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(prev => Math.min(5, prev + 0.25))} className="p-1.5 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 rounded text-white">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 rounded text-white">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PLACEMENT INFO BAR */}
      {(mode === "place" || mode === "create" || mode === "relocate") && (
        <div className="flex items-center justify-between p-2 bg-green-900/30 border-b border-green-700 shrink-0">
          <span className="text-green-300 text-sm">
            📍 {isMobile ? 'Auf Plan tippen' : 'Klicken'} um Box zu platzieren
          </span>
          {hoveredCell && (
            <span className="px-3 py-1 bg-green-600 text-white rounded font-mono text-lg font-bold">
              {hoveredCell.gridPosition}
            </span>
          )}
          <button 
            onClick={() => { setMode("view"); setDraggedBox(null); setBoxToPlace(null); setRelocatingBox(null); }}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
          >
            Abbrechen
          </button>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="maps-main flex flex-1 overflow-hidden relative">
        {/* PLAN AREA */}
        <div 
          ref={containerRef}
          className={`flex-1 overflow-hidden relative ${
            mode === "pan" ? "cursor-grab" : 
            mode === "place" || mode === "create" ? "cursor-crosshair" : "cursor-default"
          } ${isPanning ? "cursor-grabbing" : ""}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { handleMouseUp(); setHoveredCell(null); }}
          onContextMenu={(e) => e.preventDefault()}
          style={{ background: "#0a0a12", touchAction: "none" }}
        >
          {!selectedPlan ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Grid3X3 className="w-16 h-16 text-gray-600 mb-4" />
              <p className="text-gray-400 mb-2">Kein Lageplan vorhanden</p>
              <button onClick={() => setShowUpload(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2">
                <Upload className="w-4 h-4" /> Hochladen
              </button>
            </div>
          ) : (
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
                position: "absolute",
                left: "50%",
                top: "50%",
                marginLeft: "-40%",
                marginTop: "-35%",
                width: "80%"
              }}
            >
              <div ref={planRef} className="relative" onClick={handlePlanClick}>
                <img src={selectedPlan.image_url} alt={selectedPlan.name} className="w-full h-auto select-none block" draggable={false} />

                {/* GRID OVERLAY */}
                {showGrid && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {Array.from({ length: gridConfig.cols + 1 }).map((_, i) => (
                      <line key={`v${i}`} x1={(i / gridConfig.cols) * 100} y1="0" x2={(i / gridConfig.cols) * 100} y2="100" stroke="rgba(59, 130, 246, 0.4)" strokeWidth={0.08} />
                    ))}
                    {Array.from({ length: gridConfig.rows + 1 }).map((_, i) => (
                      <line key={`h${i}`} x1="0" y1={(i / gridConfig.rows) * 100} x2="100" y2={(i / gridConfig.rows) * 100} stroke="rgba(59, 130, 246, 0.4)" strokeWidth={0.08} />
                    ))}
                    
                    {hoveredCell && (mode === "create" || mode === "place" || mode === "relocate") && (
                      <rect
                        x={(hoveredCell.colIndex / gridConfig.cols) * 100}
                        y={(hoveredCell.rowIndex / gridConfig.rows) * 100}
                        width={100 / gridConfig.cols}
                        height={100 / gridConfig.rows}
                        fill="rgba(34, 197, 94, 0.4)"
                        stroke="#22c55e"
                        strokeWidth={0.15}
                      />
                    )}
                  </svg>
                )}

                {/* Boxes */}
                {boxesOnPlan.map(box => (
                  <BoxMarkerFloorplan
                    key={box.id}
                    box={box}
                    onClick={(e) => handleBoxClick(box, e)}
                    disabled={mode !== "view"}
                    zoom={zoom}
                  />
                ))}

                {/* Annotations */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {annotations.map(ann => <Annotation key={ann.id} data={ann} />)}
                  {currentAnnotation && <Annotation data={currentAnnotation} />}
                </svg>
              </div>
            </div>
          )}

          {/* Mobile: Place-Info */}
          {isMobile && activeBoxToPlace && mode === "place" && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium">
              Box #{activeBoxToPlace.display_number} platzieren - Tippe auf Plan
            </div>
          )}

          {/* Zoom Info */}
          <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-3">
            <span>Zoom: {Math.round(zoom * 100)}%</span>
            <span className="text-blue-400">{gridConfig.cols}×{gridConfig.rows}</span>
            {isMobile && <span className="text-gray-500">📱 Pinch</span>}
          </div>
        </div>

        {/* SIDEBAR - WIE MAPS! */}
        <aside ref={sheetRef} className={getSidebarClasses()}>
          {isMobile && (
            <div 
              className="sheet-drag-handle"
              onClick={() => setSheetState(sheetState === 'peek' ? 'half' : sheetState === 'half' ? 'full' : 'peek')}
            />
          )}

          <div className="sidebar-header">
            <div className="sidebar-title row">
              <LayoutGrid size={20} />
              <h2>{selectedPlan?.name || 'Lageplan'}</h2>
              <span className="count">{boxesOnPlan.length}</span>
            </div>
          </div>

          {(sheetState !== 'peek' || !isMobile) && (
            <div className="sidebar-content">
              {/* Nicht platzierte Boxen */}
              <CollapsibleBoxSection
                title="Nicht platziert"
                icon={<Package size={16} />}
                count={unplacedBoxes.length}
                variant="warning"
                defaultOpen={unplacedBoxes.length > 0}
              >
                {unplacedBoxes.length === 0 ? (
                  <div className="section-empty">Alle Boxen platziert 🎉</div>
                ) : (
                  unplacedBoxes.map((box) => (
                    <BoxListItem 
                      key={box.id}
                      box={box}
                      isUnplaced={true}
                      isSelected={activeBoxToPlace?.id === box.id}
                      onClick={() => {
                        if (isMobile) {
                          setBoxToPlace(activeBoxToPlace?.id === box.id ? null : box);
                          if (activeBoxToPlace?.id !== box.id) {
                            setMode("place");
                            setSheetState('peek');
                          } else {
                            setMode("view");
                          }
                        } else {
                          setDraggedBox(box);
                          setMode("place");
                        }
                      }}
                      onDragStart={(e) => {
                        if (!isMobile) {
                          e.dataTransfer.setData('box', JSON.stringify(box));
                          setDraggedBox(box);
                          setMode("place");
                        }
                      }}
                    />
                  ))
                )}
              </CollapsibleBoxSection>

              {/* GPS-Boxen auf Maps */}
              <CollapsibleBoxSection
                title="Auf Maps stationiert"
                icon={<Map size={16} />}
                count={gpsBoxes.length}
                variant="map"
                defaultOpen={false}
              >
                {gpsBoxes.length === 0 ? (
                  <div className="section-empty">Keine GPS-Boxen</div>
                ) : (
                  gpsBoxes.map((box) => (
                    <BoxListItem 
                      key={box.id} 
                      box={box} 
                      isGps={true}
                      onClick={() => handleBoxClick(box)}
                    />
                  ))
                )}
              </CollapsibleBoxSection>

              {/* Platzierte Boxen */}
              <CollapsibleBoxSection
                title="Auf Plan"
                icon={<LayoutGrid size={16} />}
                count={boxesOnPlan.length}
                variant="floorplan"
                defaultOpen={true}
              >
                {boxesOnPlan.length === 0 ? (
                  <div className="section-empty">Keine Boxen platziert</div>
                ) : (
                  boxesOnPlan.map((box) => (
                    <BoxListItem 
                      key={box.id} 
                      box={box} 
                      onClick={() => handleBoxClick(box)}
                      isFloorplan={true}
                    />
                  ))
                )}
              </CollapsibleBoxSection>

              {/* Legende */}
              <div className="status-legend">
                <h5>Status</h5>
                <div className="legend-items">
                  {Object.entries(STATUS_COLORS).map(([key, { bg, label }]) => (
                    <div key={key} className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: bg }} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Desktop Sidebar Toggle */}
        {!isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-1/2 bg-gray-700 hover:bg-gray-600 p-1 rounded-l text-white z-10"
            style={{ right: sidebarOpen ? "280px" : "0", transform: "translateY(-50%)" }}
          >
            {sidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* DIALOGS */}
      {showUpload && <UploadModal uploading={uploading} onUpload={handleFileSelect} onClose={() => setShowUpload(false)} />}
      
      {showGridSetup && pendingUpload && (
        <GridSetupDialog imageUrl={pendingUpload.url} onComplete={handleGridSetupComplete} onCancel={() => { setShowGridSetup(false); setPendingUpload(null); }} />
      )}

      {createDialogOpen && selectedPlan && (
        <BoxCreateDialogFloorPlan
          objectId={objectId}
          floorPlanId={selectedPlan.id}
          position={createPosition}
          boxTypes={boxTypes}
          onClose={() => { setCreateDialogOpen(false); setMode("view"); }}
          onSave={() => { loadBoxesOnPlan(selectedPlan.id); loadUnplacedBoxes(); loadGpsBoxes(); setCreateDialogOpen(false); setMode("view"); }}
        />
      )}

      {scanDialogOpen && selectedBox && (
        <BoxScanDialog
          box={selectedBox}
          onClose={() => { setScanDialogOpen(false); setSelectedBox(null); }}
          onSave={handleScanCompleted}
          onScanCreated={handleScanCompleted}
          onEdit={() => { setScanDialogOpen(false); setIsFirstSetup(false); setEditDialogOpen(true); }}
          onAdjustPosition={(box) => { setScanDialogOpen(false); setRelocatingBox(box); setMode("relocate"); }}
        />
      )}

      {editDialogOpen && selectedBox && (
        <BoxEditDialog
          box={selectedBox}
          boxTypes={boxTypes}
          isFirstSetup={isFirstSetup}
          onClose={() => { setEditDialogOpen(false); setSelectedBox(null); setIsFirstSetup(false); }}
          onSave={handleEditCompleted}
        />
      )}
    </div>
  );
}

/* ============================================================
   BOX MARKER - WIE MAPS!
   ============================================================ */
function BoxMarkerFloorplan({ box, onClick, disabled, zoom }) {
  const statusColor = getStatusColor(box.current_status);
  const displayNum = box.display_number || '?';
  const shortQr = getShortQr(box);
  const size = Math.max(20, Math.min(32, 26 / zoom));
  const fontSize = Math.max(8, Math.min(12, 10 / zoom));

  const colorMap = {
    green: "#10b981",
    yellow: "#eab308",
    orange: "#fb923c",
    red: "#dc2626",
    gray: "#6b7280"
  };

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`absolute ${disabled ? "" : "cursor-pointer"} transition-transform z-10 group`}
      style={{ 
        left: `${box.pos_x}%`, 
        top: `${box.pos_y}%`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* QR Badge */}
      <div 
        className="absolute -top-5 left-1/2 -translate-x-1/2 bg-black/90 rounded px-1.5 py-0.5 text-white font-mono shadow-lg border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ fontSize: Math.max(8, 10 / zoom) }}
      >
        {shortQr}
      </div>

      {/* Main Circle */}
      <div
        className={`rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-white ${!disabled ? 'hover:scale-110' : ''} transition-transform`}
        style={{ 
          backgroundColor: colorMap[statusColor] || colorMap.gray,
          width: size, 
          height: size, 
          fontSize
        }}
      >
        {displayNum}
      </div>

      {/* Grid Position */}
      {box.grid_position && (
        <div 
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-blue-600/80 text-white px-1 rounded text-center font-mono"
          style={{ fontSize: Math.max(6, 8 / zoom) }}
        >
          {box.grid_position}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SUB COMPONENTS
   ============================================================ */
function ModeButton({ icon: Icon, label, active, onClick, color }) {
  const colors = { green: "bg-green-600", default: "bg-blue-600" };
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition ${
        active ? `${colors[color] || colors.default} text-white` : "text-gray-400 hover:text-white hover:bg-gray-600"
      }`}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function Annotation({ data }) {
  const { type, startX, startY, endX, endY, color } = data;
  if (type === "rect") {
    return <rect x={Math.min(startX, endX)} y={Math.min(startY, endY)} width={Math.abs(endX - startX)} height={Math.abs(endY - startY)} fill="none" stroke={color} strokeWidth="0.25" strokeDasharray="0.5,0.5" />;
  }
  if (type === "circle") {
    return <ellipse cx={(startX + endX) / 2} cy={(startY + endY) / 2} rx={Math.abs(endX - startX) / 2} ry={Math.abs(endY - startY) / 2} fill="none" stroke={color} strokeWidth="0.25" />;
  }
  if (type === "arrow") {
    const id = `arr-${data.id || Date.now()}`;
    return (
      <g>
        <defs>
          <marker id={id} markerWidth="3" markerHeight="2" refX="2.5" refY="1" orient="auto">
            <polygon points="0 0, 3 1, 0 2" fill={color} />
          </marker>
        </defs>
        <line x1={startX} y1={startY} x2={endX} y2={endY} stroke={color} strokeWidth="0.25" markerEnd={`url(#${id})`} />
      </g>
    );
  }
  return null;
}

function UploadModal({ uploading, onUpload, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">Lageplan hochladen</h3>
        <label className={`block w-full p-8 border-2 border-dashed rounded-lg text-center cursor-pointer ${uploading ? "border-gray-600" : "border-gray-600 hover:border-blue-500"}`}>
          {uploading ? (
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400">Bild auswählen</p>
            </>
          )}
          <input type="file" accept="image/*" onChange={onUpload} className="hidden" disabled={uploading} />
        </label>
        <button onClick={onClose} disabled={uploading} className="mt-4 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Abbrechen</button>
      </div>
    </div>
  );
}

function GridSetupDialog({ imageUrl, onComplete, onCancel }) {
  const [selectedPreset, setSelectedPreset] = useState("medium");

  const handleSave = () => {
    const preset = GRID_PRESETS[selectedPreset];
    onComplete({
      grid_mode: "preset",
      grid_preset: selectedPreset,
      grid_cols: preset.cols,
      grid_rows: preset.rows
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-lg w-full border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Grid wählen</h2>
        </div>
        <div className="p-4 space-y-3">
          {Object.entries(GRID_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => setSelectedPreset(key)}
              className={`w-full p-3 rounded-lg border-2 text-left ${selectedPreset === key ? "border-blue-500 bg-blue-600/20" : "border-gray-700 bg-gray-900"}`}
            >
              <span className="text-lg mr-2">{preset.icon}</span>
              <span className="text-white font-medium">{preset.name}</span>
              {selectedPreset === key && <Check className="w-4 h-4 text-blue-400 float-right mt-1" />}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-700 flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg">Abbrechen</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">Erstellen</button>
        </div>
      </div>
    </div>
  );
}

function BoxCreateDialogFloorPlan({ objectId, floorPlanId, position, boxTypes, onClose, onSave }) {
  const token = localStorage.getItem("trapmap_token");
  const [boxTypeId, setBoxTypeId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSaveBox = async () => {
    if (!boxTypeId) { alert("Bitte Box-Typ auswählen!"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/boxes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          object_id: objectId,
          box_type_id: parseInt(boxTypeId),
          floor_plan_id: floorPlanId,
          pos_x: position.x,
          pos_y: position.y,
          grid_position: position.gridPosition,
          position_type: "floorplan",
          current_status: "green",
          control_interval_days: 30
        }),
      });
      if (!res.ok) throw new Error("Fehler");
      onSave();
    } catch (e) {
      console.error("Create box error:", e);
      alert("Fehler beim Erstellen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">📦 Neue Box</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Box-Typ *</label>
            <select value={boxTypeId} onChange={(e) => setBoxTypeId(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white">
              <option value="">Auswählen...</option>
              {boxTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
          </div>
          <div className="bg-gray-900 rounded p-3 flex justify-between text-sm">
            <span className="text-gray-400">Position:</span>
            <span className="text-green-400 font-mono font-bold">{position.gridPosition}</span>
          </div>
        </div>
        <div className="p-4 border-t border-gray-700 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg">Abbrechen</button>
          <button onClick={handleSaveBox} disabled={saving} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg flex items-center justify-center gap-2">
            <Save size={16} />{saving ? "..." : "Erstellen"}
          </button>
        </div>
      </div>
    </div>
  );
}