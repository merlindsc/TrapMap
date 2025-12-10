import React, { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentScans, setRecentScans] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const token = localStorage.getItem("trapmap_token");
      
      const res = await axios.get(`${API}/dashboard/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setStats(res.data.stats);
      setRecentScans(res.data.recentScans);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !stats) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold tracking-wide text-white">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPI title="Aktive Boxen" value={stats.boxes} icon="📦" color="indigo" />
        <KPI title="Scans heute" value={stats.scansToday} icon="📊" color="green" />
        <KPI title="Warnungen" value={stats.warnings} icon="⚠️" color="yellow" />
        <KPI title="Letzte Sync" value={formatTime(stats.lastSync)} icon="📡" color="purple" />
      </div>

      {/* Status Übersicht */}
      <div className="bg-[#111827] border border-white/5 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-white mb-4">Status Übersicht</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatusCard label="OK" count={stats.green || 0} color="green" />
          <StatusCard label="Auffällig" count={stats.yellow || 0} color="yellow" />
          <StatusCard label="Erhöht" count={stats.orange || 0} color="orange" />
          <StatusCard label="Befall" count={stats.red || 0} color="red" />
        </div>
      </div>

      {/* Recent Scans - gruppiert nach Objekt */}
      <RecentScansSection scans={recentScans} />
    </div>
  );
}

// ============================================
// KPI Card Component
// ============================================
function KPI({ title, value, color, icon }) {
  const colorClasses = {
    indigo: "text-indigo-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    purple: "text-purple-400"
  };

  return (
    <div className="bg-[#111827] border border-white/5 rounded-xl p-6 shadow-lg shadow-black/20 hover:shadow-indigo-900/30 transition duration-200">
      <div className={`text-4xl mb-3 ${colorClasses[color]}`}>{icon}</div>
      <div className="text-4xl font-bold text-white">{value}</div>
      <div className="text-gray-400 text-sm mt-1">{title}</div>
    </div>
  );
}

// ============================================
// Status Card Component
// ============================================
function StatusCard({ label, count, color }) {
  const colors = {
    green: "bg-green-500/20 text-green-400 border-green-500/30",
    yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    red: "bg-red-500/20 text-red-400 border-red-500/30"
  };

  return (
    <div className={`${colors[color]} border rounded-lg p-4 text-center`}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  );
}

// ============================================
// Recent Scans Section - Gruppiert nach Objekt
// ============================================
function RecentScansSection({ scans }) {
  if (!scans) return <ScanSkeleton />;

  // Gruppiere Scans nach Objekt
  const groupedScans = scans.reduce((acc, scan) => {
    const objName = scan.object_name || "Sonstiges";
    if (!acc[objName]) {
      acc[objName] = [];
    }
    acc[objName].push(scan);
    return acc;
  }, {});

  // Sortiere Objekte alphabetisch
  const sortedObjects = Object.keys(groupedScans).sort((a, b) => 
    a.localeCompare(b, 'de')
  );

  return (
    <div className="bg-[#111827] border border-white/5 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-semibold text-white mb-5">Letzte Scans</h2>

      {scans.length === 0 ? (
        <p className="text-gray-400">Noch keine Scans vorhanden</p>
      ) : (
        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
          {sortedObjects.map(objectName => (
            <div key={objectName}>
              {/* Objekt Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <h3 className="text-sm font-medium text-indigo-400 uppercase tracking-wide">
                  {objectName}
                </h3>
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-xs text-gray-500">
                  {groupedScans[objectName].length} Scans
                </span>
              </div>

              {/* Scans für dieses Objekt */}
              <div className="space-y-2 ml-4">
                {groupedScans[objectName].map((s) => (
                  <div 
                    key={s.id} 
                    className="bg-[#0f1623] p-3 rounded-lg border border-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <StatusDot status={s.status} />
                      <div>
                        <div className="text-white font-medium text-sm">{s.box_name}</div>
                        <div className="text-gray-400 text-xs">{s.message}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-gray-500 text-xs">{timeAgo(s.created_at)}</div>
                      <div className="text-gray-600 text-xs">{s.technician_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Status Dot Component
// ============================================
function StatusDot({ status }) {
  const colors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    orange: "bg-orange-500",
    red: "bg-red-500"
  };

  return (
    <div className={`w-3 h-3 rounded-full ${colors[status] || "bg-gray-500"}`} />
  );
}

// ============================================
// Skeleton Loaders
// ============================================
function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-10">
      <div className="h-8 bg-gray-700 rounded w-40"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-gray-800 rounded-xl"></div>
        ))}
      </div>
      <div className="h-32 bg-gray-800 rounded-xl"></div>
      <div className="h-64 bg-gray-800 rounded-xl"></div>
    </div>
  );
}

function ScanSkeleton() {
  return (
    <div className="bg-[#111827] border border-white/5 rounded-xl p-6 shadow-lg animate-pulse">
      <div className="h-5 w-32 bg-gray-700 rounded mb-6"></div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 bg-gray-800 rounded-xl mb-3"></div>
      ))}
    </div>
  );
}

// ============================================
// Helper Functions
// ============================================
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
  const diff = (Date.now() - new Date(ts).getTime()) / 60000;
  if (diff < 1) return "Gerade eben";
  if (diff < 60) return `vor ${Math.round(diff)} Min`;
  const h = Math.round(diff / 60);
  if (h < 24) return `vor ${h} Std`;
  return `vor ${Math.round(h / 24)} Tagen`;
}