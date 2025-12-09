import { useState, useEffect } from "react";
import { getDashboardStats } from "../../api/dashboard";
import { BarChart3, AlertTriangle, Clock, CheckCircle } from "lucide-react";

export default function KPIStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await getDashboardStats();
      setStats(response.data.data);
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    }
  };

  if (!stats) return <div className="text-gray-400">Lade Statistiken...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

      <div className="p-4 bg-gray-700 rounded-lg flex items-center gap-4">
        <CheckCircle className="w-8 h-8 text-green-400" />
        <div>
          <p className="text-2xl font-bold text-white">{stats.scans_today}</p>
          <p className="text-gray-300 text-sm">Scans Heute</p>
        </div>
      </div>

      <div className="p-4 bg-gray-700 rounded-lg flex items-center gap-4">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <div>
          <p className="text-2xl font-bold text-white">{stats.red_scans}</p>
          <p className="text-gray-300 text-sm">Rote Scans</p>
        </div>
      </div>

      <div className="p-4 bg-gray-700 rounded-lg flex items-center gap-4">
        <BarChart3 className="w-8 h-8 text-yellow-400" />
        <div>
          <p className="text-2xl font-bold text-white">{stats.objects_with_alerts}</p>
          <p className="text-gray-300 text-sm">Objekte mit Warnungen</p>
        </div>
      </div>

      <div className="p-4 bg-gray-700 rounded-lg flex items-center gap-4">
        <Clock className="w-8 h-8 text-blue-400" />
        <div>
          <p className="text-md font-bold text-white">
            {stats.last_update ? new Date(stats.last_update).toLocaleString("de-DE") : "—"}
          </p>
          <p className="text-gray-300 text-sm">Letzte Aktualisierung</p>
        </div>
      </div>

    </div>
  );
}
