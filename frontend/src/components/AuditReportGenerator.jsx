// ============================================
// AUDIT REPORT GENERATOR - FRONTEND
// Alle Optionen einzeln auswählbar
// ============================================

import React, { useState, useEffect } from 'react';
import {
  FileText, Download, Eye, Settings, ChevronDown, ChevronRight,
  CheckSquare, Square, Building2, MapPin, Calendar, Users,
  Bug, Skull, ClipboardList, Scale, Printer, Globe,
  ToggleLeft, ToggleRight, Filter, RefreshCw, X, Check,
  AlertTriangle, Info, Loader2
} from 'lucide-react';
import api from '../services/api';

// ============================================
// STANDARD-OPTIONEN (gleich wie Backend)
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

  // Statistiken
  showStatisticsSection: false,
  showStatusDistribution: true,
  showMonthlyTrend: true,
  showInfestationRate: true,

  // Rechtliches
  showLegalSection: true,
  showHACCPInfo: true,
  showIFSInfo: true,
  showSignatureFields: true,
  showDataIntegrityNote: true,

  // Filter
  dateFrom: null,
  dateTo: null,
  boxStatusFilter: null,
  boxTypeFilter: null,

  // Layout
  pageSize: 'A4',
  orientation: 'portrait',
  language: 'de',
  colorScheme: 'default'
};

// ============================================
// OPTION GRUPPEN DEFINITION
// ============================================
const OPTION_GROUPS = [
  {
    id: 'header',
    title: 'Header & Footer',
    icon: FileText,
    color: 'blue',
    options: [
      { key: 'showTrapMapLogo', label: 'TrapMap Logo', desc: 'Logo oben links' },
      { key: 'showOrgLogo', label: 'Firmen-Logo', desc: 'Ihr Logo oben rechts' },
      { key: 'showPageNumbers', label: 'Seitenzahlen', desc: 'Seite 1, 2, 3...' },
      { key: 'showGeneratedDate', label: 'Erstelldatum', desc: 'Wann Report erstellt wurde' },
      { key: 'showFooter', label: 'Footer anzeigen', desc: 'Fußzeile auf jeder Seite' }
    ]
  },
  {
    id: 'title',
    title: 'Titelseite',
    icon: Building2,
    color: 'purple',
    options: [
      { key: 'showTitlePage', label: 'Titelseite', desc: 'Deckblatt mit Objekt-Info', master: true },
      { key: 'showObjectDetails', label: 'Objekt-Details', desc: 'Name, Adresse' },
      { key: 'showObjectContact', label: 'Kontaktdaten', desc: 'Ansprechpartner, Telefon' },
      { key: 'showReportPeriod', label: 'Berichtszeitraum', desc: 'Von/Bis Datum' },
      { key: 'showExecutiveSummary', label: 'Zusammenfassung', desc: 'KPI-Boxen mit Zahlen' },
      { key: 'showOverallAssessment', label: 'Gesamtbewertung', desc: 'Ampel grün/gelb/rot' }
    ]
  },
  {
    id: 'boxtypes',
    title: 'Fallentypen & Köder',
    icon: Bug,
    color: 'green',
    options: [
      { key: 'showBoxTypesSection', label: 'Fallentypen-Sektion', desc: 'Übersicht aller Typen', master: true },
      { key: 'showBaitType', label: 'Köder-Art', desc: 'Fraßköder, Schlagfalle, etc.' },
      { key: 'showBaitSubstance', label: 'Wirkstoff', desc: 'Brodifacoum, Difenacoum, etc.', sensitive: true },
      { key: 'showBaitBrand', label: 'Markenname', desc: 'Ratimor, Storm, etc.' },
      { key: 'showBaitConcentration', label: 'Konzentration', desc: '0.0025%, 50ppm', sensitive: true },
      { key: 'showToxicityInfo', label: 'Gift-Information', desc: 'Ist giftig? Ja/Nein', sensitive: true },
      { key: 'showRegistrationNumber', label: 'Zulassungs-Nr.', desc: 'BAuA Nummer' },
      { key: 'showManufacturer', label: 'Hersteller', desc: 'Produzent des Köders' },
      { key: 'showTargetPests', label: 'Zielschädlinge', desc: 'Maus, Ratte, Schabe' }
    ]
  },
  {
    id: 'boxes',
    title: 'Fallen-Details',
    icon: MapPin,
    color: 'orange',
    options: [
      { key: 'showBoxDetailsSection', label: 'Fallen-Tabelle', desc: 'Liste aller Fallen', master: true },
      { key: 'showBoxNumber', label: 'Fallen-Nummer', desc: '1, 2, 3...' },
      { key: 'showBoxQRCode', label: 'QR-Code', desc: 'Eindeutige Kennung' },
      { key: 'showBoxType', label: 'Fallentyp', desc: 'Art der Falle' },
      { key: 'showBoxLocation', label: 'Standort', desc: 'Wo steht die Falle' },
      { key: 'showBoxGPSCoords', label: 'GPS-Koordinaten', desc: 'Lat/Lng Werte' },
      { key: 'showBoxFloorPlan', label: 'Lageplan', desc: 'Name des Lageplans' },
      { key: 'showBoxGridPosition', label: 'Rasterposition', desc: 'A1, B2, etc.' },
      { key: 'showBoxStatus', label: 'Status', desc: 'Aktueller Zustand' },
      { key: 'showBoxLastScan', label: 'Letzte Kontrolle', desc: 'Datum' },
      { key: 'showBoxNextDue', label: 'Nächste fällig', desc: 'Wann wieder prüfen' },
      { key: 'showBoxInterval', label: 'Kontrollintervall', desc: 'Alle X Tage' },
      { key: 'showBoxNotes', label: 'Notizen', desc: 'Bemerkungen zur Falle' },
      { key: 'showBoxBait', label: 'Aktueller Köder', desc: 'Was ist drin' }
    ]
  },
  {
    id: 'scans',
    title: 'Kontrollprotokoll',
    icon: ClipboardList,
    color: 'cyan',
    options: [
      { key: 'showScansSection', label: 'Scan-Protokoll', desc: 'Historie aller Kontrollen', master: true },
      { key: 'showScanDateTime', label: 'Datum & Uhrzeit', desc: 'Wann kontrolliert' },
      { key: 'showScanTechnician', label: 'Techniker', desc: 'Wer hat kontrolliert' },
      { key: 'showScanStatus', label: 'Status', desc: 'Ergebnis der Kontrolle' },
      { key: 'showScanFindings', label: 'Befunde', desc: 'Was wurde gefunden' },
      { key: 'showScanNotes', label: 'Bemerkungen', desc: 'Zusätzliche Notizen' },
      { key: 'showScanConsumption', label: 'Köderverbrauch', desc: 'Gramm verbraucht', sensitive: true },
      { key: 'showScanQuantity', label: 'Anzahl Schädlinge', desc: 'Wie viele gefunden' },
      { key: 'showScanTrapState', label: 'Fallenzustand', desc: 'Intakt/Beschädigt' },
      { key: 'showScanBaitCondition', label: 'Köderzustand', desc: 'Frisch/Verzehrt' },
      { key: 'showScanActivitySigns', label: 'Aktivitätszeichen', desc: 'Kot, Nagespuren' },
      { key: 'showScanCorrectiveAction', label: 'Maßnahmen', desc: 'Was wurde gemacht' },
      { key: 'showScanPhoto', label: 'Foto-Referenz', desc: 'Link zum Bild' }
    ]
  },
  {
    id: 'technicians',
    title: 'Techniker',
    icon: Users,
    color: 'pink',
    options: [
      { key: 'showTechnicianSection', label: 'Techniker-Übersicht', desc: 'Wer hat gearbeitet', master: true },
      { key: 'showTechnicianStats', label: 'Statistiken', desc: 'Kontrollen pro Person' }
    ]
  },
  {
    id: 'legal',
    title: 'Rechtliches',
    icon: Scale,
    color: 'gray',
    options: [
      { key: 'showLegalSection', label: 'Rechtliche Hinweise', desc: 'Compliance-Sektion', master: true },
      { key: 'showHACCPInfo', label: 'HACCP-Hinweise', desc: 'Lebensmittelsicherheit' },
      { key: 'showIFSInfo', label: 'IFS/BRC-Hinweise', desc: 'Zertifizierungs-Standards' },
      { key: 'showSignatureFields', label: 'Unterschriftenfelder', desc: 'Zum Unterschreiben' },
      { key: 'showDataIntegrityNote', label: 'Datenintegrität', desc: 'Manipulationssicherheit' }
    ]
  }
];

// ============================================
// VORLAGEN
// ============================================
const TEMPLATES = [
  {
    id: 'full',
    name: 'Vollständig',
    desc: 'Alle Details für interne Dokumentation',
    icon: FileText,
    preset: { ...DEFAULT_OPTIONS }
  },
  {
    id: 'customer',
    name: 'Kunden-Report',
    desc: 'Ohne sensible technische Details',
    icon: Building2,
    preset: {
      ...DEFAULT_OPTIONS,
      showBaitSubstance: false,
      showBaitConcentration: false,
      showToxicityInfo: false,
      showRegistrationNumber: false,
      showBoxGPSCoords: false,
      showScanConsumption: false,
      showScanTrapState: false,
      showScanBaitCondition: false,
      showScanActivitySigns: false
    }
  },
  {
    id: 'audit',
    name: 'Behörden-Audit',
    desc: 'Maximum Details für Prüfungen',
    icon: Scale,
    preset: {
      ...DEFAULT_OPTIONS,
      showScanPhoto: true,
      maxScans: 1000
    }
  },
  {
    id: 'minimal',
    name: 'Minimal',
    desc: 'Nur Zusammenfassung',
    icon: ClipboardList,
    preset: {
      ...DEFAULT_OPTIONS,
      showBoxTypesSection: false,
      showBoxDetailsSection: false,
      showScansSection: false,
      showTechnicianSection: false
    }
  },
  {
    id: 'scans-only',
    name: 'Nur Protokoll',
    desc: 'Nur Kontrollprotokoll',
    icon: ClipboardList,
    preset: {
      ...DEFAULT_OPTIONS,
      showExecutiveSummary: false,
      showOverallAssessment: false,
      showBoxTypesSection: false,
      showBoxDetailsSection: false,
      showTechnicianSection: false,
      showLegalSection: false
    }
  }
];

// ============================================
// CHECKBOX KOMPONENTE
// ============================================
const OptionCheckbox = ({ checked, onChange, label, desc, sensitive, disabled }) => (
  <label 
    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
      ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50'}
      ${checked ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'}
    `}
  >
    <div className="pt-0.5">
      {checked ? (
        <CheckSquare className="w-5 h-5 text-blue-600" />
      ) : (
        <Square className="w-5 h-5 text-gray-400" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className={`font-medium ${checked ? 'text-gray-900' : 'text-gray-600'}`}>
          {label}
        </span>
        {sensitive && (
          <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
            Sensibel
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
    </div>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="sr-only"
    />
  </label>
);

// ============================================
// GRUPPEN-HEADER
// ============================================
const GroupHeader = ({ group, isOpen, onToggle, allChecked, onToggleAll }) => {
  const Icon = group.icon;
  
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    pink: 'bg-pink-100 text-pink-600',
    gray: 'bg-gray-100 text-gray-600'
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-t-lg border-b">
      <button
        onClick={onToggle}
        className="flex items-center gap-3 flex-1 text-left"
      >
        <div className={`p-2 rounded-lg ${colorClasses[group.color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{group.title}</h3>
          <p className="text-sm text-gray-500">{group.options.length} Optionen</p>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>
      
      <button
        onClick={onToggleAll}
        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
          ${allChecked 
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }
        `}
      >
        {allChecked ? 'Alle ab' : 'Alle an'}
      </button>
    </div>
  );
};

// ============================================
// HAUPTKOMPONENTE
// ============================================
const AuditReportGenerator = ({ objectId, objectName, onClose }) => {
  const [options, setOptions] = useState({ ...DEFAULT_OPTIONS });
  const [openGroups, setOpenGroups] = useState(['header', 'title', 'boxtypes']);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [activeTab, setActiveTab] = useState('options'); // options, filter, layout
  const [boxTypes, setBoxTypes] = useState([]);
  const [error, setError] = useState(null);

  // Box-Typen laden
  useEffect(() => {
    const loadBoxTypes = async () => {
      try {
        const response = await api.get('/boxtypes');
        setBoxTypes(response.data.data || response.data.boxtypes || []);
      } catch (err) {
        console.error('Error loading box types:', err);
      }
    };
    loadBoxTypes();
  }, []);

  // Preview laden
  useEffect(() => {
    const loadPreview = async () => {
      if (!objectId) return;
      
      setPreviewLoading(true);
      try {
        const response = await api.get(`/audit-reports/${objectId}/preview`, {
          params: {
            date_from: options.dateFrom,
            date_to: options.dateTo
          }
        });
        setPreviewData(response.data);
      } catch (err) {
        console.error('Preview error:', err);
      } finally {
        setPreviewLoading(false);
      }
    };
    
    loadPreview();
  }, [objectId, options.dateFrom, options.dateTo]);

  // Option ändern
  const setOption = (key, value) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  // Gruppe togglen
  const toggleGroup = (groupId) => {
    setOpenGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Alle Optionen einer Gruppe togglen
  const toggleAllInGroup = (group) => {
    const allChecked = group.options.every(opt => options[opt.key]);
    const newValue = !allChecked;
    
    const newOptions = { ...options };
    group.options.forEach(opt => {
      newOptions[opt.key] = newValue;
    });
    setOptions(newOptions);
  };

  // Template anwenden
  const applyTemplate = (template) => {
    setOptions({ ...template.preset });
  };

  // PDF generieren
  const generatePDF = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/audit-reports/${objectId}`, {
        params: options,
        responseType: 'blob'
      });
      
      // Download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Audit-Report-${objectName || objectId}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('PDF generation error:', err);
      setError('Report konnte nicht erstellt werden. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  // Prüfe ob Gruppe komplett aktiviert
  const isGroupAllChecked = (group) => {
    return group.options.every(opt => options[opt.key]);
  };

  // Zähle aktive Optionen
  const countActiveOptions = () => {
    return Object.values(options).filter(v => v === true).length;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Audit-Report Generator</h2>
              <p className="text-blue-100">
                {objectName || `Objekt ${objectId}`} • {countActiveOptions()} Optionen aktiv
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {[
            { id: 'options', label: 'Inhalte', icon: Settings },
            { id: 'filter', label: 'Filter', icon: Filter },
            { id: 'layout', label: 'Layout', icon: Printer }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors
                ${activeTab === tab.id 
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white' 
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
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
            
            {/* Tab: Optionen */}
            {activeTab === 'options' && (
              <div className="space-y-4">
                
                {/* Templates */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Schnellauswahl
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATES.map(template => (
                      <button
                        key={template.id}
                        onClick={() => applyTemplate(template)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 
                          rounded-lg text-sm font-medium text-gray-700 transition-colors"
                      >
                        <template.icon className="w-4 h-4" />
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Option Groups */}
                {OPTION_GROUPS.map(group => (
                  <div key={group.id} className="border rounded-lg overflow-hidden">
                    <GroupHeader
                      group={group}
                      isOpen={openGroups.includes(group.id)}
                      onToggle={() => toggleGroup(group.id)}
                      allChecked={isGroupAllChecked(group)}
                      onToggleAll={() => toggleAllInGroup(group)}
                    />
                    
                    {openGroups.includes(group.id) && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.options.map(opt => {
                          // Prüfe ob Master-Option der Gruppe deaktiviert ist
                          const masterOption = group.options.find(o => o.master);
                          const isDisabled = masterOption && !opt.master && !options[masterOption.key];
                          
                          return (
                            <OptionCheckbox
                              key={opt.key}
                              checked={options[opt.key]}
                              onChange={() => setOption(opt.key, !options[opt.key])}
                              label={opt.label}
                              desc={opt.desc}
                              sensitive={opt.sensitive}
                              disabled={isDisabled}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Filter */}
            {activeTab === 'filter' && (
              <div className="space-y-6">
                
                {/* Zeitraum */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Zeitraum
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Von
                      </label>
                      <input
                        type="date"
                        value={options.dateFrom || ''}
                        onChange={(e) => setOption('dateFrom', e.target.value || null)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bis
                      </label>
                      <input
                        type="date"
                        value={options.dateTo || ''}
                        onChange={(e) => setOption('dateTo', e.target.value || null)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    {[
                      { label: 'Diesen Monat', from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] },
                      { label: 'Letzten Monat', from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0], to: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0] },
                      { label: 'Dieses Jahr', from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] },
                      { label: 'Alle', from: null, to: null }
                    ].map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setOption('dateFrom', preset.from);
                          setOption('dateTo', preset.to);
                        }}
                        className="px-3 py-1.5 text-sm bg-white border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    Status Filter
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Nur Fallen mit bestimmtem Status anzeigen
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'green', label: 'OK', color: 'bg-green-500' },
                      { value: 'yellow', label: 'Leicht auffällig', color: 'bg-yellow-500' },
                      { value: 'orange', label: 'Auffällig', color: 'bg-orange-500' },
                      { value: 'red', label: 'Befall', color: 'bg-red-500' }
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
                            setOption('boxStatusFilter', newFilter.length > 0 ? newFilter : null);
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors
                            ${isSelected 
                              ? 'border-blue-500 bg-blue-50 text-blue-700' 
                              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`w-3 h-3 rounded-full ${status.color}`} />
                          {status.label}
                          {isSelected && <Check className="w-4 h-4" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fallentyp Filter */}
                {boxTypes.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Bug className="w-5 h-5 text-green-600" />
                      Fallentyp Filter
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Nur bestimmte Fallentypen anzeigen
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {boxTypes.map(type => {
                        const isSelected = options.boxTypeFilter?.includes(type.id);
                        return (
                          <button
                            key={type.id}
                            onClick={() => {
                              const current = options.boxTypeFilter || [];
                              const newFilter = isSelected
                                ? current.filter(id => id !== type.id)
                                : [...current, type.id];
                              setOption('boxTypeFilter', newFilter.length > 0 ? newFilter : null);
                            }}
                            className={`px-4 py-2 rounded-lg border transition-colors
                              ${isSelected 
                                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                              }
                            `}
                          >
                            {type.name}
                            {isSelected && <Check className="w-4 h-4 inline ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Max Scans */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-cyan-600" />
                    Maximale Kontrollen
                  </h3>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="50"
                      max="1000"
                      step="50"
                      value={options.maxScans}
                      onChange={(e) => setOption('maxScans', parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-lg font-semibold text-gray-900 w-20 text-right">
                      {options.maxScans}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Layout */}
            {activeTab === 'layout' && (
              <div className="space-y-6">
                
                {/* Sprache */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-600" />
                    Sprache
                  </h3>
                  <div className="flex gap-3">
                    {[
                      { value: 'de', label: '🇩🇪 Deutsch' },
                      { value: 'en', label: '🇬🇧 English' }
                    ].map(lang => (
                      <button
                        key={lang.value}
                        onClick={() => setOption('language', lang.value)}
                        className={`flex-1 px-6 py-4 rounded-xl border-2 font-medium transition-all
                          ${options.language === lang.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seitengröße */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Seitengröße
                  </h3>
                  <div className="flex gap-3">
                    {[
                      { value: 'A4', label: 'A4 (210 × 297 mm)' },
                      { value: 'Letter', label: 'Letter (215.9 × 279.4 mm)' }
                    ].map(size => (
                      <button
                        key={size.value}
                        onClick={() => setOption('pageSize', size.value)}
                        className={`flex-1 px-6 py-4 rounded-xl border-2 font-medium transition-all
                          ${options.pageSize === size.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Farbschema */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Printer className="w-5 h-5 text-gray-600" />
                    Farbschema
                  </h3>
                  <div className="flex gap-3">
                    {[
                      { value: 'default', label: 'Farbe', desc: 'Für digitale Ansicht' },
                      { value: 'grayscale', label: 'Graustufen', desc: 'Für S/W-Druck' }
                    ].map(scheme => (
                      <button
                        key={scheme.value}
                        onClick={() => setOption('colorScheme', scheme.value)}
                        className={`flex-1 px-6 py-4 rounded-xl border-2 transition-all text-left
                          ${options.colorScheme === scheme.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className="font-medium text-gray-900">{scheme.label}</div>
                        <div className="text-sm text-gray-500">{scheme.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rechte Seite: Preview */}
          <div className="w-80 border-l bg-gray-50 p-6 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Vorschau
            </h3>
            
            {previewLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : previewData ? (
              <div className="space-y-4">
                {/* Objekt Info */}
                <div className="bg-white rounded-lg p-4 border">
                  <div className="font-medium text-gray-900">{previewData.object?.name}</div>
                  <div className="text-sm text-gray-500">{previewData.object?.city}</div>
                </div>

                {/* Statistiken */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 border text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {previewData.stats?.totalBoxes || 0}
                    </div>
                    <div className="text-xs text-gray-500">Fallen</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {previewData.stats?.totalScans || 0}
                    </div>
                    <div className="text-xs text-gray-500">Kontrollen</div>
                  </div>
                </div>

                {/* Status Verteilung */}
                <div className="bg-white rounded-lg p-4 border">
                  <div className="text-sm font-medium text-gray-700 mb-3">Status-Verteilung</div>
                  <div className="space-y-2">
                    {[
                      { key: 'green', label: 'OK', color: 'bg-green-500' },
                      { key: 'yellow', label: 'Leicht auffällig', color: 'bg-yellow-500' },
                      { key: 'orange', label: 'Auffällig', color: 'bg-orange-500' },
                      { key: 'red', label: 'Befall', color: 'bg-red-500' }
                    ].map(status => {
                      const count = previewData.stats?.statusDistribution?.[status.key] || 0;
                      const total = previewData.stats?.totalBoxes || 1;
                      const percent = Math.round((count / total) * 100);
                      
                      return (
                        <div key={status.key} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${status.color}`} />
                          <div className="flex-1">
                            <div className="flex justify-between text-xs">
                              <span>{status.label}</span>
                              <span className="font-medium">{count}</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full mt-1">
                              <div 
                                className={`h-full rounded-full ${status.color}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Aktive Sektionen */}
                <div className="bg-white rounded-lg p-4 border">
                  <div className="text-sm font-medium text-gray-700 mb-3">Im Report enthalten</div>
                  <div className="space-y-1.5 text-sm">
                    {options.showTitlePage && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Check className="w-4 h-4 text-green-500" /> Titelseite
                      </div>
                    )}
                    {options.showBoxTypesSection && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Check className="w-4 h-4 text-green-500" /> Fallentypen
                      </div>
                    )}
                    {options.showBoxDetailsSection && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Check className="w-4 h-4 text-green-500" /> Fallen-Details
                      </div>
                    )}
                    {options.showScansSection && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Check className="w-4 h-4 text-green-500" /> Kontrollprotokoll
                      </div>
                    )}
                    {options.showTechnicianSection && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Check className="w-4 h-4 text-green-500" /> Techniker
                      </div>
                    )}
                    {options.showLegalSection && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Check className="w-4 h-4 text-green-500" /> Rechtliches
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-10">
                Keine Vorschau verfügbar
              </div>
            )}
          </div>
        </div>

        {/* Footer mit Buttons */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Info className="w-4 h-4" />
            {countActiveOptions()} von {Object.keys(DEFAULT_OPTIONS).length} Optionen aktiviert
          </div>
          
          <div className="flex items-center gap-3">
            {error && (
              <div className="text-red-600 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            <button
              onClick={() => setOptions({ ...DEFAULT_OPTIONS })}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Zurücksetzen
            </button>
            
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Abbrechen
            </button>
            
            <button
              onClick={generatePDF}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Wird erstellt...
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
};

export default AuditReportGenerator;