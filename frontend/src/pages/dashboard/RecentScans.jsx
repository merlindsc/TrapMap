import React, { useEffect, useState } from "react";
import { getRecentScans } from "../../api/dashboard";
import { Clock, User } from "lucide-react";

export default function RecentScans() {
  const [scans, setScans] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const s = await getRecentScans();
      setScans(s);
    } catch (err) {
      console.error("Scan load error:", err);
    }
  }

  if (!scans) return <ScanSkeleton />;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg flex flex-col" style={{ maxHeight: '500px' }}>
      <h2 className="text-xl font-semibold text-white mb-4 flex-shrink-0">Letzte Scans</h2>

      {/* Scrollable container */}
      <div className="space-y-3 overflow-y-auto flex-1 pr-2" style={{ maxHeight: '400px' }}>
        {scans.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            Noch keine Scans vorhanden
          </div>
        ) : (
          scans.map((s) => (
            <ScanItem key={s.id} scan={s} />
          ))
        )}
      </div>
    </div>
  );
}

function ScanItem({ scan }) {
  const statusColors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
  };

  // Get box name from nested data
  const boxName = scan.boxes?.number || scan.box_name || `Box ${scan.box_id}`;
  const objectName = scan.boxes?.objects?.name || scan.object_name || "";
  const techName = scan.users?.first_name 
    ? `${scan.users.first_name} ${scan.users.last_name || ''}`.trim()
    : scan.technician_name || "Unbekannt";

  return (
    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Status Dot */}
          <div className={`w-3 h-3 rounded-full ${statusColors[scan.status] || 'bg-gray-500'} flex-shrink-0`} />
          
          <div>
            <div className="text-white font-medium">{boxName}</div>
            {objectName && (
              <div className="text-gray-500 text-sm">{objectName}</div>
            )}
            <div className="text-gray-400 text-sm capitalize">
              Status: {scan.status}
            </div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1 text-gray-500 text-xs">
            <Clock className="w-3 h-3" />
            {timeAgo(scan.scanned_at || scan.created_at)}
          </div>
          <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
            <User className="w-3 h-3" />
            {techName}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScanSkeleton() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg animate-pulse" style={{ maxHeight: '500px' }}>
      <div className="h-5 w-32 bg-gray-700 rounded mb-6"></div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-16 bg-gray-700 rounded-lg mb-3"></div>
      ))}
    </div>
  );
}

function timeAgo(ts) {
  if (!ts) return "-";
  const diff = (Date.now() - new Date(ts).getTime()) / 60000;
  if (diff < 1) return "Gerade eben";
  if (diff < 60) return `vor ${Math.round(diff)} Min`;
  const h = Math.round(diff / 60);
  if (h < 24) return `vor ${h} Std`;
  const d = Math.round(h / 24);
  return `vor ${d} Tag${d > 1 ? 'en' : ''}`;
}