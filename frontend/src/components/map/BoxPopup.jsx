/* ============================================================
   TRAPMAP — BoxPopup.jsx (FINAL ENTERPRISE VERSION 2025)

   ✔ Kompatibel mit Maps.jsx + BoxMarkerGPS.jsx
   ✔ Perfektes Medium-Popup für Boxen
   ✔ Save nur aktiv, wenn Änderungen vorhanden
   ✔ Optimierte State-Logik
   ✔ Status-Farben vereinheitlicht
   ✔ Fertig für GPS-Live-Update
   ============================================================ */

import { useState, useEffect } from "react";
import "./Popup.css";

export default function BoxPopup({
  box,
  boxTypes,
  user,
  onClose,
  onSave,
  onStartGPS
}) {
  const [boxName, setBoxName] = useState(box.box_name);
  const [boxTypeId, setBoxTypeId] = useState(box.box_type_id);
  const [status, setStatus] = useState(box.current_status);
  const [notes, setNotes] = useState(box.notes || "");
  const [intervalType, setIntervalType] = useState("fixed");

  const [intervalFixed, setIntervalFixed] = useState(
    box.control_interval_days || 30
  );

  const [intervalStart, setIntervalStart] = useState(20);
  const [intervalEnd, setIntervalEnd] = useState(30);

  /* ============================================================
     STATUS COLORS (vereinheitlicht mit ObjectMarker / Scans)
     ============================================================ */
  const statusColors = [
    { id: "green", label: "OK", color: "#22c55e" },
    { id: "yellow", label: "Auffällig", color: "#eab308" },
    { id: "orange", label: "Fund", color: "#fb923c" },
    { id: "red", label: "Starker Befall", color: "#dc2626" },
    { id: "gray", label: "Leer / Temp", color: "#6b7280" },
    { id: "blue", label: "Info", color: "#3b82f6" }
  ];

  /* ============================================================
     HAS CHANGED – Nur aktiv, wenn wirklich was geändert wurde
     ============================================================ */
  const hasChanged =
    boxName !== box.box_name ||
    boxTypeId !== box.box_type_id ||
    status !== box.current_status ||
    notes !== (box.notes || "") ||
    (intervalType === "fixed"
      ? intervalFixed !== box.control_interval_days
      : false);

  /* ============================================================
     SAVE
     ============================================================ */
  function handleSave() {
    const payload = {
      box_name: boxName,
      box_type_id: boxTypeId,
      current_status: status,
      notes,
      control_interval_days:
        intervalType === "fixed"
          ? intervalFixed
          : Math.floor((intervalStart + intervalEnd) / 2)
    };

    onSave(payload);
  }

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="popup-wrap">
      <div className="popup">

        {/* HEADER */}
        <div className="popup-header">
          <h3>📦 Box bearbeiten</h3>
          <button className="popup-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* BODY */}
        <div className="popup-body">

          {/* NAME */}
          <label className="popup-label">Name</label>
          <input
            className="popup-input"
            value={boxName}
            onChange={(e) => setBoxName(e.target.value)}
          />

          {/* TYPE */}
          <label className="popup-label">Box-Typ</label>
          <select
            className="popup-input"
            value={boxTypeId}
            onChange={(e) => setBoxTypeId(parseInt(e.target.value))}
          >
            {boxTypes.map((bt) => (
              <option key={bt.id} value={bt.id}>
                {bt.name}
              </option>
            ))}
          </select>

          {/* STATUS */}
          <label className="popup-label">Status</label>

          <div className="status-row">
            {statusColors.map((s) => (
              <div
                key={s.id}
                className={`status-dot ${
                  status === s.id ? "active" : ""
                }`}
                style={{ background: s.color }}
                onClick={() => setStatus(s.id)}
                title={s.label}
              />
            ))}
          </div>

          {/* INTERVAL */}
          <label className="popup-label">Kontrollintervall</label>

          <div className="interval-box">

            {/* TABS */}
            <div className="interval-tabs">
              <button
                className={intervalType === "fixed" ? "active" : ""}
                onClick={() => setIntervalType("fixed")}
              >
                Fix
              </button>

              <button
                className={intervalType === "range" ? "active" : ""}
                onClick={() => setIntervalType("range")}
              >
                Range
              </button>
            </div>

            {/* FIXED */}
            {intervalType === "fixed" && (
              <input
                className="popup-input small"
                type="number"
                min={1}
                max={99}
                value={intervalFixed}
                onChange={(e) =>
                  setIntervalFixed(parseInt(e.target.value))
                }
              />
            )}

            {/* RANGE */}
            {intervalType === "range" && (
              <div className="range-row">
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={intervalStart}
                  onChange={(e) =>
                    setIntervalStart(parseInt(e.target.value))
                  }
                />
                <span>bis</span>
                <input
                  type="number"
                  min={intervalStart}
                  max={99}
                  value={intervalEnd}
                  onChange={(e) =>
                    setIntervalEnd(parseInt(e.target.value))
                  }
                />
              </div>
            )}
          </div>

          {/* NOTES */}
          <label className="popup-label">Notizen</label>
          <textarea
            className="popup-textarea"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* GPS BUTTON */}
          <div className="gps-btn-row">
            <button className="gps-btn" onClick={onStartGPS}>
              📍 GPS-Position ändern
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className="popup-footer">

          <button className="popup-cancel" onClick={onClose}>
            Abbrechen
          </button>

          <button
            className={`popup-save ${hasChanged ? "active" : ""}`}
            disabled={!hasChanged}
            onClick={handleSave}
          >
            Speichern
          </button>

        </div>
      </div>
    </div>
  );
}
