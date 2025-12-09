/* ============================================================
   TRAPMAP — RECENT SCANS COMPONENT
   ✅ Farbige Status-Anzeige
   ✅ Icons für Status
   ✅ Kompakte Darstellung
   ============================================================ */

import React, { useEffect, useState } from "react";
import { getRecentScans } from "../../api/dashboard";
import { Clock, User, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

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
    <div className="bg-[#111827] border border-white/5 rounded-xl p-6 h-full">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Clock size={20} className="text-indigo-400" />
        Letzte Scans
      </h2>

      {scans.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Clock size={48} className="mx-auto mb-3 opacity-30" />
          <p>Noch keine Scans vorhanden</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {scans.map((s) => (
            <ScanItem key={s.id} scan={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScanItem({ scan }) {
  // Status aus message extrahieren falls vorhanden
  let status = scan.status;
  if (!status && scan.message?.includes("Status:")) {
    status = scan.message.split("Status:")[1]?.trim()?.toLowerCase();
  }

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case "green":
      case "ok":
        return {
          icon: <CheckCircle size={16} />,
          color: "text-green-400",
          bg: "bg-green-500/10",
          border: "border-l-green-500",
          label: "OK"
        };
      case "yellow":
        return {
          icon: <AlertTriangle size={16} />,
          color: "text-yellow-400",
          bg: "bg-yellow-500/10",
          border: "border-l-yellow-500",
          label: "Auffällig"
        };
      case "orange":
        return {
          icon: <AlertTriangle size={16} />,
          color: "text-orange-400",
          bg: "bg-orange-500/10",
          border: "border-l-orange-500",
          label: "Erhöht"
        };
      case "red":
        return {
          icon: <XCircle size={16} />,
          color: "text-red-400",
          bg: "bg-red-500/10",
          border: "border-l-red-500",
          label: "Kritisch"
        };
      default:
        return {
          icon: <CheckCircle size={16} />,
          color: "text-gray-400",
          bg: "bg-gray-500/10",
          border: "border-l-gray-500",
          label: "-"
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div className={`p-3 rounded-lg border-l-4 ${config.border} ${config.bg} hover:bg-white/5 transition-colors`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={config.color}>
            {config.icon}
          </div>
          <div>
            <div className="text-white font-medium text-sm">{scan.box_name}</div>
            <div className={`text-xs ${config.color}`}>
              {config.label}
            </div>
          </div>
        </div>
        
        <div className="text-right text-xs text-gray-500">
          <div className="flex items-center gap-1 justify-end">
            <Clock size={11} />
            {timeAgo(scan.created_at)}
          </div>
          <div className="flex items-center gap-1 justify-end mt-0.5">
            <User size={11} />
            {scan.technician_name?.split(" ")[0] || "?"}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScanSkeleton() {
  return (
    <div className="bg-[#111827] border border-white/5 rounded-xl p-6 animate-pulse h-full">
      <div className="h-6 w-32 bg-gray-700 rounded mb-6"></div>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-14 bg-gray-800 rounded-lg mb-2"></div>
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
  return `vor ${d}d`;
}