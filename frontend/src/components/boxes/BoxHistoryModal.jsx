/* ============================================================
   BOX HISTORY MODAL - VERSION 5.0 FINAL
   
   ✅ Datum + Techniker-Name
   ✅ Wenn du im Header "V5.0" siehst → RICHTIGE VERSION!
   ============================================================ */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Clock } from "lucide-react";
import "../ui/SharedModal.css";

const API = import.meta.env.VITE_API_URL;

export default function BoxHistoryModal({ isOpen, onClose, box }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && box) {
      loadScans();
    }
  }, [isOpen, box]);

  const loadScans = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("trapmap_token");

      const res = await fetch(`${API}/scans/${box.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load scans");

      const data = await res.json();
      const scansList = Array.isArray(data) ? data : data.scans || [];

      setScans(scansList);
    } catch (err) {
      console.error("Error loading scans:", err);
      setScans([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      green: { emoji: "🟢", text: "OK" },
      yellow: { emoji: "🟡", text: "Auffällig" },
      orange: { emoji: "🟠", text: "Fund" },
      red: { emoji: "🔴", text: "Befall" },
      gray: { emoji: "⚪", text: "Inaktiv" },
      blue: { emoji: "🔵", text: "Info" },
    };

    const badge = badges[status] || badges.gray;
    return (
      <span className={`status-badge ${status}`}>
        {badge.emoji} {badge.text}
      </span>
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay"
      style={{ zIndex: 1100 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog">
        <div className="modal-header">
          <div>
            <h2>
              <Clock size={22} /> Kontrollen-Verlauf (V5.0)
            </h2>
            <div className="modal-subtitle">
              {box?.box_name || `Box #${box?.id}`} — Letzte 90 Tage
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div className="loading-spinner" style={{ margin: "0 auto" }} />
              <p style={{ marginTop: "16px", color: "#9ca3af" }}>
                Lade Verlauf...
              </p>
            </div>
          ) : scans.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-text">
                Noch keine Kontrollen durchgeführt
              </div>
            </div>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Status</th>
                  <th>Techniker</th>
                  <th>Notizen</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => (
                  <tr key={scan.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {formatDate(scan.scan_date || scan.created_at)}
                    </td>
                    <td>{getStatusBadge(scan.status)}</td>
                    <td>
                      {scan.user?.first_name && scan.user?.last_name
                        ? `${scan.user.first_name} ${scan.user.last_name}`
                        : scan.user?.full_name || scan.technician_name || "—"}
                    </td>
                    <td
                      style={{
                        maxWidth: "200px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {scan.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Schließen
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}