/* ============================================================
   TRAPMAP — DASHBOARD V7 PROFESSIONAL
   ✅ KPI Cards mit echten Daten
   ✅ Status-Übersicht (Grün/Gelb/Rot)
   ✅ Letzte Scans
   ✅ Report-Button integriert
   ============================================================ */

import React, { useEffect, useState } from "react";
import { getDashboardStats } from "../../api/dashboard";
import RecentScans from "./RecentScans";
import ReportDialog from "../maps/ReportDialog";
import { 
  Box, 
  Activity, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  FileText,
  CheckCircle,
  XCircle
} from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const s = await getDashboardStats();
      setStats(s);
    } catch (err) {
      console.error("Stats load error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  // Berechne Erfolgsrate
  const totalBoxes = stats?.boxes || 0;
  const greenBoxes = stats?.greenBoxes || 0;
  const successRate = totalBoxes > 0 ? ((greenBoxes / totalBoxes) * 100).toFixed(0) : 100;

  return (
    <div className="p-6 space-y-6">
      {/* Header mit Datum und Report-Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setReportDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <FileText size={18} />
            Audit-Report
          </button>
          <div className="text-sm text-gray-400">
            {new Date().toLocaleDateString("de-DE", { 
              weekday: "long", 
              day: "numeric", 
              month: "long", 
              year: "numeric" 
            })}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Aktive Boxen" 
          value={stats?.boxes || 0} 
          icon={<Box size={22} />}
          color="indigo"
          subtitle="Gesamtanzahl"
        />
        <KPICard 
          title="Scans heute" 
          value={stats?.scansToday || 0} 
          icon={<Activity size={22} />}
          color="green"
          subtitle="Kontrollen durchgeführt"
        />
        <KPICard 
          title="Warnungen" 
          value={stats?.warnings || 0} 
          icon={<AlertTriangle size={22} />}
          color={stats?.warnings > 0 ? "red" : "green"}
          subtitle={`${stats?.yellowBoxes || 0} gelb, ${stats?.redBoxes || 0} rot`}
        />
        <KPICard 
          title="Letzte Aktivität" 
          value={formatTime(stats?.lastSync)} 
          icon={<Clock size={22} />}
          color="purple"
          subtitle="Letzter Scan"
          isTime={true}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Scans - 2/3 */}
        <div className="lg:col-span-2">
          <RecentScans />
        </div>

        {/* Status Summary - 1/3 */}
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-400" />
            Status-Übersicht
          </h2>
          
          <div className="space-y-4">
            <StatusBar 
              label="OK (Grün)" 
              value={stats?.greenBoxes || 0} 
              total={totalBoxes}
              color="green"
              icon={<CheckCircle size={16} />}
            />
            <StatusBar 
              label="Auffällig (Gelb)" 
              value={stats?.yellowBoxes || 0} 
              total={totalBoxes}
              color="yellow"
              icon={<AlertTriangle size={16} />}
            />
            <StatusBar 
              label="Kritisch (Rot)" 
              value={stats?.redBoxes || 0} 
              total={totalBoxes}
              color="red"
              icon={<XCircle size={16} />}
            />
          </div>

          {/* Quick Stats */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-green-500/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-green-400">
                  {successRate}%
                </div>
                <div className="text-xs text-gray-400 mt-1">Erfolgsrate</div>
              </div>
              <div className="bg-indigo-500/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-indigo-400">
                  {stats?.scansThisWeek || 0}
                </div>
                <div className="text-xs text-gray-400 mt-1">Scans/Woche</div>
              </div>
            </div>
          </div>

          {/* Report Button in Status-Übersicht */}
          <button
            onClick={() => setReportDialogOpen(true)}
            className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-lg transition-colors"
          >
            <FileText size={18} />
            PDF-Report erstellen
          </button>
        </div>
      </div>

      {/* Report Dialog */}
      {reportDialogOpen && (
        <ReportDialog onClose={() => setReportDialogOpen(false)} />
      )}
    </div>
  );
}

/* ============================================================
   KPI CARD COMPONENT
   ============================================================ */
function KPICard({ title, value, icon, color, subtitle, isTime }) {
  const colorStyles = {
    indigo: {
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      icon: "text-indigo-400",
      glow: "hover:shadow-indigo-500/10"
    },
    green: {
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      icon: "text-green-400",
      glow: "hover:shadow-green-500/10"
    },
    yellow: {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
      icon: "text-yellow-400",
      glow: "hover:shadow-yellow-500/10"
    },
    red: {
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      icon: "text-red-400",
      glow: "hover:shadow-red-500/10"
    },
    purple: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      icon: "text-purple-400",
      glow: "hover:shadow-purple-500/10"
    },
  };

  const style = colorStyles[color] || colorStyles.indigo;

  return (
    <div className={`bg-[#111827] border ${style.border} rounded-xl p-5 hover:scale-[1.02] transition-all cursor-default hover:shadow-lg ${style.glow}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{title}</p>
          <p className={`${isTime ? "text-xl" : "text-3xl"} font-bold text-white`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${style.bg} ${style.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   STATUS BAR COMPONENT
   ============================================================ */
function StatusBar({ label, value, total, color, icon }) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  
  const barColors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };

  const textColors = {
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };

  return (
    <div>
      <div className="flex justify-between items-center text-sm mb-2">
        <span className={`flex items-center gap-2 ${textColors[color]}`}>
          {icon}
          {label}
        </span>
        <span className="text-white font-semibold">{value}</span>
      </div>
      <div className="h-2.5 bg-gray-700/50 rounded-full overflow-hidden">
        <div 
          className={`h-full ${barColors[color]} transition-all duration-700 ease-out rounded-full`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   TIME FORMATTER
   ============================================================ */
function formatTime(ts) {
  if (!ts) return "Keine Daten";

  const diff = (Date.now() - new Date(ts).getTime()) / 60000;

  if (diff < 1) return "Gerade eben";
  if (diff < 60) return `vor ${Math.round(diff)} Min`;
  
  const hours = Math.round(diff / 60);
  if (hours < 24) return `vor ${hours} Std`;
  
  const days = Math.round(hours / 24);
  return `vor ${days} Tag${days > 1 ? "en" : ""}`;
}

/* ============================================================
   SKELETON LOADER
   ============================================================ */
function DashboardSkeleton() {
  return (
    <div className="p-6 animate-pulse space-y-6">
      <div className="flex justify-between">
        <div className="h-8 bg-gray-700 rounded w-48"></div>
        <div className="h-10 bg-gray-700 rounded w-36"></div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-gray-800 rounded-xl"></div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-96 bg-gray-800 rounded-xl"></div>
        <div className="h-96 bg-gray-800 rounded-xl"></div>
      </div>
    </div>
  );
}