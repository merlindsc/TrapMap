/* ============================================================
   TRAPMAP — REPORTS PAGE
   Übersicht aller verfügbaren Reports
   ============================================================ */

import { useState } from "react";
import { ClipboardList, AlertTriangle, Download } from "lucide-react";
import AuditReportDialog from "./AuditReportDialog";
import GefahrenanalyseDialog from "./GefahrenanalyseDialog";

export default function Reports() {
  const [auditOpen, setAuditOpen] = useState(false);
  const [gefahrenOpen, setGefahrenOpen] = useState(false);

  const reports = [
    {
      id: "audit",
      title: "Audit-Report",
      description: "Kontroll-Protokoll mit Box-Übersicht, Scans und Bewertung für einen Zeitraum",
      icon: ClipboardList,
      color: "indigo",
      onClick: () => setAuditOpen(true)
    },
    {
      id: "gefahren",
      title: "Gefahrenanalyse",
      description: "Objektbezogene Bewertung zur Notwendigkeit einer befallsunabhängigen Dauerbeköderung",
      icon: AlertTriangle,
      color: "orange",
      onClick: () => setGefahrenOpen(true)
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Reports</h1>
        <p className="text-gray-400">Erstellen Sie professionelle PDF-Dokumente</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {reports.map(report => (
          <button
            key={report.id}
            onClick={report.onClick}
            className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 text-left hover:border-indigo-500/50 hover:bg-[#252545] transition-all group"
          >
            <div className={`w-12 h-12 rounded-lg ${report.color === 'orange' ? 'bg-orange-500/20' : 'bg-indigo-500/20'} flex items-center justify-center mb-4`}>
              <report.icon className={report.color === 'orange' ? 'text-orange-400' : 'text-indigo-400'} size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{report.title}</h3>
            <p className="text-sm text-gray-400 mb-4">{report.description}</p>
            <div className="flex items-center gap-2 text-sm text-indigo-400 group-hover:text-indigo-300">
              <Download size={16} />
              <span>Report erstellen</span>
            </div>
          </button>
        ))}
      </div>

      {/* Dialoge */}
      <AuditReportDialog isOpen={auditOpen} onClose={() => setAuditOpen(false)} />
      <GefahrenanalyseDialog isOpen={gefahrenOpen} onClose={() => setGefahrenOpen(false)} />
    </div>
  );
}