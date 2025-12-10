import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { 
  Upload, Plus, Trash2, MapPin, Grid3X3, X, ZoomIn, ZoomOut, 
  Package, Scan, Eye, History, Camera, Move
} from "lucide-react";
import BoxCreateOnPlanDialog from "./BoxCreateOnPlanDialog";
import BoxScanDialog from "./BoxScanDialog";
import BoxEditDialogFloorPlan from "./BoxEditDialogFloorPlan";

const API = import.meta.env.VITE_API_URL;

export default function FloorPlanEditor({ objectId, objectName }) {
  const [floorPlans, setFloorPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [boxesOnPlan, setBoxesOnPlan] = useState([]);
  const [unplacedBoxes, setUnplacedBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [zoom, setZoom] = useState(100);
  
  // Modes: "view", "place", "create"
  const [mode, setMode] = useState("view");
  const [draggedBox, setDraggedBox] = useState(null);
  
  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createPosition, setCreatePosition] = useState({ x: 0, y: 0 });
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [selectedBox, setSelectedBox] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [relocateMode, setRelocateMode] = useState(false);
  const [relocatingBox, setRelocatingBox] = useState(null);
  const [boxTypes, setBoxTypes] = useState([]);
  
  const containerRef = useRef(null);
  
  const token = localStorage.getItem("trapmap_token");
  const headers = { Authorization: `Bearer ${token}` };

  // ============================================
  // Load Data
  // ============================================
  
  // Reset all dialogs on mount
  useEffect(() => {
    setCreateDialogOpen(false);
    setScanDialogOpen(false);
    setEditDialogOpen(false);
    setSelectedBox(null);
  }, []);
  
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
    }
  }, [selectedPlan]);

  const loadFloorPlans = async () => {
    try {
      const res = await axios.get(`${API}/floorplans/object/${objectId}`, { headers });
      setFloorPlans(res.data);
      if (res.data.length > 0 && !selectedPlan) {
        setSelectedPlan(res.data[0]);
      }
    } catch (err) {
      console.error("Error loading floor plans:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadBoxesOnPlan = async (planId) => {
    try {
      const res = await axios.get(`${API}/floorplans/${planId}/boxes`, { headers });
      setBoxesOnPlan(res.data);
    } catch (err) {
      console.error("Error loading boxes on plan:", err);
    }
  };

  const loadUnplacedBoxes = async () => {
    try {
      const res = await axios.get(`${API}/floorplans/object/${objectId}/unplaced`, { headers });
      setUnplacedBoxes(res.data);
    } catch (err) {
      console.error("Error loading unplaced boxes:", err);
    }
  };

  const loadBoxTypes = async () => {
    try {
      const res = await axios.get(`${API}/boxtypes`, { headers });
      setBoxTypes(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch (err) {
      console.error("Error loading box types:", err);
    }
  };

  // ============================================
  // Upload Floor Plan
  // ============================================
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const uploadRes = await axios.post(`${API}/floorplans/upload`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });

      const name = prompt("Name für den Lageplan:", "Halle 1");
      if (!name) {
        setUploading(false);
        return;
      }

      const createRes = await axios.post(`${API}/floorplans`, {
        object_id: objectId,
        name,
        image_url: uploadRes.data.url
      }, { headers });

      setFloorPlans([...floorPlans, createRes.data]);
      setSelectedPlan(createRes.data);
      setShowUpload(false);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Fehler beim Hochladen: " + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  // ============================================
  // Delete Floor Plan
  // ============================================
  const handleDeletePlan = async (planId, e) => {
    e.stopPropagation();
    if (!confirm("Lageplan wirklich löschen?")) return;

    try {
      await axios.delete(`${API}/floorplans/${planId}`, { headers });
      const newPlans = floorPlans.filter(p => p.id !== planId);
      setFloorPlans(newPlans);
      if (selectedPlan?.id === planId) {
        setSelectedPlan(newPlans[0] || null);
      }
      loadUnplacedBoxes();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // ============================================
  // Handle Plan Click
  // ============================================
  const handlePlanClick = async (e) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(2, Math.min(98, x));
    const clampedY = Math.max(2, Math.min(98, y));

    // Mode: Create new box
    if (mode === "create") {
      setCreatePosition({ x: clampedX, y: clampedY });
      setCreateDialogOpen(true);
      return;
    }

    // Mode: Place existing box
    if (mode === "place" && draggedBox) {
      try {
        await axios.put(`${API}/floorplans/${selectedPlan.id}/boxes/${draggedBox.id}`, {
          pos_x: clampedX,
          pos_y: clampedY
        }, { headers });

        loadBoxesOnPlan(selectedPlan.id);
        loadUnplacedBoxes();
        setDraggedBox(null);
        setMode("view");
      } catch (err) {
        console.error("Place box error:", err);
      }
    }

    // Mode: Relocate existing box (from Edit Dialog)
    if (relocateMode && relocatingBox) {
      try {
        await axios.put(`${API}/floorplans/${selectedPlan.id}/boxes/${relocatingBox.id}`, {
          pos_x: clampedX,
          pos_y: clampedY
        }, { headers });

        loadBoxesOnPlan(selectedPlan.id);
        setRelocatingBox(null);
        setRelocateMode(false);
      } catch (err) {
        console.error("Relocate box error:", err);
      }
    }
  };

  // ============================================
  // Box Interactions
  // ============================================
  const handleBoxClick = (box, e) => {
    e.stopPropagation();
    
    // If in relocate mode, don't open scan dialog
    if (relocateMode) return;
    
    if (mode === "view") {
      setSelectedBox(box);
      setScanDialogOpen(true);
    }
  };

  const handleBoxDragEnd = async (boxId, newX, newY) => {
    try {
      await axios.put(`${API}/floorplans/${selectedPlan.id}/boxes/${boxId}`, {
        pos_x: newX,
        pos_y: newY
      }, { headers });
      loadBoxesOnPlan(selectedPlan.id);
    } catch (err) {
      console.error("Move box error:", err);
    }
  };

  // KEIN handleRemoveBox! Boxen werden NICHT per Klick entfernt!

  // ============================================
  // Callbacks
  // ============================================
  const handleBoxCreated = () => {
    loadBoxesOnPlan(selectedPlan.id);
    loadUnplacedBoxes();
    setMode("view");
    setCreateDialogOpen(false);
  };

  const handleScanCompleted = () => {
    loadBoxesOnPlan(selectedPlan.id);
    setScanDialogOpen(false);
    setSelectedBox(null);
  };

  // Edit button in Scan Dialog clicked
  const handleEditBox = () => {
    setScanDialogOpen(false);
    setEditDialogOpen(true);
  };

  // Edit dialog saved
  const handleEditSaved = () => {
    loadBoxesOnPlan(selectedPlan.id);
    setEditDialogOpen(false);
    setSelectedBox(null);
  };

  // Relocate from Edit Dialog
  const handleRelocateBox = (box) => {
    setRelocatingBox(box);
    setRelocateMode(true);
    setSelectedBox(null);
  };

  // Cancel relocate mode
  const cancelRelocate = () => {
    setRelocatingBox(null);
    setRelocateMode(false);
  };

  // ============================================
  // Render
  // ============================================
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="animate-pulse h-64 bg-gray-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Lagepläne</h3>
          <span className="text-gray-400 text-sm">({floorPlans.length})</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Mode Buttons */}
          {selectedPlan && (
            <>
              <button
                onClick={() => {
                  setMode(mode === "create" ? "view" : "create");
                  setDraggedBox(null);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                  mode === "create"
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                <Plus className="w-4 h-4" />
                Box erstellen
              </button>
              
              <button
                onClick={() => {
                  setMode(mode === "place" ? "view" : "place");
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                  mode === "place"
                    ? "bg-yellow-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                <MapPin className="w-4 h-4" />
                Box platzieren
              </button>
            </>
          )}
          
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            <Upload className="w-4 h-4" />
            Neuer Lageplan
          </button>
        </div>
      </div>

      {/* Mode Indicator */}
      {mode !== "view" && (
        <div className={`px-4 py-2 text-sm flex items-center justify-between ${
          mode === "create" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
        }`}>
          <span>
            {mode === "create" 
              ? "🎯 Klicken Sie auf den Plan um eine neue Box zu erstellen"
              : "📍 Wählen Sie eine Box rechts und klicken Sie auf den Plan"
            }
          </span>
          <span
            onClick={() => { setMode("view"); setDraggedBox(null); }}
            className="px-2 py-1 bg-gray-800 rounded text-gray-300 hover:text-white cursor-pointer"
          >
            Abbrechen
          </span>
        </div>
      )}

      {/* Plan Tabs */}
      {floorPlans.length > 0 && (
        <div className="flex border-b border-gray-700 bg-gray-900/50 overflow-x-auto">
          {floorPlans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              className={`px-4 py-2 text-sm whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                selectedPlan?.id === plan.id
                  ? "bg-gray-800 text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              {plan.name}
              <span
                onClick={(e) => handleDeletePlan(plan.id, e)}
                className="p-1 hover:bg-red-500/20 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {floorPlans.length === 0 ? (
          <EmptyState onUpload={handleUpload} />
        ) : selectedPlan ? (
          <div className="flex gap-4">
            {/* Plan Image with Boxes */}
            <div className="flex-1">
              {/* Zoom Controls */}
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setZoom(Math.max(50, zoom - 25))}
                  className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  <ZoomOut className="w-4 h-4 text-white" />
                </button>
                <span className="text-gray-400 text-sm w-12 text-center">{zoom}%</span>
                <button
                  onClick={() => setZoom(Math.min(200, zoom + 25))}
                  className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  <ZoomIn className="w-4 h-4 text-white" />
                </button>
                <span
                  onClick={() => setZoom(100)}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 cursor-pointer"
                >
                  Reset
                </span>
                
                <span className="ml-4 text-gray-500 text-xs">
                  {boxesOnPlan.length} Boxen auf Plan
                </span>
              </div>

              {/* Plan Container */}
              <div 
                className="overflow-auto bg-gray-900 rounded-lg" 
                style={{ maxHeight: "70vh" }}
              >
                <div
                  ref={containerRef}
                  className={`relative ${
                    mode === "create" ? "cursor-crosshair" : 
                    mode === "place" && draggedBox ? "cursor-crosshair" : ""
                  }`}
                  onClick={handlePlanClick}
                  style={{ width: `${zoom}%`, minWidth: "100%" }}
                >
                  <img
                    src={selectedPlan.image_url}
                    alt={selectedPlan.name}
                    className="w-full h-auto"
                    draggable={false}
                    onError={(e) => {
                      e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23374151' width='400' height='300'/%3E%3Ctext fill='%239CA3AF' x='50%25' y='50%25' text-anchor='middle'%3EBild nicht gefunden%3C/text%3E%3C/svg%3E";
                    }}
                  />

                  {/* Boxes on Plan */}
                  {boxesOnPlan.map((box) => (
                    <BoxMarker
                      key={box.id}
                      box={box}
                      containerRef={containerRef}
                      onDragEnd={(newX, newY) => handleBoxDragEnd(box.id, newX, newY)}
                      onClick={(e) => handleBoxClick(box, e)}
                      disabled={mode !== "view"}
                    />
                  ))}

                  {/* Mode Overlays */}
                  {mode === "create" && (
                    <div className="absolute inset-0 bg-green-500/5 border-2 border-dashed border-green-500 pointer-events-none"></div>
                  )}
                  {mode === "place" && draggedBox && (
                    <div className="absolute inset-0 bg-yellow-500/5 border-2 border-dashed border-yellow-500 pointer-events-none flex items-center justify-center">
                      <p className="bg-yellow-600 text-white px-4 py-2 rounded-lg shadow-lg">
                        Klicken um "{draggedBox.number || draggedBox.name}" zu platzieren
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-64 shrink-0 space-y-4">
              {/* Unplaced Boxes (only in place mode) */}
              {mode === "place" && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Nicht platzierte Boxen
                  </h4>
                  
                  {unplacedBoxes.length === 0 ? (
                    <div className="text-center py-4 bg-gray-900/50 rounded-lg border border-gray-700">
                      <p className="text-green-400 text-sm">✓ Alle Boxen platziert</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {unplacedBoxes.map((box) => (
                        <div
                          key={box.id}
                          className={`p-3 rounded-lg border cursor-pointer transition ${
                            draggedBox?.id === box.id
                              ? "bg-yellow-600 border-yellow-500 text-white"
                              : "bg-gray-900 border-gray-700 hover:border-yellow-500 text-white"
                          }`}
                          onClick={() => setDraggedBox(draggedBox?.id === box.id ? null : box)}
                        >
                          <div className="flex items-center gap-2">
                            <StatusDot status={box.current_status} />
                            <span className="font-medium text-sm">
                              {box.number || `Box ${box.id}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Boxes on Plan */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Boxen auf Lageplan ({boxesOnPlan.length})
                </h4>
                
                {boxesOnPlan.length === 0 ? (
                  <div className="text-center py-4 bg-gray-900/50 rounded-lg border border-gray-700">
                    <p className="text-gray-500 text-sm">Keine Boxen auf diesem Plan</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {boxesOnPlan.map((box) => (
                      <div
                        key={box.id}
                        className="p-2 rounded-lg bg-gray-900 border border-gray-700 hover:border-blue-500 cursor-pointer transition"
                        onClick={() => {
                          setSelectedBox(box);
                          setScanDialogOpen(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StatusDot status={box.current_status} />
                            <span className="font-medium text-sm text-white">
                              {box.number || `Box ${box.id}`}
                            </span>
                          </div>
                          <Scan className="w-4 h-4 text-gray-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Legend */}
              <Legend />
            </div>
          </div>
        ) : null}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal 
          uploading={uploading} 
          onUpload={handleUpload} 
          onClose={() => setShowUpload(false)} 
        />
      )}

      {/* Create Box Dialog - NUR RENDERN WENN OFFEN */}
      {createDialogOpen && selectedPlan && (
        <BoxCreateOnPlanDialog
          objectId={objectId}
          floorPlanId={selectedPlan.id}
          position={createPosition}
          onClose={() => {
            setCreateDialogOpen(false);
            setMode("view");
          }}
          onCreated={handleBoxCreated}
        />
      )}

      {/* Relocate Mode Banner */}
      {relocateMode && relocatingBox && (
        <div 
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            background: "#1e40af",
            color: "#fff",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 100,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Move size={18} />
            <span>Klicken Sie auf die neue Position fuer Box <strong>{relocatingBox.number || relocatingBox.id}</strong></span>
          </div>
          <button
            onClick={cancelRelocate}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.3)",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Abbrechen
          </button>
        </div>
      )}

      {/* Scan Dialog - NUR RENDERN WENN OFFEN */}
      {scanDialogOpen && selectedBox && (
        <BoxScanDialog
          box={selectedBox}
          onClose={() => {
            setScanDialogOpen(false);
            setSelectedBox(null);
          }}
          onEdit={handleEditBox}
          onSave={handleScanCompleted}
          onScanCreated={handleScanCompleted}
        />
      )}

      {/* Edit Dialog - NUR RENDERN WENN OFFEN UND BOX MIT ID */}
      {editDialogOpen && selectedBox && selectedBox.id && (
        <BoxEditDialogFloorPlan
          box={selectedBox}
          boxTypes={boxTypes}
          floorPlanId={selectedPlan?.id}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedBox(null);
          }}
          onSave={handleEditSaved}
          onRelocate={handleRelocateBox}
        />
      )}
    </div>
  );
}

// ============================================
// Sub Components
// ============================================

function EmptyState({ onUpload }) {
  return (
    <div className="text-center py-12">
      <Grid3X3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
      <p className="text-gray-400 mb-2">Noch keine Lagepläne vorhanden</p>
      <p className="text-gray-500 text-sm mb-6">
        Laden Sie einen Grundriss hoch, um Boxen darauf zu platzieren
      </p>
      <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer">
        <Upload className="w-4 h-4" />
        Lageplan hochladen
        <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
      </label>
    </div>
  );
}

function UploadModal({ uploading, onUpload, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">Neuen Lageplan hochladen</h3>
        
        <label className={`block w-full p-8 border-2 border-dashed rounded-lg text-center transition ${
          uploading ? "border-gray-600 bg-gray-700/50 cursor-wait" : "border-gray-600 hover:border-blue-500 cursor-pointer"
        }`}>
          {uploading ? (
            <>
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-400">Wird hochgeladen...</p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400">Klicken oder Bild hierher ziehen</p>
              <p className="text-gray-500 text-sm mt-1">PNG, JPG, WEBP bis 10MB</p>
            </>
          )}
          <input type="file" accept="image/*" onChange={onUpload} className="hidden" disabled={uploading} />
        </label>

        <button
          onClick={onClose}
          disabled={uploading}
          className="mt-4 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
      <h5 className="text-xs font-semibold text-gray-400 mb-2">Legende</h5>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-400">OK</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-gray-400">Auffällig</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span className="text-gray-400">Erhöht</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-gray-400">Befall</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Box Marker Component
// WICHTIG: Kein Loeschen per Klick! Nur Scan-Dialog!
// ============================================
function BoxMarker({ box, containerRef, onDragEnd, onClick, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: box.pos_x, y: box.pos_y });

  useEffect(() => {
    setPosition({ x: box.pos_x, y: box.pos_y });
  }, [box.pos_x, box.pos_y]);

  const handleMouseDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startPosX = position.x;
    const startPosY = position.y;

    const handleMouseMove = (moveEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = ((moveEvent.clientX - startX) / rect.width) * 100;
      const deltaY = ((moveEvent.clientY - startY) / rect.height) * 100;
      const newX = Math.max(2, Math.min(98, startPosX + deltaX));
      const newY = Math.max(2, Math.min(98, startPosY + deltaY));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (position.x !== box.pos_x || position.y !== box.pos_y) {
        onDragEnd(position.x, position.y);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const statusColors = {
    green: "bg-green-500 border-green-400 shadow-green-500/50",
    yellow: "bg-yellow-500 border-yellow-400 shadow-yellow-500/50",
    orange: "bg-orange-500 border-orange-400 shadow-orange-500/50",
    red: "bg-red-500 border-red-400 shadow-red-500/50"
  };

  return (
    <div
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 group ${
        isDragging ? "cursor-grabbing z-50 scale-110" : disabled ? "cursor-default" : "cursor-grab"
      }`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transition: isDragging ? "none" : "transform 0.1s"
      }}
      onClick={onClick}
    >
      <div
        className={`w-7 h-7 rounded-full border-2 ${statusColors[box.current_status] || "bg-gray-500 border-gray-400"} shadow-lg flex items-center justify-center text-xs font-bold text-white`}
        onMouseDown={handleMouseDown}
        title={`${box.number} - Klicken fuer Kontrolle`}
      >
        {box.number?.toString().slice(-2) || "?"}
      </div>

      {/* Tooltip - NUR Info, KEIN Loeschen! */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
        <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg border border-gray-700">
          <strong>{box.number}</strong>
          {box.box_type_name && <span className="text-gray-400"> - {box.box_type_name}</span>}
          <br />
          <span className="text-blue-400">Klicken fuer Kontrolle</span>
        </div>
      </div>

      {/* KEIN REMOVE BUTTON! Boxen werden NICHT per Klick geloescht! */}
    </div>
  );
}

function StatusDot({ status }) {
  const colors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    orange: "bg-orange-500",
    red: "bg-red-500"
  };
  return <div className={`w-2.5 h-2.5 rounded-full ${colors[status] || "bg-gray-500"}`} />;
}