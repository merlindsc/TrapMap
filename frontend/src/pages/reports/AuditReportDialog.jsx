/* ============================================================
   TRAPMAP – AUDIT REPORT DIALOG
   Konfigurierbarer Report mit allen Optionen
   ============================================================ */

import { useState, useEffect } from "react";
import {
  X, FileText, Download, Loader, ChevronDown, ChevronRight,
  CheckSquare, Square, Building2, MapPin, Calendar, Users,
  Bug, ClipboardList, Scale, Printer, Globe, Filter,
  RefreshCw, Check, AlertTriangle, Eye, Settings
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

// ============================================
// STANDARD-OPTIONEN
// ============================================
const DEFAULT_OPTIONS = {
  // Header / Footer
  showTrapMapLogo: true,
  showOrgLogo: true,
  showPageNumbers: true,
  showGeneratedDate: true,
  showFooter: true,

  // Titelseite
  showTitlePage: true,
  showObjectDetails: true,
  showObjectContact: true,
  showReportPeriod: true,
  showExecutiveSummary: true,
  showOverallAssessment: true,

  // Fallentypen
  showBoxTypesSection: true,
  showBaitType: true,
  showBaitSubstance: true,
  showBaitBrand: true,
  showBaitConcentration: true,
  showToxicityInfo: true,
  showRegistrationNumber: true,
  showManufacturer: true,
  showTargetPests: true,

  // Fallen-Details
  showBoxDetailsSection: true,
  showBoxNumber: true,
  showBoxQRCode: true,
  showBoxType: true,
  showBoxLocation: true,
  showBoxGPSCoords: true,
  showBoxFloorPlan: true,
  showBoxGridPosition: true,
  showBoxStatus: true,
  showBoxLastScan: true,
  showBoxNextDue: true,
  showBoxInterval: true,
  showBoxNotes: true,
  showBoxBait: true,

  // Kontrollprotokoll
  showScansSection: true,
  showScanDateTime: true,
  showScanTechnician: true,
  showScanStatus: true,
  showScanFindings: true,
  showScanNotes: true,
  showScanConsumption: true,
  showScanQuantity: true,
  showScanTrapState: true,
  showScanBaitCondition: true,
  showScanActivitySigns: true,
  showScanCorrectiveAction: true,
  showScanPhoto: false,
  maxScans: 500,

  // Techniker
  showTechnicianSection: true,
  showTechnicianStats: true,

  // Rechtliches
  showLegalSection: true,
  showHACCPInfo: true,
  showIFSInfo: true,
  showSignatureFields: true,
  showDataIntegrityNote: true,

  // Filter
  dateFrom: "",
  dateTo: "",
  boxStatusFilter: null,
  boxTypeFilter: null,

  // Layout
  pageSize: "A4",
  language: "de",
  colorScheme: "default"
};

// ============================================
// OPTION GRUPPEN
// ============================================
const OPTION_GROUPS = [
  {
    id: "header",
    title: "Header & Footer",
    icon: FileText,
    options: [
      { key: "showTrapMapLogo", label: "TrapMap Logo", desc: "Logo oben links" },
      { key: "showOrgLogo", label: "Firmen-Logo", desc: "Ihr Logo oben rechts" },
      { key: "showPageNumbers", label: "Seitenzahlen", desc: "Seite 1, 2, 3..." },
      { key: "showGeneratedDate", label: "Erstelldatum", desc: "Wann erstellt" },
      { key: "showFooter", label: "Footer anzeigen", desc: "Fußzeile" }
    ]
  },
  {
    id: "title",
    title: "Titelseite",
    icon: Building2,
    options: [
      { key: "showTitlePage", label: "Titelseite", desc: "Deckblatt", master: true },
      { key: "showObjectDetails", label: "Objekt-Details", desc: "Name, Adresse" },
      { key: "showObjectContact", label: "Kontaktdaten", desc: "Ansprechpartner" },
      { key: "showReportPeriod", label: "Berichtszeitraum", desc: "Von/Bis" },
      { key: "showExecutiveSummary", label: "Zusammenfassung", desc: "KPI-Boxen" },
      { key: "showOverallAssessment", label: "Gesamtbewertung", desc: "Ampel" }
    ]
  },
  {
    id: "boxtypes",
    title: "Fallentypen & Köder",
    icon: Bug,
    options: [
      { key: "showBoxTypesSection", label: "Fallentypen-Sektion", desc: "Übersicht", master: true },
      { key: "showBaitType", label: "Köder-Art", desc: "Fraßköder, Schlagfalle" },
      { key: "showBaitSubstance", label: "Wirkstoff", desc: "Brodifacoum, etc.", sensitive: true },
      { key: "showBaitBrand", label: "Markenname", desc: "Ratimor, Storm" },
      { key: "showBaitConcentration", label: "Konzentration", desc: "0.0025%", sensitive: true },
      { key: "showToxicityInfo", label: "Gift-Information", desc: "Giftig? Ja/Nein", sensitive: true },
      { key: "showRegistrationNumber", label: "Zulassungs-Nr.", desc: "BAuA Nummer" },
      { key: "showManufacturer", label: "Hersteller", desc: "Produzent" },
      { key: "showTargetPests", label: "Zielschädlinge", desc: "Maus, Ratte" }
    ]
  },
  {
    id: "boxes",
    title: "Fallen-Details",
    icon: MapPin,
    options: [
      { key: "showBoxDetailsSection", label: "Fallen-Tabelle", desc: "Liste aller Fallen", master: true },
      { key: "showBoxNumber", label: "Fallen-Nummer", desc: "1, 2, 3..." },
      { key: "showBoxQRCode", label: "QR-Code", desc: "Eindeutige Kennung" },
      { key: "showBoxType", label: "Fallentyp", desc: "Art der Falle" },
      { key: "showBoxLocation", label: "Standort", desc: "Wo steht die Falle" },
      { key: "showBoxGPSCoords", label: "GPS-Koordinaten", desc: "Lat/Lng" },
      { key: "showBoxFloorPlan", label: "Lageplan", desc: "Lageplan-Name" },
      { key: "showBoxGridPosition", label: "Rasterposition", desc: "A1, B2" },
      { key: "showBoxStatus", label: "Status", desc: "Aktueller Zustand" },
      { key: "showBoxLastScan", label: "Letzte Kontrolle", desc: "Datum" },
      { key: "showBoxNextDue", label: "Nächste fällig", desc: "Wann prüfen" },
      { key: "showBoxInterval", label: "Kontrollintervall", desc: "Alle X Tage" },
      { key: "showBoxNotes", label: "Notizen", desc: "Bemerkungen" },
      { key: "showBoxBait", label: "Aktueller Köder", desc: "Was ist drin" }
    ]
  },
  {
    id: "scans",
    title: "Kontrollprotokoll",
    icon: ClipboardList,
    options: [
      { key: "showScansSection", label: "Scan-Protokoll", desc: "Historie", master: true },
      { key: "showScanDateTime", label: "Datum & Uhrzeit", desc: "Wann kontrolliert" },
      { key: "showScanTechnician", label: "Techniker", desc: "Wer hat kontrolliert" },
      { key: "showScanStatus", label: "Status", desc: "Ergebnis" },
      { key: "showScanFindings", label: "Befunde", desc: "Was gefunden" },
      { key: "showScanNotes", label: "Bemerkungen", desc: "Zusätzliche Notizen" },
      { key: "showScanConsumption", label: "Köderverbrauch", desc: "Gramm", sensitive: true },
      { key: "showScanQuantity", label: "Anzahl Schädlinge", desc: "Wie viele" },
      { key: "showScanTrapState", label: "Fallenzustand", desc: "Intakt/Beschädigt" },
      { key: "showScanBaitCondition", label: "Köderzustand", desc: "Frisch/Verzehrt" },
      { key: "showScanActivitySigns", label: "Aktivitätszeichen", desc: "Kot, Nagespuren" },
      { key: "showScanCorrectiveAction", label: "Maßnahmen", desc: "Was gemacht" }
    ]
  },
  {
    id: "technicians",
    title: "Techniker",
    icon: Users,
    options: [
      { key: "showTechnicianSection", label: "Techniker-Übersicht", desc: "Wer gearbeitet", master: true },
      { key: "showTechnicianStats", label: "Statistiken", desc: "Kontrollen pro Person" }
    ]
  },
  {
    id: "legal",
    title: "Rechtliches",
    icon: Scale,
    options: [
      { key: "showLegalSection", label: "Rechtliche Hinweise", desc: "Compliance", master: true },
      { key: "showHACCPInfo", label: "HACCP-Hinweise", desc: "Lebensmittelsicherheit" },
      { key: "showIFSInfo", label: "IFS/BRC-Hinweise", desc: "Zertifizierung" },
      { key: "showSignatureFields", label: "Unterschriftenfelder", desc: "Zum Unterschreiben" },
      { key: "showDataIntegrityNote", label: "Datenintegrität", desc: "Manipulationssicher" }
    ]
  }
];

// ============================================
// VORLAGEN
// ============================================
const TEMPLATES = [
  { id: "full", name: "Vollständig", desc: "Alle Details", preset: { ...DEFAULT_OPTIONS } },
  {
    id: "customer", name: "Kunden-Report", desc: "Ohne sensible Daten",
    preset: {
      ...DEFAULT_OPTIONS,
      showBaitSubstance: false, showBaitConcentration: false, showToxicityInfo: false,
      showRegistrationNumber: false, showBoxGPSCoords: false, showScanConsumption: false,
      showScanTrapState: false, showScanBaitCondition: false, showScanActivitySigns: false
    }
  },
  { id: "audit", name: "Behörden-Audit", desc: "Maximum Details", preset: { ...DEFAULT_OPTIONS, maxScans: 1000 } },
  {
    id: "minimal", name: "Minimal", desc: "Nur Zusammenfassung",
    preset: { ...DEFAULT_OPTIONS, showBoxTypesSection: false, showBoxDetailsSection: false, showScansSection: false, showTechnicianSection: false }
  }
];

// ============================================
// HAUPTKOMPONENTE
// ============================================
export default function AuditReportDialog({ isOpen, onClose }) {
  let token = null;
  try {
    token = localStorage.getItem("trapmap_token");
  } catch (error) {
    console.error("localStorage nicht verfügbar:", error);
  }
  
  const [options, setOptions] = useState({ ...DEFAULT_OPTIONS });
  const [openGroups, setOpenGroups] = useState(["header", "title", "boxtypes"]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [boxTypes, setBoxTypes] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [activeTab, setActiveTab] = useState("options");
  const [error, setError] = useState(null);

  // Daten laden
  useEffect(() => {
    if (!isOpen || !token) return;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Objekte laden
        const objRes = await fetch(`${API}/objects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (objRes.ok) {
          const data = await objRes.json();
          setObjects(data.data || data || []);
        } else {
          throw new Error("Fehler beim Laden der Objekte");
        }

        // Box-Typen laden
        const typesRes = await fetch(`${API}/boxtypes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (typesRes.ok) {
          const data = await typesRes.json();
          setBoxTypes(data.data || data.boxtypes || []);
        }
      } catch (e) {
        console.error("Load error:", e);
        setError("Fehler beim Laden der Daten");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isOpen, token]);

  // Preview laden wenn Objekt ausgewählt
  useEffect(() => {
    if (!selectedObject || !token) return;
    const loadPreview = async () => {
      try {
        const params = new URLSearchParams();
        if (options.dateFrom) params.append("date_from", options.dateFrom);
        if (options.dateTo) params.append("date_to", options.dateTo);
        
        const res = await fetch(`${API}/audit-reports/${selectedObject}/preview?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setPreviewData(await res.json());
        } else {
          setPreviewData(null);
        }
      } catch (e) {
        console.error("Preview error:", e);
        setPreviewData(null);
      }
    };
    
    const timer = setTimeout(loadPreview, 500); // Debounce
    return () => clearTimeout(timer);
  }, [selectedObject, options.dateFrom, options.dateTo, token]);

  // Option ändern
  const setOption = (key, value) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  // Gruppe togglen
  const toggleGroup = (groupId) => {
    setOpenGroups(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  // Alle in Gruppe togglen
  const toggleAllInGroup = (group) => {
    const allChecked = group.options.every(opt => options[opt.key]);
    const newOptions = { ...options };
    group.options.forEach(opt => { newOptions[opt.key] = !allChecked; });
    setOptions(newOptions);
  };

  // Template anwenden
  const applyTemplate = (template) => {
    setOptions({ ...template.preset, dateFrom: options.dateFrom, dateTo: options.dateTo });
  };

  // PDF generieren
  const handleGenerate = async () => {
    if (!selectedObject) {
      setError("Bitte wählen Sie ein Objekt aus");
      return;
    }
    
    setGenerating(true);
    setError(null);
    
    try {
      // Query-String aus Optionen bauen
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          if (Array.isArray(value)) {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const res = await fetch(`${API}/audit-reports/${selectedObject}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const obj = objects.find(o => o.id === parseInt(selectedObject));
        a.download = `Audit-Report_${obj?.name || selectedObject}_${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
        setTimeout(() => onClose(), 500);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Fehler beim Generieren");
      }
    } catch (e) {
      console.error("Generate error:", e);
      setError("Netzwerkfehler: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  const isGroupAllChecked = (group) => group.options.every(opt => options[opt.key]);
  const countActiveOptions = () => Object.values(options).filter(v => v === true).length;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1a1a2e] rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-white/10 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10 bg-gradient-to-r from-indigo-600 to-indigo-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Audit-Report Generator</h2>
              <p className="text-indigo-100">{countActiveOptions()} Optionen aktiv</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Objekt-Auswahl */}
        <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0d1a]">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Objekt auswählen *
          </label>
          <select
            value={selectedObject || ""}
            onChange={(e) => setSelectedObject(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a2e] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Objekt wählen --</option>
            {objects.map(obj => (
              <option key={obj.id} value={obj.id}>{obj.name}</option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0d1a]">
          {[
            { id: "options", label: "Inhalte", icon: Settings },
            { id: "filter", label: "Filter", icon: Filter },
            { id: "layout", label: "Layout", icon: Printer }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors
                ${activeTab === tab.id
                  ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-[#1a1a2e]"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          
          {/* Linke Seite: Optionen */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            ) : (
              <>
                {/* Tab: Optionen */}
                {activeTab === "options" && (
                  <div className="space-y-4">
                    {/* Templates */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                        Schnellauswahl
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {TEMPLATES.map(template => (
                          <button
                            key={template.id}
                            onClick={() => applyTemplate(template)}
                            className="px-4 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            {template.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Option Groups */}
                    {OPTION_GROUPS.map(group => (
                      <div key={group.id} className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
                        {/* Group Header */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0d0d1a]">
                          <button
                            onClick={() => toggleGroup(group.id)}
                            className="flex items-center gap-3 flex-1 text-left"
                          >
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg">
                              <group.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">{group.title}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{group.options.length} Optionen</p>
                            </div>
                            {openGroups.includes(group.id) ? (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                          <button
                            onClick={() => toggleAllInGroup(group)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                              ${isGroupAllChecked(group)
                                ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                                : "bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400"
                              }`}
                          >
                            {isGroupAllChecked(group) ? "Alle ab" : "Alle an"}
                          </button>
                        </div>

                        {/* Group Options */}
                        {openGroups.includes(group.id) && (
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {group.options.map(opt => {
                              const masterOption = group.options.find(o => o.master);
                              const isDisabled = masterOption && !opt.master && !options[masterOption.key];
                              
                              return (
                                <label
                                  key={opt.key}
                                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                    ${isDisabled ? "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-white/5" : "hover:bg-gray-50 dark:hover:bg-white/5"}
                                    ${options[opt.key] ? "border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-500/10" : "border-gray-200 dark:border-white/10"}
                                  `}
                                >
                                  <div className="pt-0.5">
                                    {options[opt.key] ? (
                                      <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    ) : (
                                      <Square className="w-5 h-5 text-gray-400" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-medium ${options[opt.key] ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
                                        {opt.label}
                                      </span>
                                      {opt.sensitive && (
                                        <span className="px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded">
                                          Sensibel
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{opt.desc}</p>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={options[opt.key]}
                                    onChange={() => !isDisabled && setOption(opt.key, !options[opt.key])}
                                    disabled={isDisabled}
                                    className="sr-only"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab: Filter */}
                {activeTab === "filter" && (
                  <div className="space-y-6">
                    {/* Zeitraum */}
                    <div className="bg-gray-50 dark:bg-[#0d0d1a] rounded-xl p-6 border border-gray-200 dark:border-white/10">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Zeitraum
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Von</label>
                          <input
                            type="date"
                            value={options.dateFrom}
                            onChange={(e) => setOption("dateFrom", e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a2e] text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bis</label>
                          <input
                            type="date"
                            value={options.dateTo}
                            onChange={(e) => setOption("dateTo", e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a2e] text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        {[
                          { label: "Diesen Monat", from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0], to: new Date().toISOString().split("T")[0] },
                          { label: "Letzten Monat", from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split("T")[0], to: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split("T")[0] },
                          { label: "Dieses Jahr", from: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0], to: new Date().toISOString().split("T")[0] },
                          { label: "Alle", from: "", to: "" }
                        ].map(preset => (
                          <button
                            key={preset.label}
                            onClick={() => { setOption("dateFrom", preset.from); setOption("dateTo", preset.to); }}
                            className="px-3 py-1.5 text-sm bg-white dark:bg-[#1a1a2e] border border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div className="bg-gray-50 dark:bg-[#0d0d1a] rounded-xl p-6 border border-gray-200 dark:border-white/10">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        Status Filter
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Nur Fallen mit bestimmtem Status</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: "green", label: "OK", color: "bg-green-500" },
                          { value: "yellow", label: "Leicht auffällig", color: "bg-yellow-500" },
                          { value: "orange", label: "Auffällig", color: "bg-orange-500" },
                          { value: "red", label: "Befall", color: "bg-red-500" }
                        ].map(status => {
                          const isSelected = options.boxStatusFilter?.includes(status.value);
                          return (
                            <button
                              key={status.value}
                              onClick={() => {
                                const current = options.boxStatusFilter || [];
                                const newFilter = isSelected
                                  ? current.filter(s => s !== status.value)
                                  : [...current, status.value];
                                setOption("boxStatusFilter", newFilter.length > 0 ? newFilter : null);
                              }}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors
                                ${isSelected
                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                                  : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-gray-600 dark:text-gray-400"
                                }`}
                            >
                              <div className={`w-3 h-3 rounded-full ${status.color}`} />
                              {status.label}
                              {isSelected && <Check className="w-4 h-4" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Max Scans */}
                    <div className="bg-gray-50 dark:bg-[#0d0d1a] rounded-xl p-6 border border-gray-200 dark:border-white/10">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-cyan-500" />
                        Maximale Kontrollen
                      </h3>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="50"
                          max="1000"
                          step="50"
                          value={options.maxScans}
                          onChange={(e) => setOption("maxScans", parseInt(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-lg font-semibold text-gray-900 dark:text-white w-20 text-right">
                          {options.maxScans}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Layout */}
                {activeTab === "layout" && (
                  <div className="space-y-6">
                    {/* Sprache */}
                    <div className="bg-gray-50 dark:bg-[#0d0d1a] rounded-xl p-6 border border-gray-200 dark:border-white/10">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-indigo-500" />
                        Sprache
                      </h3>
                      <div className="flex gap-3">
                        {[
                          { value: "de", label: "🇩🇪 Deutsch" },
                          { value: "en", label: "🇬🇧 English" }
                        ].map(lang => (
                          <button
                            key={lang.value}
                            onClick={() => setOption("language", lang.value)}
                            className={`flex-1 px-6 py-4 rounded-xl border-2 font-medium transition-all
                              ${options.language === lang.value
                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                                : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-gray-600 dark:text-gray-400"
                              }`}
                          >
                            {lang.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Farbschema */}
                    <div className="bg-gray-50 dark:bg-[#0d0d1a] rounded-xl p-6 border border-gray-200 dark:border-white/10">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Printer className="w-5 h-5 text-gray-500" />
                        Farbschema
                      </h3>
                      <div className="flex gap-3">
                        {[
                          { value: "default", label: "Farbe", desc: "Für digitale Ansicht" },
                          { value: "grayscale", label: "Graustufen", desc: "Für S/W-Druck" }
                        ].map(scheme => (
                          <button
                            key={scheme.value}
                            onClick={() => setOption("colorScheme", scheme.value)}
                            className={`flex-1 px-6 py-4 rounded-xl border-2 transition-all text-left
                              ${options.colorScheme === scheme.value
                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20"
                                : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e]"
                              }`}
                          >
                            <div className="font-medium text-gray-900 dark:text-white">{scheme.label}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{scheme.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Rechte Seite: Preview */}
          <div className="w-72 border-l border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0d1a] p-4 overflow-y-auto hidden lg:block">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Vorschau
            </h3>
            
            {selectedObject && previewData ? (
              <div className="space-y-4">
                <div className="bg-white dark:bg-[#1a1a2e] rounded-lg p-4 border border-gray-200 dark:border-white/10">
                  <div className="font-medium text-gray-900 dark:text-white">{previewData.object?.name}</div>
                  <div className="text-sm text-gray-500">{previewData.object?.city}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-[#1a1a2e] rounded-lg p-3 border border-gray-200 dark:border-white/10 text-center">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {previewData.stats?.totalBoxes || 0}
                    </div>
                    <div className="text-xs text-gray-500">Fallen</div>
                  </div>
                  <div className="bg-white dark:bg-[#1a1a2e] rounded-lg p-3 border border-gray-200 dark:border-white/10 text-center">
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                      {previewData.stats?.totalScans || 0}
                    </div>
                    <div className="text-xs text-gray-500">Kontrollen</div>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#1a1a2e] rounded-lg p-4 border border-gray-200 dark:border-white/10">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Status</div>
                  <div className="space-y-2">
                    {[
                      { key: "green", label: "OK", color: "bg-green-500" },
                      { key: "yellow", label: "Auffällig", color: "bg-yellow-500" },
                      { key: "red", label: "Befall", color: "bg-red-500" }
                    ].map(status => {
                      const count = previewData.stats?.statusDistribution?.[status.key] || 0;
                      const total = previewData.stats?.totalBoxes || 1;
                      const percent = Math.round((count / total) * 100);
                      return (
                        <div key={status.key} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${status.color}`} />
                          <div className="flex-1">
                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                              <span>{status.label}</span>
                              <span className="font-medium">{count}</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mt-1">
                              <div className={`h-full rounded-full ${status.color}`} style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-10">
                {selectedObject ? "Lade Vorschau..." : "Objekt auswählen"}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0d1a]">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {countActiveOptions()} Optionen aktiv
          </div>
          
          <div className="flex items-center gap-3">
            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            <button
              onClick={() => setOptions({ ...DEFAULT_OPTIONS })}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Zurücksetzen
            </button>
            
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-white/10 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              Abbrechen
            </button>
            
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedObject}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {generating ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Erstellen...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  PDF erstellen
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}