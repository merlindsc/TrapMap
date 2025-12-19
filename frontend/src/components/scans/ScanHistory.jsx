import { useState, useEffect } from "react";
import { Clock, User, Bug } from "lucide-react";
import { getBoxScans } from "../../api/scans";

export default function ScanHistory({ boxId }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (boxId) loadScans();
  }, [boxId]);

  const loadScans = async () => {
    try {
      const response = await getBoxScans(boxId);
      setScans(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to load scans:", err);
      setScans([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) =>
    ({
      green: "bg-green-600",
      yellow: "bg-yellow-600",
      red: "bg-red-600",
      gray: "bg-gray-600",
    }[status] || "bg-gray-600");

  const getStatusLabel = (status) =>
    ({
      green: "Kein Befall",
      yellow: "Leichter Befall",
      red: "Starker Befall",
      gray: "Defekt",
    }[status] || status);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading)
    return <div className="text-center py-8 text-gray-400">Lade Historie…</div>;

  if (scans.length === 0)
    return (
      <div className="text-center py-8 text-gray-400">
        Keine Scans in den letzten 365 Tagen
      </div>
    );

  return (
    <div className="space-y-3">
      {scans.map((scan) => (
        <div key={scan.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${getStatusColor(scan.status)}`} />
              <span className="font-semibold text-white">
                {getStatusLabel(scan.status)}
              </span>
            </div>

            {scan.pest_found && (
              <span className="text-xs bg-gray-600 px-2 py-1 rounded text-orange-300 flex items-center gap-1">
                <Bug size={14} />
                {scan.pest_count || 0}
              </span>
            )}
          </div>

          {/* BOX NAME & QR CODE */}
          {scan.boxes && (
            <div className="mb-2 text-sm text-gray-300 font-medium">
              BOX {scan.boxes.number || scan.boxes.id} {scan.boxes.qr_code || ''}
            </div>
          )}

          {scan.notes && <p className="text-sm text-gray-300 mb-3">{scan.notes}</p>}

          <div className="flex items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>
                {scan.users
                  ? `${scan.users.first_name || ""} ${scan.users.last_name || ""}`.trim()
                  : "Unbekannt"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDate(scan.scanned_at || scan.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
