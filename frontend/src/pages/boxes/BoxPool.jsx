// ============================================
// BOX POOL (Lager) - KOMPLETT
// Alle Boxen der Organisation mit Filter & Zuweisung
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
  ExclamationCircleIcon
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
    
    // Box ID aus verschiedenen möglichen Stellen holen
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

  // Gefilterte Boxen
  const filteredBoxes = boxes.filter((qr) => {
    const box = qr.boxes;

    // Status-Filter
    if (filter === "pool" && box?.object_id) return false;
    // Zugewiesen = hat Objekt, aber NICHT platziert
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

  // Stats berechnen
  const stats = {
    pool: boxes.filter((q) => !q.boxes?.object_id).length,
    unplaced: boxes.filter((q) => q.boxes?.object_id && (!q.boxes?.position_type || q.boxes?.position_type === "none")).length,
    placed: boxes.filter((q) => q.boxes?.position_type && q.boxes?.position_type !== "none").length,
    total: boxes.length
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
          <ArchiveBoxIcon style={{ width: 28, height: 28 }} />
          Box-Lager
        </h1>
        <button onClick={loadData} style={{ padding: "8px 16px", background: "#374151", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <ArrowPathIcon style={{ width: 16, height: 16 }} />
          Aktualisieren
        </button>
      </div>

      {/* Filter & Search */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <MagnifyingGlassIcon style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, color: "#6b7280" }} />
          <input
            type="text"
            placeholder="QR-Code, Box-Nr, Objekt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 12px 10px 40px", background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#fff", fontSize: 14 }}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "all", label: "Alle" },
            { id: "pool", label: "Im Lager" },
            { id: "assigned", label: "Zugewiesen" },
            { id: "placed", label: "Platziert" }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{ padding: "8px 16px", background: filter === f.id ? "#3b82f6" : "#1f2937", border: "1px solid", borderColor: filter === f.id ? "#3b82f6" : "#374151", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 14 }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        <div style={{ background: "#1f2937", padding: 16, borderRadius: 8, borderLeft: "4px solid #6b7280" }}>
          <div style={{ color: "#9ca3af", fontSize: 12 }}>Im Lager</div>
          <div style={{ color: "#fff", fontSize: 24, fontWeight: 700 }}>{stats.pool}</div>
        </div>
        <div style={{ background: "#1f2937", padding: 16, borderRadius: 8, borderLeft: "4px solid #f59e0b" }}>
          <div style={{ color: "#9ca3af", fontSize: 12 }}>Unplatziert</div>
          <div style={{ color: "#fff", fontSize: 24, fontWeight: 700 }}>{stats.unplaced}</div>
        </div>
        <div style={{ background: "#1f2937", padding: 16, borderRadius: 8, borderLeft: "4px solid #10b981" }}>
          <div style={{ color: "#9ca3af", fontSize: 12 }}>Platziert</div>
          <div style={{ color: "#fff", fontSize: 24, fontWeight: 700 }}>{stats.placed}</div>
        </div>
        <div style={{ background: "#1f2937", padding: 16, borderRadius: 8, borderLeft: "4px solid #3b82f6" }}>
          <div style={{ color: "#9ca3af", fontSize: 12 }}>Gesamt</div>
          <div style={{ color: "#fff", fontSize: 24, fontWeight: 700 }}>{stats.total}</div>
        </div>
      </div>

      {/* Box Liste */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Laden...</div>
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
              <div key={qr.id} style={{ background: "#1f2937", borderRadius: 8, padding: 16, display: "flex", alignItems: "center", gap: 16, borderLeft: `4px solid ${status.color}` }}>
                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <QrCodeIcon style={{ width: 18, height: 18, color: "#6b7280" }} />
                    <span style={{ color: "#fff", fontWeight: 600, fontFamily: "monospace" }}>{qr.id}</span>
                    {box?.box_types?.name && <span style={{ color: "#9ca3af", fontSize: 13 }}>• {box.box_types.name}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#9ca3af", fontSize: 13, marginLeft: 26 }}>
                    {box?.objects?.name ? (
                      <>
                        <BuildingOfficeIcon style={{ width: 14, height: 14 }} />
                        {box.objects.name}
                      </>
                    ) : (
                      "Kein Objekt zugewiesen"
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: `${status.color}20`, borderRadius: 20, color: status.color, fontSize: 13 }}>
                  <StatusIcon style={{ width: 14, height: 14 }} />
                  {status.label}
                </div>

                {/* Actions */}
                {!box?.object_id ? (
                  <button onClick={() => setAssignDialog(qr)} style={{ padding: "8px 16px", background: "#3b82f6", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
                    <ArrowRightIcon style={{ width: 16, height: 16 }} />
                    Zuweisen
                  </button>
                ) : (
                  <button onClick={() => navigate(`/objects/${box.object_id}`)} style={{ padding: "8px 16px", background: "#374151", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 14 }}>
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
        <div onClick={() => setAssignDialog(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#1f2937", borderRadius: 12, width: "100%", maxWidth: 400, maxHeight: "80vh", overflow: "hidden" }}>
            <div style={{ padding: 20, borderBottom: "1px solid #374151" }}>
              <h3 style={{ color: "#fff", margin: 0, fontSize: 18 }}>Box zuweisen</h3>
              <p style={{ color: "#9ca3af", margin: "8px 0 0", fontSize: 14 }}>{assignDialog.id}</p>
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
                        style={{ padding: 16, background: "#111827", border: "1px solid #374151", borderRadius: 8, color: "#fff", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, opacity: assigning ? 0.5 : 1 }}
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
              <button onClick={() => setAssignDialog(null)} style={{ padding: "8px 20px", background: "#374151", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" }}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}