/* ============================================================
   TRAPMAP - FLOOR PLAN EDITOR V7
   - Grid-Setup beim Erstellen (Preset ODER echte Maße)
   - Festes Grid pro Lageplan (ändert sich nicht beim Zoomen)
   - Original Dialog-Style wie Maps
   - Passive Event Listener Fix
   - MIT EMOJI ICONS
   ============================================================ */

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { 
  Upload, Plus, Trash2, Grid3X3, X, ZoomIn, ZoomOut, 
  Package, Move, ChevronLeft, ChevronRight, Maximize2,
  Circle, Square, ArrowRight, Pencil, Eraser, RotateCcw,
  Hand, MousePointer, AlertTriangle, Save,
  Settings, Ruler, LayoutGrid, Check
} from "lucide-react";

import BoxScanDialog from "./BoxScanDialog";

const API = import.meta.env.VITE_API_URL;

const STATUS_COLORS = {
  green: { bg: "#10b981", label: "OK" },
  yellow: { bg: "#eab308", label: "Auffällig" },
  orange: { bg: "#f97316", label: "Erhöht" },
  red: { bg: "#ef4444", label: "Befall" },
  gray: { bg: "#6b7280", label: "Nicht geprüft" }
};

// ============================================
// BOX TYPE EMOJI ICONS
// ============================================
const BOX_TYPE_EMOJIS = {
  rat: '🐀',
  mouse: '🐁',
  snapTrap: '⚠️',
  tunnel: '🔶',
  bait: '🟢',
  liveTrap: '🔵',
  monitoring: '👁️',
  moth: '🦋',
  cockroach: '🪳',
  beetle: '🪲',
  insect: '🪰',
  uvLight: '☀️',
};

function getBoxTypeEmojis(boxTypeName) {
  if (!boxTypeName) return '';
  const name = boxTypeName.toLowerCase();
  let icons = [];
  
  if ((name.includes('schlagfall') || name.includes('snap')) && name.includes('tunnel')) {
    if (name.includes('ratte') || name.includes('rat')) icons = ['rat', 'tunnel'];
    else if (name.includes('maus') || name.includes('mouse')) icons = ['mouse', 'tunnel'];
    else icons = ['tunnel'];
  }
  else if (name.includes('schlagfall') || name.includes('snap')) {
    if (name.includes('ratte') || name.includes('rat')) icons = ['rat', 'snapTrap'];
    else if (name.includes('maus') || name.includes('mouse')) icons = ['mouse', 'snapTrap'];
    else icons = ['snapTrap'];
  }
  else if (name.includes('köder') || name.includes('koeder') || name.includes('bait')) {
    if (name.includes('ratte') || name.includes('rat')) icons = ['rat', 'bait'];
    else if (name.includes('maus') || name.includes('mouse')) icons = ['mouse', 'bait'];
    else icons = ['bait'];
  }
  else if (name.includes('lebend') || name.includes('live')) {
    if (name.includes('ratte') || name.includes('rat')) icons = ['rat', 'liveTrap'];
    else if (name.includes('maus') || name.includes('mouse')) icons = ['mouse', 'liveTrap'];
    else icons = ['liveTrap'];
  }
  else if (name.includes('monitoring') || name.includes('monitor')) {
    if (name.includes('käfer') || name.includes('kaefer') || name.includes('beetle')) icons = ['beetle', 'monitoring'];
    else if (name.includes('motte') || name.includes('moth')) icons = ['moth', 'monitoring'];
    else if (name.includes('schabe') || name.includes('cockroach')) icons = ['cockroach', 'monitoring'];
    else if (name.includes('ratte') || name.includes('rat')) icons = ['rat', 'monitoring'];
    else if (name.includes('maus') || name.includes('mouse')) icons = ['mouse', 'monitoring'];
    else icons = ['monitoring'];
  }
  else if (name.includes('motte') || name.includes('moth')) icons = ['moth'];
  else if (name.includes('schabe') || name.includes('cockroach')) icons = ['cockroach'];
  else if (name.includes('käfer') || name.includes('kaefer') || name.includes('beetle')) icons = ['beetle'];
  else if (name.includes('insekt') || name.includes('insect')) icons = ['insect'];
  else if (name.includes('uv') || name.includes('licht') || name.includes('light')) icons = ['uvLight'];
  else if (name.includes('ratte') || name.includes('rat')) icons = ['rat'];
  else if (name.includes('maus') || name.includes('mouse')) icons = ['mouse'];
  
  return icons.map(key => BOX_TYPE_EMOJIS[key] || '').join('');
}

// ============================================
// GRID PRESETS
// ============================================
const GRID_PRESETS = {
  coarse: { 
    cols: 10, 
    rows: 10, 
    name: "Grob (10×10)",
    description: "Für große Hallen, Außenbereiche, Parkplätze",
    icon: "🏭"
  },
  medium: { 
    cols: 20, 
    rows: 20, 
    name: "Mittel (20×20)",
    description: "Standard für die meisten Gebäude und Lager",
    icon: "🏢"
  },
  fine: { 
    cols: 26, 
    rows: 30, 
    name: "Fein (A-Z, 1-30)",
    description: "Detaillierte Positionierung für Büros, Restaurants",
    icon: "🏠"
  },
  very_fine: { 
    cols: 52, 
    rows: 50, 
    name: "Sehr fein (AA-AZ, 1-50)",
    description: "Maximale Präzision für kleine Räume, Küchen",
    icon: "📍"
  }
};

// Grid-Label generieren (A-Z, dann AA-AZ)
const getColLabel = (index, totalCols) => {
  if (index < 26) return String.fromCharCode(65 + index);
  return 'A' + String.fromCharCode(65 + (index - 26));
};

export default function FloorPlanEditor({ objectId, objectName }) {
  // Data State
  const [floorPlans, setFloorPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [boxesOnPlan, setBoxesOnPlan] = useState([]);
  const [unplacedBoxes, setUnplacedBoxes] = useState([]);
  const [boxTypes, setBoxTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // View State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Grid (aus selectedPlan geladen)
  const [showGrid, setShowGrid] = useState(true);
  const [hoveredCell, setHoveredCell] = useState(null);
  
  // Mode
  const [mode, setMode] = useState("view");
  const [drawTool, setDrawTool] = useState(null);
  
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
  
  // Drag & Place
  const [draggedBox, setDraggedBox] = useState(null);
  const [relocatingBox, setRelocatingBox] = useState(null);
  
  // Annotations
  const [annotations, setAnnotations] = useState([]);
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [annotationColor, setAnnotationColor] = useState("#ef4444");
  
  // UI
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef(null);
  const planRef = useRef(null);
  
  const token = localStorage.getItem("trapmap_token");
  const headers = { Authorization: `Bearer ${token}` };

  // Grid-Konfiguration aus selectedPlan
  const gridConfig = selectedPlan ? {
    cols: selectedPlan.grid_cols || 20,
    rows: selectedPlan.grid_rows || 20
  } : { cols: 20, rows: 20 };

  // ============================================
  // ZOOM: MAUSRAD + TOUCH PINCH
  // ============================================
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Mausrad Zoom
    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      setZoom(prev => Math.max(0.3, Math.min(5, prev + delta)));
    };

    // Touch Pinch Zoom
    let lastTouchDistance = 0;
    let lastTouchCenter = { x: 0, y: 0 };
    let initialPan = { x: 0, y: 0 };

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
      if (e.touches.length === 2) {
        e.preventDefault();
        lastTouchDistance = getTouchDistance(e.touches);
        lastTouchCenter = getTouchCenter(e.touches);
        initialPan = { ...pan };
      } else if (e.touches.length === 1) {
        // Single touch for panning
        setPanStart({ 
          x: e.touches[0].clientX - pan.x, 
          y: e.touches[0].clientY - pan.y 
        });
        setIsPanning(true);
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const newDistance = getTouchDistance(e.touches);
        const newCenter = getTouchCenter(e.touches);
        
        // Zoom
        const scale = newDistance / lastTouchDistance;
        setZoom(prev => Math.max(0.3, Math.min(5, prev * scale)));
        
        // Pan while zooming
        setPan({
          x: initialPan.x + (newCenter.x - lastTouchCenter.x),
          y: initialPan.y + (newCenter.y - lastTouchCenter.y)
        });
        
        lastTouchDistance = newDistance;
      } else if (e.touches.length === 1 && isPanning) {
        setPan({
          x: e.touches[0].clientX - panStart.x,
          y: e.touches[0].clientY - panStart.y
        });
      }
    };

    const handleTouchEnd = () => {
      lastTouchDistance = 0;
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
  }, [pan, panStart, isPanning]);

  // ============================================
  // LOAD DATA
  // ============================================
  useEffect(() => {
    if (objectId) {
      loadFloorPlans();
      loadUnplacedBoxes();
      loadBoxTypes();
    }
  }, [objectId]);

  useEffect(() => {
    if (selectedPlan) {
      loadBoxesOnPlan(selectedPlan.id);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setAnnotations([]);
    }
  }, [selectedPlan]);

  const loadFloorPlans = async () => {
    try {
      const res = await axios.get(`${API}/floorplans/object/${objectId}`, { headers });
      const plans = res.data || [];
      setFloorPlans(plans);
      if (plans.length > 0 && !selectedPlan) {
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
      setBoxesOnPlan(res.data || []);
    } catch (err) {
      console.error("Load boxes error:", err);
    }
  };

  const loadUnplacedBoxes = async () => {
    try {
      const res = await axios.get(`${API}/floorplans/object/${objectId}/unplaced`, { headers });
      setUnplacedBoxes(res.data || []);
    } catch (err) {
      console.error("Load unplaced boxes error:", err);
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

  // ============================================
  // UPLOAD FLOW
  // ============================================
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

      // Speichere Upload-Info und zeige Grid-Setup
      setPendingUpload({
        url: uploadRes.data.url,
        name: `LP${floorPlans.length + 1}`
      });
      setShowUpload(false);
      setShowGridSetup(true);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Fehler beim Hochladen");
    } finally {
      setUploading(false);
    }
  };

  const handleGridSetupComplete = async (gridConfig) => {
    if (!pendingUpload) return;

    try {
      const createRes = await axios.post(`${API}/floorplans`, {
        object_id: objectId,
        name: pendingUpload.name,
        image_url: pendingUpload.url,
        ...gridConfig
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

  // ============================================
  // UPDATE GRID SETTINGS
  // ============================================
  const handleUpdateGridSettings = async (gridConfig) => {
    if (!selectedPlan) return;

    // Error werfen wenn was schief geht - GridSettingsDialog behandelt es
    await axios.put(`${API}/floorplans/${selectedPlan.id}`, gridConfig, { headers });
    await loadFloorPlans();
    
    // Aktualisiere selectedPlan
    setSelectedPlan(prev => ({ ...prev, ...gridConfig }));
    // setShowGridSettings(false) wird jetzt vom Dialog selbst gemacht nach Erfolg
  };

  // ============================================
  // GRID POSITION BERECHNEN
  // ============================================
  const getGridPosition = useCallback((percentX, percentY) => {
    const { cols, rows } = gridConfig;
    
    const colIndex = Math.floor((percentX / 100) * cols);
    const rowIndex = Math.floor((percentY / 100) * rows);
    
    const clampedCol = Math.max(0, Math.min(cols - 1, colIndex));
    const clampedRow = Math.max(0, Math.min(rows - 1, rowIndex));
    
    const colLabel = getColLabel(clampedCol, cols);
    const rowLabel = clampedRow + 1;
    
    return { 
      col: colLabel, 
      row: rowLabel, 
      colIndex: clampedCol,
      rowIndex: clampedRow,
      gridPosition: `${colLabel}${rowLabel}` 
    };
  }, [gridConfig]);

  const getGridCenterPosition = useCallback((colIndex, rowIndex) => {
    const { cols, rows } = gridConfig;
    
    const cellWidth = 100 / cols;
    const cellHeight = 100 / rows;
    
    const x = (colIndex + 0.5) * cellWidth;
    const y = (rowIndex + 0.5) * cellHeight;
    
    return { x, y };
  }, [gridConfig]);

  // ============================================
  // MOUSE HANDLERS
  // ============================================
  const handleMouseDown = useCallback((e) => {
    // Mittlere Maustaste, Rechtsklick oder Pan-Modus = Bild bewegen
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
      
      setCurrentAnnotation({
        type: drawTool,
        startX: x, startY: y,
        endX: x, endY: y,
        color: annotationColor
      });
    }
  }, [mode, drawTool, pan, annotationColor]);

  const handleMouseMove = useCallback((e) => {
    // Bild bewegen
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    // Grid-Zelle hovern
    if (planRef.current && showGrid) {
      const rect = planRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        const grid = getGridPosition(x, y);
        setHoveredCell(grid);
      } else {
        setHoveredCell(null);
      }
    }

    // Annotation zeichnen
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

  // ============================================
  // PLAN CLICK - Create Box
  // ============================================
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
      setCreatePosition({ 
        x: centered.x, 
        y: centered.y, 
        gridPosition: grid.gridPosition 
      });
      setCreateDialogOpen(true);
      return;
    }

    if (mode === "place" && draggedBox) {
      placeBox(draggedBox.id, centered.x, centered.y, grid.gridPosition);
      return;
    }

    if (mode === "relocate" && relocatingBox) {
      relocateBox(relocatingBox.id, centered.x, centered.y, grid.gridPosition);
      return;
    }
  }, [mode, selectedPlan, draggedBox, relocatingBox, isPanning, getGridPosition, getGridCenterPosition]);

  const placeBox = async (boxId, x, y, gridPosition) => {
    try {
      await axios.put(`${API}/floorplans/${selectedPlan.id}/boxes/${boxId}`, {
        pos_x: x, pos_y: y, grid_position: gridPosition
      }, { headers });
      
      loadBoxesOnPlan(selectedPlan.id);
      loadUnplacedBoxes();
      setDraggedBox(null);
      setMode("view");
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

  // ============================================
  // BOX INTERACTIONS
  // ============================================
  const handleBoxClick = (box, e) => {
    e.stopPropagation();
    if (mode !== "view") return;
    
    setSelectedBox(box);
    setScanDialogOpen(true);
  };

  const handleBoxCreated = () => {
    loadBoxesOnPlan(selectedPlan.id);
    loadUnplacedBoxes();
    setCreateDialogOpen(false);
    setMode("view");
  };

  const handleScanCompleted = () => {
    loadBoxesOnPlan(selectedPlan.id);
    setScanDialogOpen(false);
    setSelectedBox(null);
  };

  const zoomIn = () => setZoom(prev => Math.min(5, prev + 0.25));
  const zoomOut = () => setZoom(prev => Math.max(0.3, prev - 0.25));
  const resetView = () => { 
    setZoom(1); 
    setPan({ x: 0, y: 0 }); 
  };

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const containerHeight = isFullscreen ? "100vh" : "calc(100vh - 180px)";

  return (
    <div 
      className={`bg-gray-900 flex flex-col ${isFullscreen ? "fixed inset-0 z-50" : "rounded-xl border border-gray-700"}`}
      style={{ height: containerHeight, minHeight: "600px" }}
    >
      {/* TOOLBAR */}
      <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700 flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <select
            value={selectedPlan?.id || ""}
            onChange={(e) => {
              const plan = floorPlans.find(p => p.id === parseInt(e.target.value));
              setSelectedPlan(plan);
            }}
            className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          >
            {floorPlans.length === 0 && <option value="">Kein Lageplan</option>}
            {floorPlans.map(plan => (
              <option key={plan.id} value={plan.id}>{plan.name}</option>
            ))}
          </select>
          
          <button onClick={() => setShowUpload(true)} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white" title="Neuer Lageplan">
            <Plus className="w-4 h-4" />
          </button>
          
          {selectedPlan && (
            <>
              <button 
                onClick={() => setShowGridSettings(true)}
                className="p-1.5 bg-gray-700 hover:bg-blue-600 rounded text-white" 
                title="Grid-Einstellungen"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button 
                onClick={async () => {
                  if (confirm("Lageplan löschen?")) {
                    await axios.delete(`${API}/floorplans/${selectedPlan.id}`, { headers });
                    setSelectedPlan(null);
                    loadFloorPlans();
                  }
                }}
                className="p-1.5 bg-gray-700 hover:bg-red-600 rounded text-white" 
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          
          <div className="w-px h-5 bg-gray-600"></div>
          
          <button 
            onClick={() => setShowGrid(!showGrid)} 
            className={`p-1.5 rounded ${showGrid ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400"}`}
            title="Grid anzeigen"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          
          {selectedPlan && (
            <span className="text-xs text-gray-400 hidden md:inline">
              Grid: {gridConfig.cols}×{gridConfig.rows}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 bg-gray-700 p-1 rounded-lg">
          <ModeButton icon={MousePointer} label="Ansehen" active={mode === "view"} onClick={() => { setMode("view"); setDrawTool(null); }} />
          <ModeButton icon={Hand} label="Bewegen" active={mode === "pan"} onClick={() => { setMode("pan"); setDrawTool(null); }} />
          <ModeButton icon={Plus} label="Box erstellen" active={mode === "create"} onClick={() => { setMode("create"); setDrawTool(null); }} color="green" />
          <ModeButton icon={Pencil} label="Zeichnen" active={mode === "draw"} onClick={() => setMode("draw")} color="orange" />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={zoomOut} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white"><ZoomOut className="w-4 h-4" /></button>
          <span className="text-gray-400 text-sm w-14 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white"><ZoomIn className="w-4 h-4" /></button>
          <button onClick={resetView} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300">Reset</button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* DRAWING TOOLBAR */}
      {mode === "draw" && (
        <div className="flex items-center gap-2 p-2 bg-gray-850 border-b border-gray-700 flex-wrap shrink-0">
          <span className="text-gray-400 text-sm">Werkzeug:</span>
          <DrawToolButton icon={Circle} active={drawTool === "circle"} onClick={() => setDrawTool("circle")} />
          <DrawToolButton icon={Square} active={drawTool === "rect"} onClick={() => setDrawTool("rect")} />
          <DrawToolButton icon={ArrowRight} active={drawTool === "arrow"} onClick={() => setDrawTool("arrow")} />
          
          <div className="w-px h-5 bg-gray-600 mx-2"></div>
          
          {["#ef4444", "#eab308", "#10b981", "#3b82f6", "#8b5cf6"].map(c => (
            <button
              key={c}
              onClick={() => setAnnotationColor(c)}
              className={`w-6 h-6 rounded ${annotationColor === c ? "ring-2 ring-white" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
          
          <div className="w-px h-5 bg-gray-600 mx-2"></div>
          
          <button onClick={() => setAnnotations(prev => prev.slice(0, -1))} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={() => setAnnotations([])} className="p-1.5 bg-gray-700 hover:bg-red-600 rounded text-gray-300">
            <Eraser className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PLACEMENT INFO BAR */}
      {(mode === "create" || mode === "place" || mode === "relocate") && (
        <div className="flex items-center justify-between p-2 bg-green-900/30 border-b border-green-700 shrink-0">
          <span className="text-green-300 text-sm">
            📍 Klicken um Box zu platzieren
          </span>
          {hoveredCell && (
            <span className="px-3 py-1 bg-green-600 text-white rounded font-mono text-lg font-bold">
              {hoveredCell.gridPosition}
            </span>
          )}
          <button 
            onClick={() => { setMode("view"); setDraggedBox(null); setRelocatingBox(null); }}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
          >
            Abbrechen
          </button>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* PLAN AREA */}
        <div 
          ref={containerRef}
          className={`flex-1 overflow-hidden relative ${
            mode === "pan" ? "cursor-grab" : 
            mode === "create" || mode === "place" || mode === "relocate" ? "cursor-crosshair" : 
            mode === "draw" && drawTool ? "cursor-crosshair" : "cursor-default"
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
              <div 
                ref={planRef}
                className="relative"
                onClick={handlePlanClick}
              >
                <img
                  src={selectedPlan.image_url}
                  alt={selectedPlan.name}
                  className="w-full h-auto select-none block"
                  draggable={false}
                />

                {/* GRID OVERLAY */}
                {showGrid && (
                  <svg 
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    {Array.from({ length: gridConfig.cols + 1 }).map((_, i) => (
                      <line
                        key={`v${i}`}
                        x1={(i / gridConfig.cols) * 100}
                        y1="0"
                        x2={(i / gridConfig.cols) * 100}
                        y2="100"
                        stroke="rgba(59, 130, 246, 0.5)"
                        strokeWidth={0.08}
                      />
                    ))}
                    {Array.from({ length: gridConfig.rows + 1 }).map((_, i) => (
                      <line
                        key={`h${i}`}
                        x1="0"
                        y1={(i / gridConfig.rows) * 100}
                        x2="100"
                        y2={(i / gridConfig.rows) * 100}
                        stroke="rgba(59, 130, 246, 0.5)"
                        strokeWidth={0.08}
                      />
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

                {/* Grid Labels - intelligent spacing */}
                {showGrid && zoom >= 0.8 && (
                  <GridLabels gridConfig={gridConfig} zoom={zoom} />
                )}

                {/* Boxes - MIT EMOJI ICONS */}
                {boxesOnPlan.map(box => (
                  <BoxMarker
                    key={box.id}
                    box={box}
                    onClick={(e) => handleBoxClick(box, e)}
                    disabled={mode !== "view"}
                    zoom={zoom}
                  />
                ))}

                {/* Annotations */}
                <svg 
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {annotations.map(ann => <Annotation key={ann.id} data={ann} />)}
                  {currentAnnotation && <Annotation data={currentAnnotation} />}
                </svg>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-3">
            <span>Zoom: {Math.round(zoom * 100)}%</span>
            <span className="text-blue-400">Grid: {gridConfig.cols}×{gridConfig.rows}</span>
            <span className="text-gray-500 hidden sm:inline">🖱️ Mausrad | 📱 Pinch</span>
          </div>
        </div>

        {/* SIDEBAR - MIT EMOJI ICONS */}
        <Sidebar
          open={sidebarOpen}
          boxesOnPlan={boxesOnPlan}
          unplacedBoxes={unplacedBoxes}
          draggedBox={draggedBox}
          setDraggedBox={setDraggedBox}
          setMode={setMode}
          setSelectedBox={setSelectedBox}
          setScanDialogOpen={setScanDialogOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>

      {/* DIALOGS */}
      {showUpload && <UploadModal uploading={uploading} onUpload={handleFileSelect} onClose={() => setShowUpload(false)} />}

      {showGridSetup && pendingUpload && (
        <GridSetupDialog
          imageUrl={pendingUpload.url}
          onComplete={handleGridSetupComplete}
          onCancel={() => { setShowGridSetup(false); setPendingUpload(null); }}
        />
      )}

      {showGridSettings && selectedPlan && (
        <GridSettingsDialog
          plan={selectedPlan}
          hasBoxes={boxesOnPlan.length > 0}
          onSave={handleUpdateGridSettings}
          onClose={() => setShowGridSettings(false)}
        />
      )}

      {createDialogOpen && selectedPlan && (
        <BoxCreateDialogFloorPlan
          objectId={objectId}
          floorPlanId={selectedPlan.id}
          position={createPosition}
          boxTypes={boxTypes}
          onClose={() => { setCreateDialogOpen(false); setMode("view"); }}
          onSave={handleBoxCreated}
        />
      )}

      {scanDialogOpen && selectedBox && (
        <BoxScanDialog
          box={selectedBox}
          onClose={() => { setScanDialogOpen(false); setSelectedBox(null); }}
          onSave={handleScanCompleted}
          onScanCreated={handleScanCompleted}
        />
      )}
    </div>
  );
}

// ============================================
// GRID SETUP DIALOG (beim Erstellen)
// ============================================
function GridSetupDialog({ imageUrl, onComplete, onCancel }) {
  const [mode, setMode] = useState("preset");
  const [selectedPreset, setSelectedPreset] = useState("medium");
  
  const [realWidth, setRealWidth] = useState(50);
  const [realHeight, setRealHeight] = useState(30);
  const [cellSize, setCellSize] = useState(2);

  const calculatedCols = mode === "custom" ? Math.ceil(realWidth / cellSize) : GRID_PRESETS[selectedPreset].cols;
  const calculatedRows = mode === "custom" ? Math.ceil(realHeight / cellSize) : GRID_PRESETS[selectedPreset].rows;

  const handleSave = () => {
    const config = {
      grid_mode: mode,
      grid_preset: mode === "preset" ? selectedPreset : null,
      real_width_m: mode === "custom" ? realWidth : null,
      real_height_m: mode === "custom" ? realHeight : null,
      cell_size_m: mode === "custom" ? cellSize : null,
      grid_cols: calculatedCols,
      grid_rows: calculatedRows
    };
    onComplete(config);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-3xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-blue-400" />
            Grid-Auflösung wählen
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Diese Einstellung legt fest, wie präzise Boxen positioniert werden können. <strong>Kann später nicht einfach geändert werden!</strong>
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Vorschau */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden h-48">
            <img src={imageUrl} alt="Preview" className="w-full h-full object-contain opacity-50" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-blue-600/20 border border-blue-500 rounded p-4 text-center">
                <div className="text-2xl font-bold text-white">{calculatedCols} × {calculatedRows}</div>
                <div className="text-blue-300 text-sm">Zellen insgesamt: {calculatedCols * calculatedRows}</div>
              </div>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex bg-gray-900 rounded-lg p-1">
            <button
              onClick={() => setMode("preset")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                mode === "preset" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-4 h-4 inline mr-2" />
              Vordefiniert
            </button>
            <button
              onClick={() => setMode("custom")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                mode === "custom" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <Ruler className="w-4 h-4 inline mr-2" />
              Echte Maße eingeben
            </button>
          </div>

          {/* PRESET MODE */}
          {mode === "preset" && (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(GRID_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => setSelectedPreset(key)}
                  className={`p-4 rounded-lg border-2 text-left transition ${
                    selectedPreset === key
                      ? "border-blue-500 bg-blue-600/20"
                      : "border-gray-700 bg-gray-900 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{preset.icon}</span>
                    <span className="font-bold text-white">{preset.name}</span>
                    {selectedPreset === key && <Check className="w-4 h-4 text-blue-400 ml-auto" />}
                  </div>
                  <p className="text-gray-400 text-sm">{preset.description}</p>
                </button>
              ))}
            </div>
          )}

          {/* CUSTOM MODE */}
          {mode === "custom" && (
            <div className="bg-gray-900 rounded-lg p-4 space-y-4">
              <p className="text-gray-300 text-sm">
                Geben Sie die echten Maße des Bereichs ein. Das Grid wird automatisch berechnet.
              </p>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Breite (Meter)</label>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={realWidth}
                    onChange={(e) => setRealWidth(parseInt(e.target.value) || 50)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Höhe (Meter)</label>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={realHeight}
                    onChange={(e) => setRealHeight(parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Zellengröße (Meter)</label>
                  <select
                    value={cellSize}
                    onChange={(e) => setCellSize(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-lg"
                  >
                    <option value={0.5}>0.5 m (sehr fein)</option>
                    <option value={1}>1 m (fein)</option>
                    <option value={2}>2 m (standard)</option>
                    <option value={5}>5 m (grob)</option>
                    <option value={10}>10 m (sehr grob)</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-900/30 border border-blue-700 rounded p-3">
                <div className="flex items-center justify-between">
                  <span className="text-blue-300">Berechnetes Grid:</span>
                  <span className="text-white font-bold text-lg">{calculatedCols} × {calculatedRows} = {calculatedCols * calculatedRows} Zellen</span>
                </div>
                <p className="text-blue-400 text-xs mt-1">
                  Jede Zelle entspricht {cellSize}m × {cellSize}m = {cellSize * cellSize}m²
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Lageplan erstellen
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// GRID SETTINGS DIALOG (für bestehende Pläne)
// ============================================
function GridSettingsDialog({ plan, hasBoxes, onSave, onClose }) {
  const [mode, setMode] = useState(plan.grid_mode || "preset");
  const [selectedPreset, setSelectedPreset] = useState(plan.grid_preset || "medium");
  const [realWidth, setRealWidth] = useState(plan.real_width_m || 50);
  const [realHeight, setRealHeight] = useState(plan.real_height_m || 30);
  const [cellSize, setCellSize] = useState(plan.cell_size_m || 2);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null

  const calculatedCols = mode === "custom" ? Math.ceil(realWidth / cellSize) : GRID_PRESETS[selectedPreset]?.cols || 20;
  const calculatedRows = mode === "custom" ? Math.ceil(realHeight / cellSize) : GRID_PRESETS[selectedPreset]?.rows || 20;

  const handleSave = async () => {
    if (hasBoxes) {
      if (!confirm("⚠️ WARNUNG: Grid-Änderung bei platzierten Boxen kann zu falschen Positionen führen! Fortfahren?")) {
        return;
      }
    }

    setSaving(true);
    setSaveStatus(null);

    const config = {
      grid_mode: mode,
      grid_preset: mode === "preset" ? selectedPreset : null,
      real_width_m: mode === "custom" ? realWidth : null,
      real_height_m: mode === "custom" ? realHeight : null,
      cell_size_m: mode === "custom" ? cellSize : null,
      grid_cols: calculatedCols,
      grid_rows: calculatedRows
    };

    try {
      await onSave(config);
      setSaveStatus('success');
      // Nach 1.5s schließen
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Save error:", err);
      setSaveStatus('error');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full border border-gray-700">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            Grid-Einstellungen: {plan.name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" disabled={saving}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Toast */}
        {saveStatus === 'success' && (
          <div className="mx-4 mt-4 p-3 bg-green-900/50 border border-green-600 rounded-lg flex items-center gap-3">
            <Check className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-green-300 font-medium">Erfolgreich gespeichert!</p>
              <p className="text-green-400 text-sm">Grid: {calculatedCols} × {calculatedRows} Zellen</p>
            </div>
          </div>
        )}

        {/* Error Toast */}
        {saveStatus === 'error' && (
          <div className="mx-4 mt-4 p-3 bg-red-900/50 border border-red-600 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <p className="text-red-300 font-medium">Fehler beim Speichern</p>
              <p className="text-red-400 text-sm">Bitte versuche es erneut.</p>
            </div>
          </div>
        )}

        {hasBoxes && !saveStatus && (
          <div className="mx-4 mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 font-medium">Achtung: Boxen bereits platziert</p>
              <p className="text-yellow-400 text-sm">Grid-Änderungen können die Positionen der Boxen verfälschen!</p>
            </div>
          </div>
        )}

        {saveStatus !== 'success' && (
          <>
            <div className="p-4 space-y-4">
              <div className="flex bg-gray-900 rounded-lg p-1">
                <button
                  onClick={() => setMode("preset")}
                  disabled={saving}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                    mode === "preset" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                  } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Vordefiniert
                </button>
                <button
                  onClick={() => setMode("custom")}
                  disabled={saving}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                    mode === "custom" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                  } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Echte Maße
                </button>
              </div>

              {mode === "preset" && (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(GRID_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedPreset(key)}
                      disabled={saving}
                      className={`p-3 rounded-lg border text-left ${
                        selectedPreset === key
                          ? "border-blue-500 bg-blue-600/20"
                          : "border-gray-700 bg-gray-900 hover:border-gray-600"
                      } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <span className="text-lg mr-2">{preset.icon}</span>
                      <span className="text-white text-sm">{preset.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {mode === "custom" && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Breite (m)</label>
                    <input
                      type="number"
                      value={realWidth}
                      onChange={(e) => setRealWidth(parseInt(e.target.value) || 50)}
                      disabled={saving}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Höhe (m)</label>
                    <input
                      type="number"
                      value={realHeight}
                      onChange={(e) => setRealHeight(parseInt(e.target.value) || 30)}
                      disabled={saving}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Zellengröße (m)</label>
                    <select
                      value={cellSize}
                      onChange={(e) => setCellSize(parseFloat(e.target.value))}
                      disabled={saving}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm disabled:opacity-50"
                    >
                      <option value={0.5}>0.5 m</option>
                      <option value={1}>1 m</option>
                      <option value={2}>2 m</option>
                      <option value={5}>5 m</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="bg-gray-900 rounded p-3 text-center">
                <span className="text-gray-400">Ergebnis: </span>
                <span className="text-white font-bold">{calculatedCols} × {calculatedRows}</span>
                <span className="text-gray-400"> Zellen</span>
              </div>
            </div>

            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button 
                onClick={onClose} 
                disabled={saving}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Abbrechen
              </button>
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Speichern
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {saveStatus === 'success' && (
          <div className="p-4 border-t border-gray-700">
            <button 
              onClick={onClose} 
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Schließen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// BOX CREATE DIALOG
// ============================================
function BoxCreateDialogFloorPlan({ objectId, floorPlanId, position, boxTypes, onClose, onSave }) {
  const token = localStorage.getItem("trapmap_token");

  const [boxTypeId, setBoxTypeId] = useState("");
  const [notes, setNotes] = useState("");
  const [intervalType, setIntervalType] = useState("fixed");
  const [intervalFixed, setIntervalFixed] = useState(30);
  const [intervalRangeStart, setIntervalRangeStart] = useState(20);
  const [intervalRangeEnd, setIntervalRangeEnd] = useState(30);
  const [saving, setSaving] = useState(false);

  const handleSaveBox = async () => {
    if (!boxTypeId) {
      alert("Bitte Box-Typ auswählen!");
      return;
    }

    setSaving(true);

    const interval = intervalType === "fixed"
      ? intervalFixed
      : Math.floor((intervalRangeStart + intervalRangeEnd) / 2);

    try {
      const res = await fetch(`${API}/boxes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          object_id: objectId,
          box_type_id: parseInt(boxTypeId),
          notes,
          control_interval_days: interval,
          floor_plan_id: floorPlanId,
          pos_x: position.x,
          pos_y: position.y,
          grid_position: position.gridPosition,
          current_status: "green"
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert("Fehler: " + (err.error || "Unbekannt"));
        setSaving(false);
        return;
      }

      const newBox = await res.json();
      if (newBox?.id) {
        await fetch(`${API}/scans`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            box_id: newBox.id,
            status: "green",
            notes: "Erstinstallation"
          }),
        });
      }

      onSave();
    } catch (e) {
      console.error("Error creating box:", e);
      alert("Fehler beim Erstellen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dialog-overlay-v6" onClick={(e) => { if (e.target.className === "dialog-overlay-v6") onClose(); }}>
      <div className="dialog-v6" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header-v6">
          <h2>📦 Neue Box erstellen</h2>
          <button className="dialog-close-v6" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="dialog-body-v6">
          <div style={{ padding: "12px", background: "#1e3a5f", borderRadius: "8px", color: "#93c5fd", fontSize: "13px", marginBottom: "16px" }}>
            ℹ️ Die Box-Nummer wird automatisch vergeben
          </div>

          <label>
            Box-Typ *
            <select value={boxTypeId} onChange={(e) => setBoxTypeId(e.target.value)} required>
              <option value="">Bitte auswählen...</option>
              {boxTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </label>

          <label>Kontrollintervall *</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setIntervalType("fixed")}
                style={{
                  padding: "8px 16px",
                  background: intervalType === "fixed" ? "#6366f1" : "#1a1a1a",
                  border: `1px solid ${intervalType === "fixed" ? "#6366f1" : "#404040"}`,
                  borderRadius: "6px",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Fix
              </button>
              <button
                type="button"
                onClick={() => setIntervalType("range")}
                style={{
                  padding: "8px 16px",
                  background: intervalType === "range" ? "#6366f1" : "#1a1a1a",
                  border: `1px solid ${intervalType === "range" ? "#6366f1" : "#404040"}`,
                  borderRadius: "6px",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Range
              </button>
            </div>

            {intervalType === "fixed" && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={intervalFixed}
                  onChange={(e) => setIntervalFixed(parseInt(e.target.value) || 30)}
                  style={{ flex: 1, padding: "8px 12px", background: "#1a1a1a", border: "1px solid #404040", borderRadius: "6px", color: "#fff", textAlign: "center" }}
                />
                <span style={{ color: "#9ca3af" }}>Tage</span>
              </div>
            )}

            {intervalType === "range" && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={intervalRangeStart}
                  onChange={(e) => setIntervalRangeStart(parseInt(e.target.value) || 20)}
                  style={{ flex: 1, padding: "8px 12px", background: "#1a1a1a", border: "1px solid #404040", borderRadius: "6px", color: "#fff", textAlign: "center" }}
                />
                <span style={{ color: "#9ca3af" }}>bis</span>
                <input
                  type="number"
                  min={intervalRangeStart}
                  max="365"
                  value={intervalRangeEnd}
                  onChange={(e) => setIntervalRangeEnd(parseInt(e.target.value) || 30)}
                  style={{ flex: 1, padding: "8px 12px", background: "#1a1a1a", border: "1px solid #404040", borderRadius: "6px", color: "#fff", textAlign: "center" }}
                />
                <span style={{ color: "#9ca3af" }}>Tage</span>
              </div>
            )}
          </div>

          <label>
            Notizen
            <textarea rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Zusätzliche Informationen..." />
          </label>

          <div style={{ padding: "12px", background: "#1a1a1a", borderRadius: "6px", color: "#9ca3af", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>📍 Position: {position.x.toFixed(1)}%, {position.y.toFixed(1)}%</span>
            {position.gridPosition && (
              <span style={{ background: "#22c55e", color: "#fff", padding: "4px 12px", borderRadius: "6px", fontWeight: "bold", fontFamily: "monospace" }}>
                {position.gridPosition}
              </span>
            )}
          </div>
        </div>

        <div className="dialog-footer-v6">
          <button className="btn-secondary-v6" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary-v6" onClick={handleSaveBox} disabled={saving}>
            <Save size={16} />
            {saving ? "Erstellen..." : "Erstellen"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SUB COMPONENTS
// ============================================

function ModeButton({ icon: Icon, label, active, onClick, color, disabled }) {
  const colors = { green: "bg-green-600", yellow: "bg-yellow-600", orange: "bg-orange-600", default: "bg-blue-600" };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition ${
        disabled ? "opacity-50 cursor-not-allowed" :
        active ? `${colors[color] || colors.default} text-white` : "text-gray-400 hover:text-white hover:bg-gray-600"
      }`}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function DrawToolButton({ icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded transition ${active ? "bg-orange-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function StatusDot({ status }) {
  const colors = { green: "#10b981", yellow: "#eab308", orange: "#f97316", red: "#ef4444", gray: "#6b7280" };
  return <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[status] || colors.gray }}></div>;
}

// ============================================
// GRID LABELS - Intelligent Spacing
// ============================================
function GridLabels({ gridConfig, zoom }) {
  const { cols, rows } = gridConfig;
  
  // Berechne wie viele Labels wir anzeigen können ohne Überlappung
  const getSkipInterval = (count, isVertical = false) => {
    const effectiveSize = isVertical ? 12 : 20; // Mindestbreite pro Label in px
    const availableSpace = isVertical ? 500 : 800; // Ungefähre verfügbare Größe
    const spacePerItem = (availableSpace * zoom) / count;
    
    if (spacePerItem >= effectiveSize) return 1; // Alle anzeigen
    if (spacePerItem >= effectiveSize / 2) return 2; // Jeden 2.
    if (spacePerItem >= effectiveSize / 5) return 5; // Jeden 5.
    if (spacePerItem >= effectiveSize / 10) return 10; // Jeden 10.
    return Math.ceil(effectiveSize / spacePerItem);
  };

  const colSkip = getSkipInterval(cols, false);
  const rowSkip = getSkipInterval(rows, true);
  
  // Entscheide ob Labels vertikal rotiert werden sollen
  const rotateColLabels = cols > 30;
  
  return (
    <>
      {/* Spalten-Labels (oben) */}
      <div 
        className="absolute left-0 right-0 flex" 
        style={{ top: rotateColLabels ? -24 : -14 }}
      >
        {Array.from({ length: cols }).map((_, i) => {
          // Nur jeden n-ten anzeigen
          if (i % colSkip !== 0) return null;
          
          const label = getColLabel(i, cols);
          
          return (
            <div
              key={i}
              className="text-blue-400 font-mono font-bold"
              style={{ 
                position: 'absolute',
                left: `${(i / cols) * 100}%`,
                width: `${(colSkip / cols) * 100}%`,
                fontSize: Math.max(7, Math.min(11, 10 / zoom)),
                textAlign: 'center',
                transform: rotateColLabels ? 'rotate(-45deg)' : 'none',
                transformOrigin: 'center bottom',
                whiteSpace: 'nowrap'
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
      
      {/* Zeilen-Labels (links) */}
      <div 
        className="absolute top-0 bottom-0 flex flex-col" 
        style={{ left: -22, width: 20 }}
      >
        {Array.from({ length: rows }).map((_, i) => {
          // Nur jeden n-ten anzeigen
          if (i % rowSkip !== 0) return null;
          
          return (
            <div
              key={i}
              className="text-blue-400 font-mono font-bold text-right pr-1"
              style={{ 
                position: 'absolute',
                top: `${(i / rows) * 100}%`,
                height: `${(rowSkip / rows) * 100}%`,
                width: '100%',
                fontSize: Math.max(6, Math.min(10, 9 / zoom)),
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-end'
              }}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ============================================
// BOX MARKER - MIT EMOJI ICONS
// ============================================
function BoxMarker({ box, onClick, disabled, zoom }) {
  const colors = { green: "#10b981", yellow: "#eab308", orange: "#f97316", red: "#ef4444", gray: "#6b7280" };
  const color = colors[box.current_status] || colors.gray;
  const size = Math.max(16, Math.min(26, 22 / zoom));
  const fontSize = Math.max(6, Math.min(9, 8 / zoom));

  // Get emoji icons for this box type
  const emojis = getBoxTypeEmojis(box.box_type_name);
  const hasEmojis = emojis && emojis.length > 0;

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`absolute ${disabled ? "" : "cursor-pointer hover:scale-110"} transition-transform z-10`}
      style={{ 
        left: `${box.pos_x}%`, 
        top: `${box.pos_y}%`,
        transform: hasEmojis ? 'translate(-50%, -100%)' : 'translate(-50%, -50%)'
      }}
    >
      {/* Emoji Badge - über dem Kreis */}
      {hasEmojis && (
        <div className="flex justify-center mb-1">
          <div 
            className="bg-black/90 rounded px-1.5 py-0.5 border border-white/30 shadow-lg"
            style={{ fontSize: Math.max(8, Math.min(12, 10 / zoom)) }}
          >
            {emojis}
          </div>
        </div>
      )}

      {/* Status Kreis mit Nummer */}
      <div
        className="rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-white"
        style={{ backgroundColor: color, width: size, height: size, fontSize }}
      >
        {box.number?.toString().slice(0, 3) || "?"}
      </div>

      {/* Grid Position Label */}
      {box.grid_position && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 bg-black/80 text-white px-1 rounded whitespace-nowrap font-mono"
          style={{ top: size + 1, fontSize: Math.max(5, fontSize - 1) }}
        >
          {box.grid_position}
        </div>
      )}
    </div>
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

// ============================================
// SIDEBAR - MIT EMOJI ICONS
// ============================================
function Sidebar({ open, boxesOnPlan, unplacedBoxes, draggedBox, setDraggedBox, setMode, setSelectedBox, setScanDialogOpen, onToggle }) {
  return (
    <>
      <div className={`${open ? "w-56" : "w-0"} bg-gray-800 border-l border-gray-700 overflow-hidden transition-all flex flex-col shrink-0`}>
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          <div className="text-center p-2 bg-gray-900 rounded-lg">
            <div className="text-xl font-bold text-white">{boxesOnPlan.length}</div>
            <div className="text-xs text-gray-400">Boxen platziert</div>
          </div>

          {unplacedBoxes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 mb-1">Nicht platziert ({unplacedBoxes.length})</h4>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {unplacedBoxes.map(box => {
                  const emojis = getBoxTypeEmojis(box.box_type_name);
                  return (
                    <div
                      key={box.id}
                      className={`p-1.5 rounded text-xs cursor-pointer transition ${
                        draggedBox?.id === box.id ? "bg-yellow-600 text-white" : "bg-gray-900 text-gray-300 hover:bg-gray-700"
                      }`}
                      onClick={() => { setDraggedBox(box); setMode("place"); }}
                    >
                      <div className="flex items-center gap-1.5">
                        <StatusDot status={box.current_status} />
                        <span>{box.number || `Box ${box.id}`}</span>
                        {emojis && <span className="text-xs">{emojis}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-gray-400 mb-1">Auf Plan ({boxesOnPlan.length})</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {boxesOnPlan.map(box => {
                const emojis = getBoxTypeEmojis(box.box_type_name);
                return (
                  <div
                    key={box.id}
                    className="p-1.5 rounded text-xs bg-gray-900 text-gray-300 hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                    onClick={() => { setSelectedBox(box); setScanDialogOpen(true); }}
                  >
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={box.current_status} />
                      <span>{box.number || `Box ${box.id}`}</span>
                      {emojis && <span className="text-xs">{emojis}</span>}
                    </div>
                    {box.grid_position && (
                      <span className="text-[9px] bg-blue-600/30 text-blue-300 px-1 rounded font-mono">
                        {box.grid_position}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-2 bg-gray-900 rounded-lg">
            <h5 className="text-[10px] font-semibold text-gray-400 mb-1">Legende</h5>
            <div className="grid grid-cols-2 gap-0.5">
              {Object.entries(STATUS_COLORS).map(([key, { bg, label }]) => (
                <div key={key} className="flex items-center gap-1 text-[9px] text-gray-400">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bg }}></div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-2 border-t border-gray-700">
          <button
            onClick={() => setMode("create")}
            className="w-full px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-1 text-xs"
          >
            <Plus className="w-3 h-3" /> Neue Box
          </button>
        </div>
      </div>

      <button
        onClick={onToggle}
        className="absolute top-1/2 bg-gray-700 hover:bg-gray-600 p-1 rounded-l text-white z-10"
        style={{ right: open ? "224px" : "0", transform: "translateY(-50%)" }}
      >
        {open ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </>
  );
}

function UploadModal({ uploading, onUpload, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">Lageplan hochladen</h3>
        <label className={`block w-full p-8 border-2 border-dashed rounded-lg text-center cursor-pointer ${
          uploading ? "border-gray-600" : "border-gray-600 hover:border-blue-500"
        }`}>
          {uploading ? (
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400">Bild auswählen</p>
              <p className="text-gray-500 text-sm mt-1">Nach dem Upload: Grid-Auflösung wählen</p>
            </>
          )}
          <input type="file" accept="image/*" onChange={onUpload} className="hidden" disabled={uploading} />
        </label>
        <button onClick={onClose} disabled={uploading} className="mt-4 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
          Abbrechen
        </button>
      </div>
    </div>
  );
}