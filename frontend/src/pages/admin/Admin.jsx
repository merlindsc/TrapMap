/* ============================================================
   TRAPMAP – SUPER ADMIN DASHBOARD
   Komplettes Admin-Panel mit allen Funktionen inkl. QR-Codes
   ============================================================ */

import { useState, useEffect } from "react";
import {
  QrCode, Building2, Users, Settings, Shield, Plus, Trash2,
  Edit2, Loader, Check, X, AlertCircle, Mail, Phone, MapPin,
  Eye, EyeOff, RefreshCw, UserPlus, UserCheck,
  BarChart3, Database, Server, Activity, MessageSquare
} from "lucide-react";

// QR-Codes Tab als separate Komponente importieren
import SuperAdminQROrders from "./SuperAdminQROrders";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Super-Admin E-Mails
const SUPER_ADMINS = [
  "admin@demo.trapmap.de",
  "merlin@trapmap.de", 
  "hilfe@die-schaedlingsexperten.de"
];

export default function Admin() {
  let token = null;
  let tokenAvailable = false;
  
  try {
    token = localStorage.getItem("trapmap_token");
    tokenAvailable = !!token;
    if (!token) {
      console.warn("⚠️ Kein Token verfügbar - Benutzer ist möglicherweise nicht eingeloggt");
    }
  } catch (error) {
    console.error("❌ localStorage nicht verfügbar:", error);
  }
  
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const jsonHeaders = { ...headers, "Content-Type": "application/json" };

  // Tab State
  const [activeTab, setActiveTab] = useState("qr");

  // Data States
  const [organisations, setOrganisations] = useState([]);
  const [users, setUsers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [demoRequests, setDemoRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // UI States
  const [message, setMessage] = useState(null);

  // Debug log on mount
  useEffect(() => {
    console.log("🔧 Super Admin Dashboard initialized");
    console.log("📡 API URL:", API);
    console.log("🔑 Token present:", !!token);
  }, []);

  // ============================================
  // HEADER STATS
  // ============================================
  const [headerStats, setHeaderStats] = useState({ orgs: 0, users: 0, qr: 0 });

  useEffect(() => {
    loadHeaderStats();
  }, []);

  const loadHeaderStats = async () => {
    try {
      console.log("📊 Loading header stats from:", `${API}/admin/stats`);
      console.log("🔑 Auth token present:", !!token);
      console.log("🔑 Token value:", token ? `${token.substring(0, 20)}...` : "null");
      
      const res = await fetch(`${API}/admin/stats`, { headers });
      
      console.log("📊 Stats response status:", res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log("📊 Stats data received:", data);
        setHeaderStats({
          orgs: data.organisations || 0,
          users: data.users || 0,
          qr: data.boxes || 0
        });
      } else if (res.status === 403) {
        const errorData = await res.json().catch(() => ({}));
        console.error("❌ 403 Forbidden:", errorData);
        showMessage("error", "Zugriff verweigert. Sie haben keine Super-Admin-Berechtigung oder Ihre Sitzung ist abgelaufen. Bitte erneut anmelden.");
      } else if (res.status === 401) {
        const errorData = await res.json().catch(() => ({}));
        console.error("❌ 401 Unauthorized:", errorData);
        showMessage("error", "Nicht authentifiziert. Bitte erneut anmelden.");
      } else {
        const errorText = await res.text();
        console.error("❌ Stats load failed:", res.status, errorText);
        showMessage("error", `Fehler beim Laden der Statistiken (${res.status}): ${errorText}`);
      }
    } catch (err) {
      console.error("❌ Stats error:", err);
      showMessage("error", `Netzwerkfehler beim Laden der Statistiken: ${err.message}`);
    }
  };

  // ============================================
  // DATA LOADING
  // ============================================
  useEffect(() => {
    if (activeTab !== "qr") {
      loadData();
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "organisations":
          await loadOrganisations();
          break;
        case "users":
          await loadAllUsers();
          await loadOrganisations(); // Für Dropdown
          break;
        case "partners":
          await loadAllPartners();
          await loadOrganisations(); // Für Dropdown
          break;
        case "demo":
          await loadDemoRequests();
          break;
        case "system":
          await loadSystemStats();
          break;
      }
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganisations = async () => {
    try {
      console.log("🏢 Loading organisations from:", `${API}/admin/organisations`);
      const res = await fetch(`${API}/admin/organisations`, { headers });
      console.log("🏢 Organisations response status:", res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log("🏢 Organisations data received:", data.length, "items");
        setOrganisations(Array.isArray(data) ? data : []);
      } else if (res.status === 403) {
        const errorData = await res.json().catch(() => ({}));
        console.error("❌ 403 Forbidden:", errorData);
        showMessage("error", "Zugriff verweigert. Sie haben keine Super-Admin-Berechtigung oder Ihre Sitzung ist abgelaufen. Bitte erneut anmelden.");
        setOrganisations([]);
      } else if (res.status === 401) {
        const errorData = await res.json().catch(() => ({}));
        console.error("❌ 401 Unauthorized:", errorData);
        showMessage("error", "Nicht authentifiziert. Bitte erneut anmelden.");
        setOrganisations([]);
      } else {
        const errorText = await res.text();
        console.error("❌ Organisations load failed:", res.status, errorText);
        showMessage("error", `Fehler beim Laden der Organisationen (${res.status})`);
        setOrganisations([]);
      }
    } catch (err) {
      console.error("❌ Organisations error:", err);
      showMessage("error", `Netzwerkfehler beim Laden der Organisationen: ${err.message}`);
      setOrganisations([]);
    }
  };

  const loadAllUsers = async () => {
    try {
      console.log("👥 Loading users from:", `${API}/admin/users`);
      const res = await fetch(`${API}/admin/users`, { headers });
      console.log("👥 Users response status:", res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log("👥 Users data received:", data.length, "items");
        setUsers(Array.isArray(data) ? data : []);
      } else if (res.status === 403) {
        const errorData = await res.json().catch(() => ({}));
        console.error("❌ 403 Forbidden:", errorData);
        showMessage("error", "Zugriff verweigert. Sie haben keine Super-Admin-Berechtigung oder Ihre Sitzung ist abgelaufen. Bitte erneut anmelden.");
        setUsers([]);
      } else if (res.status === 401) {
        const errorData = await res.json().catch(() => ({}));
        console.error("❌ 401 Unauthorized:", errorData);
        showMessage("error", "Nicht authentifiziert. Bitte erneut anmelden.");
        setUsers([]);
      } else {
        const errorText = await res.text();
        console.error("❌ Users load failed:", res.status, errorText);
        showMessage("error", `Fehler beim Laden der Benutzer (${res.status})`);
        setUsers([]);
      }
    } catch (err) {
      console.error("❌ Users error:", err);
      showMessage("error", `Netzwerkfehler beim Laden der Benutzer: ${err.message}`);
      setUsers([]);
    }
  };

  const loadAllPartners = async () => {
    try {
      console.log("🤝 Loading partners from:", `${API}/admin/partners`);
      const res = await fetch(`${API}/admin/partners`, { headers });
      console.log("🤝 Partners response status:", res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log("🤝 Partners data received:", data.length, "items");
        setPartners(Array.isArray(data) ? data : []);
      } else if (res.status === 403) {
        const errorData = await res.json().catch(() => ({}));
        console.error("❌ 403 Forbidden:", errorData);
        showMessage("error", "Zugriff verweigert. Sie haben keine Super-Admin-Berechtigung oder Ihre Sitzung ist abgelaufen. Bitte erneut anmelden.");
        setPartners([]);
      } else if (res.status === 401) {
        const errorData = await res.json().catch(() => ({}));
        console.error("❌ 401 Unauthorized:", errorData);
        showMessage("error", "Nicht authentifiziert. Bitte erneut anmelden.");
        setPartners([]);
      } else {
        const errorText = await res.text();
        console.error("❌ Partners load failed:", res.status, errorText);
        showMessage("error", `Fehler beim Laden der Partner (${res.status})`);
        setPartners([]);
      }
    } catch (err) {
      console.error("❌ Partners error:", err);
      showMessage("error", `Netzwerkfehler beim Laden der Partner: ${err.message}`);
      setPartners([]);
    }
  };

  const loadSystemStats = async () => {
    try {
      console.log("⚙️ Loading system stats from:", `${API}/admin/stats`);
      const res = await fetch(`${API}/admin/stats`, { headers });
      console.log("⚙️ System stats response status:", res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log("⚙️ System stats data received:", data);
        setStats(data);
      } else if (res.status === 403) {
        const errorData = await res.json().catch(() => ({}));
        console.error("❌ 403 Forbidden:", errorData);
        showMessage("error", "Zugriff verweigert. Sie haben keine Super-Admin-Berechtigung oder Ihre Sitzung ist abgelaufen. Bitte erneut anmelden.");
      } else if (res.status === 401) {
        const errorData = await res.json().catch(() => ({}));
        console.error("❌ 401 Unauthorized:", errorData);
        showMessage("error", "Nicht authentifiziert. Bitte erneut anmelden.");
      } else {
        const errorText = await res.text();
        console.error("❌ System stats load failed:", res.status, errorText);
        showMessage("error", `Fehler beim Laden der Systemstatistiken (${res.status})`);
      }
    } catch (err) {
      console.error("❌ System stats error:", err);
      showMessage("error", `Netzwerkfehler beim Laden der Systemstatistiken: ${err.message}`);
    }
  };

  const loadDemoRequests = async () => {
    try {
      console.log("📝 Loading demo requests from:", `${API}/demo/requests`);
      const res = await fetch(`${API}/demo/requests`, { headers });
      console.log("📝 Demo requests response status:", res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log("📝 Demo requests data received:", data.length, "items");
        setDemoRequests(data);
      } else if (res.status === 403) {
        const errorData = await res.json().catch(() => ({}));
        console.error("❌ 403 Forbidden:", errorData);
        showMessage("error", "Zugriff verweigert. Sie haben keine Berechtigung oder Ihre Sitzung ist abgelaufen. Bitte erneut anmelden.");
        setDemoRequests([]);
      } else if (res.status === 401) {
        const errorData = await res.json().catch(() => ({}));
        console.error("❌ 401 Unauthorized:", errorData);
        showMessage("error", "Nicht authentifiziert. Bitte erneut anmelden.");
        setDemoRequests([]);
      } else {
        const errorText = await res.text();
        console.error("❌ Demo requests load failed:", res.status, errorText);
        showMessage("error", `Fehler beim Laden der Demo-Anfragen (${res.status})`);
        setDemoRequests([]);
      }
    } catch (error) {
      console.error("❌ Demo requests error:", error);
      showMessage("error", `Netzwerkfehler beim Laden der Demo-Anfragen: ${error.message}`);
      setDemoRequests([]);
    }
  };

  // ============================================
  // MESSAGE HELPER
  // ============================================
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // ============================================
  // TABS CONFIG
  // ============================================
  const tabs = [
    { id: "qr", label: "QR-Codes", icon: QrCode, color: "bg-purple-600" },
    { id: "organisations", label: "Organisationen", icon: Building2, color: "bg-indigo-600" },
    { id: "users", label: "Benutzer", icon: Users, color: "bg-blue-600" },
    { id: "partners", label: "Partner", icon: UserCheck, color: "bg-amber-600" },
    { id: "demo", label: "Demo-Anfragen", icon: MessageSquare, color: "bg-green-600" },
    { id: "system", label: "System", icon: Settings, color: "bg-gray-600" }
  ];

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
            <Shield size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Super-Admin Dashboard</h1>
            <p className="text-gray-200 text-sm">TrapMap Systemverwaltung</p>
          </div>
        </div>

        {/* Header Stats */}
        <div className="hidden md:flex gap-4 text-sm">
          <div className="text-white font-medium">{headerStats.orgs} <span className="text-gray-200">Organisationen</span></div>
          <div className="text-white font-medium">{headerStats.users} <span className="text-gray-200">Benutzer</span></div>
          <div className="text-white font-medium">{headerStats.qr} <span className="text-gray-200">QR-Codes</span></div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-900/30 border border-green-500/30 text-green-400'
            : 'bg-red-900/30 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? `${tab.color} text-white`
                : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "qr" ? (
        // QR-Tab: Nutze die separate Komponente
        <SuperAdminQROrders />
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-xl p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader className="animate-spin text-indigo-400" size={32} />
            </div>
          ) : (
            <>
              {activeTab === "organisations" && (
                <OrganisationsTab 
                  organisations={organisations}
                  onRefresh={loadOrganisations}
                  showMessage={showMessage}
                  headers={headers}
                  jsonHeaders={jsonHeaders}
                />
              )}
              {activeTab === "users" && (
                <UsersTab 
                  users={users}
                  organisations={organisations}
                  onRefresh={loadAllUsers}
                  showMessage={showMessage}
                  headers={headers}
                  jsonHeaders={jsonHeaders}
                />
              )}
              {activeTab === "partners" && (
                <PartnersTab 
                  partners={partners}
                  organisations={organisations}
                  onRefresh={loadAllPartners}
                  showMessage={showMessage}
                  headers={headers}
                  jsonHeaders={jsonHeaders}
                />
              )}
              {activeTab === "demo" && (
                <DemoRequestsTab 
                  demoRequests={demoRequests}
                  onRefresh={loadDemoRequests}
                  showMessage={showMessage}
                  headers={headers}
                  jsonHeaders={jsonHeaders}
                />
              )}
              {activeTab === "system" && (
                <SystemTab 
                  stats={stats}
                  onRefresh={loadSystemStats}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// ORGANISATIONEN TAB (MIT EDIT-FUNKTION)
// ============================================
function OrganisationsTab({ organisations, onRefresh, showMessage, headers, jsonHeaders }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null); // Für Edit-Modus
  const [form, setForm] = useState({
    name: "", email: "", address: "", zip: "", city: "", phone: ""
  });

  // Form zurücksetzen
  const resetForm = () => {
    setForm({ name: "", email: "", address: "", zip: "", city: "", phone: "" });
    setEditingOrg(null);
    setShowForm(false);
  };

  // Edit starten
  const handleEdit = (org) => {
    setEditingOrg(org);
    setForm({
      name: org.name || "",
      email: org.email || "",
      address: org.address || "",
      zip: org.zip || "",
      city: org.city || "",
      phone: org.phone || ""
    });
    setShowForm(true);
  };

  // Neue Organisation anlegen
  const handleNewOrg = () => {
    resetForm();
    setShowForm(true);
  };

  // Create oder Update
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return showMessage("error", "Name erforderlich");

    setSaving(true);
    try {
      // Unterscheide zwischen Create und Update
      const url = editingOrg 
        ? `${API}/admin/organisations/${editingOrg.id}`
        : `${API}/admin/organisations`;
      
      const method = editingOrg ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: jsonHeaders,
        body: JSON.stringify(form)
      });

      if (res.ok) {
        showMessage("success", editingOrg 
          ? `Organisation "${form.name}" aktualisiert!`
          : `Organisation "${form.name}" erstellt!`
        );
        resetForm();
        onRefresh();
      } else {
        const err = await res.json();
        showMessage("error", err.error || "Fehler beim Speichern");
      }
    } catch (err) {
      showMessage("error", "Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (org) => {
    if (!confirm(`"${org.name}" wirklich löschen?\n\nAlle Daten werden gelöscht!`)) return;

    try {
      const res = await fetch(`${API}/admin/organisations/${org.id}`, {
        method: "DELETE",
        headers
      });
      if (res.ok) {
        showMessage("success", "Organisation gelöscht");
        onRefresh();
      }
    } catch (err) {
      showMessage("error", "Fehler beim Löschen");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Building2 size={20} className="text-indigo-400" />
          Organisationen ({organisations.length})
        </h2>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="p-2 bg-gray-100 dark:bg-gray-950 hover:bg-gray-200 dark:hover:bg-gray-900 rounded-lg text-gray-700 dark:text-gray-400">
            <RefreshCw size={18} />
          </button>
          <button
            onClick={handleNewOrg}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            <Plus size={18} />
            Neue Organisation
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-950 rounded-lg p-4 mb-6 border border-gray-200 dark:border-white/10">
          {/* Titel zeigt Create vs Edit */}
          <h3 className="text-gray-900 dark:text-white font-medium mb-4 flex items-center gap-2">
            {editingOrg ? (
              <><Edit2 size={18} className="text-blue-400" /> Organisation bearbeiten</>
            ) : (
              <><Plus size={18} className="text-green-400" /> Neue Organisation</>
            )}
          </h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <input type="text" placeholder="Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2 text-gray-900 dark:text-white" required />
            <input type="email" placeholder="E-Mail" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2 text-gray-900 dark:text-white" />
            <input type="text" placeholder="Stra\u00dfe" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2 text-gray-900 dark:text-white" />
            <div className="flex gap-2">
              <input type="text" placeholder="PLZ" value={form.zip} onChange={e => setForm({...form, zip: e.target.value})} className="w-24 bg-white dark:bg-gray-900 border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2 text-gray-900 dark:text-white" />
              <input type="text" placeholder="Ort" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2 text-gray-900 dark:text-white" />
            </div>
            <input type="tel" placeholder="Telefon" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2 text-gray-900 dark:text-white" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${editingOrg ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}>
              {saving ? <Loader size={18} className="animate-spin" /> : (editingOrg ? "Speichern" : "Erstellen")}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Abbrechen</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {organisations.map(org => (
          <div key={org.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">#{org.id}</span>
                <h3 className="font-medium text-gray-900 dark:text-white">{org.name}</h3>
              </div>
              <div className="flex gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                {org.email && <span className="flex items-center gap-1"><Mail size={12} />{org.email}</span>}
                {org.city && <span className="flex items-center gap-1"><MapPin size={12} />{org.city}</span>}
              </div>
            </div>
            {/* Edit + Delete Buttons */}
            <div className="flex gap-1">
              <button onClick={() => handleEdit(org)} className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg" title="Bearbeiten">
                <Edit2 size={18} />
              </button>
              <button onClick={() => handleDelete(org)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg" title="Löschen">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {organisations.length === 0 && <p className="text-center text-gray-600 dark:text-gray-500 py-8">Keine Organisationen</p>}
      </div>
    </div>
  );
}

// ============================================
// BENUTZER TAB
// ============================================
function UsersTab({ users, organisations, onRefresh, showMessage, headers, jsonHeaders }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "", role: "technician", organisation_id: "" });

  const roles = [
    { value: "admin", label: "Admin", color: "bg-purple-500/20 text-purple-400" },
    { value: "supervisor", label: "Supervisor", color: "bg-blue-500/20 text-blue-400" },
    { value: "technician", label: "Techniker", color: "bg-green-500/20 text-green-400" },
    { value: "auditor", label: "Auditor", color: "bg-yellow-500/20 text-yellow-400" },
    { value: "viewer", label: "Viewer", color: "bg-gray-500/20 text-gray-400" }
  ];

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.organisation_id) return showMessage("error", "Alle Pflichtfelder ausfüllen");

    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/users`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(form) });
      if (res.ok) {
        showMessage("success", `Benutzer "${form.email}" erstellt!`);
        setForm({ email: "", password: "", first_name: "", last_name: "", role: "technician", organisation_id: "" });
        setShowForm(false);
        onRefresh();
      } else {
        const err = await res.json();
        showMessage("error", err.error || "Fehler");
      }
    } catch (err) {
      showMessage("error", "Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Benutzer "${user.email}" wirklich löschen?`)) return;
    try {
      const res = await fetch(`${API}/admin/users/${user.id}`, { method: "DELETE", headers });
      if (res.ok) { showMessage("success", "Benutzer gelöscht"); onRefresh(); }
    } catch (err) { showMessage("error", "Fehler"); }
  };

  const toggleActive = async (user) => {
    try {
      const res = await fetch(`${API}/admin/users/${user.id}`, { method: "PUT", headers: jsonHeaders, body: JSON.stringify({ active: !user.active }) });
      if (res.ok) { showMessage("success", user.active ? "Benutzer deaktiviert" : "Benutzer aktiviert"); onRefresh(); }
    } catch (err) { showMessage("error", "Fehler"); }
  };

  const getRoleStyle = (role) => roles.find(r => r.value === role)?.color || "bg-gray-500/20 text-gray-400";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users size={20} className="text-blue-400" />
          Alle Benutzer ({users.length})
        </h2>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="p-2 bg-gray-100 dark:bg-gray-950 hover:bg-gray-200 dark:hover:bg-gray-900 rounded-lg text-gray-700 dark:text-gray-400"><RefreshCw size={18} /></button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            <UserPlus size={18} />Neuer Benutzer
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-[#0d0d1a] rounded-lg p-4 mb-6 border border-white/10">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <select value={form.organisation_id} onChange={e => setForm({...form, organisation_id: e.target.value})} className="bg-gray-900 dark:bg-gray-950 border border-white/10 dark:border-white/20 rounded-lg px-4 py-2 text-white" required>
              <option value="">Organisation wählen *</option>
              {organisations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
            </select>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="bg-gray-900 dark:bg-gray-950 border border-white/10 dark:border-white/20 rounded-lg px-4 py-2 text-white">
              {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <input type="email" placeholder="E-Mail *" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="bg-gray-900 dark:bg-gray-950 border border-white/10 dark:border-white/20 rounded-lg px-4 py-2 text-white" required />
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="Passwort *" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-gray-900 dark:bg-gray-950 border border-white/10 dark:border-white/20 rounded-lg px-4 py-2 pr-10 text-white" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <input type="text" placeholder="Vorname" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="bg-gray-900 dark:bg-gray-950 border border-white/10 dark:border-white/20 rounded-lg px-4 py-2 text-white" />
            <input type="text" placeholder="Nachname" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="bg-gray-900 dark:bg-gray-950 border border-white/10 dark:border-white/20 rounded-lg px-4 py-2 text-white" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {saving ? <Loader size={18} className="animate-spin" /> : "Erstellen"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Abbrechen</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {users.map(user => (
          <div key={user.id} className={`flex items-center justify-between p-4 rounded-lg border ${user.active ? 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-white/5' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-500/20'}`}>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded ${getRoleStyle(user.role)}`}>{user.role}</span>
                <h3 className="font-medium text-gray-900 dark:text-white">{user.email}</h3>
                {!user.active && <span className="text-xs text-red-400">(Inaktiv)</span>}
              </div>
              <div className="flex gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                <span>{user.first_name} {user.last_name}</span>
                <span className="text-gray-600 dark:text-gray-600">|</span>
                <span className="text-indigo-400">{user.organisation_name || `Org #${user.organisation_id}`}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => toggleActive(user)} className={`p-2 rounded-lg ${user.active ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-green-400 hover:bg-green-500/20'}`} title={user.active ? "Deaktivieren" : "Aktivieren"}>
                {user.active ? <X size={18} /> : <Check size={18} />}
              </button>
              <button onClick={() => handleDelete(user)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
        {users.length === 0 && <p className="text-center text-gray-600 dark:text-gray-500 py-8">Keine Benutzer</p>}
      </div>
    </div>
  );
}

// ============================================
// PARTNER TAB
// ============================================
function PartnersTab({ partners, organisations, onRefresh, showMessage, headers, jsonHeaders }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", company: "", phone: "", organisation_id: "" });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.name || !form.organisation_id) return showMessage("error", "Alle Pflichtfelder ausfüllen");

    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/partners`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(form) });
      if (res.ok) {
        showMessage("success", `Partner "${form.name}" erstellt!`);
        setForm({ email: "", password: "", name: "", company: "", phone: "", organisation_id: "" });
        setShowForm(false);
        onRefresh();
      } else {
        const err = await res.json();
        showMessage("error", err.error || "Fehler");
      }
    } catch (err) {
      showMessage("error", "Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (partner) => {
    if (!confirm(`Partner "${partner.name}" wirklich löschen?`)) return;
    try {
      const res = await fetch(`${API}/admin/partners/${partner.id}`, { method: "DELETE", headers });
      if (res.ok) { showMessage("success", "Partner gelöscht"); onRefresh(); }
    } catch (err) { showMessage("error", "Fehler"); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <UserCheck size={20} className="text-amber-400" />
          Externe Partner ({partners.length})
        </h2>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="p-2 bg-[#0d0d1a] hover:bg-[#252542] rounded-lg text-gray-400"><RefreshCw size={18} /></button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg">
            <Plus size={18} />Neuer Partner
          </button>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6 text-amber-200 text-sm">
        <strong>Partner</strong> sind externe Kunden-Mitarbeiter die nur ihre zugewiesenen Objekte sehen und Kontrollen durchführen können.
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-[#0d0d1a] rounded-lg p-4 mb-6 border border-white/10">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <select value={form.organisation_id} onChange={e => setForm({...form, organisation_id: e.target.value})} className="bg-[#1a1a2e] border border-white/10 rounded-lg px-4 py-2 text-white" required>
              <option value="">Organisation wählen *</option>
              {organisations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
            </select>
            <input type="text" placeholder="Firma (z.B. BMW)" value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="bg-[#1a1a2e] border border-white/10 rounded-lg px-4 py-2 text-white" />
            <input type="text" placeholder="Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-[#1a1a2e] border border-white/10 rounded-lg px-4 py-2 text-white" required />
            <input type="email" placeholder="E-Mail *" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="bg-[#1a1a2e] border border-white/10 rounded-lg px-4 py-2 text-white" required />
            <input type="password" placeholder="Passwort *" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="bg-[#1a1a2e] border border-white/10 rounded-lg px-4 py-2 text-white" required />
            <input type="tel" placeholder="Telefon" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="bg-[#1a1a2e] border border-white/10 rounded-lg px-4 py-2 text-white" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50">
              {saving ? <Loader size={18} className="animate-spin" /> : "Erstellen"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Abbrechen</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {partners.map(partner => (
          <div key={partner.id} className={`flex items-center justify-between p-4 rounded-lg border ${partner.is_active !== false ? 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-white/5' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-500/20'}`}>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <UserCheck size={16} className="text-amber-400" />
                <h3 className="font-medium text-gray-900 dark:text-white">{partner.name}</h3>
                {partner.company && <span className="text-sm text-gray-600 dark:text-gray-400">({partner.company})</span>}
              </div>
              <div className="flex gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1"><Mail size={12} />{partner.email}</span>
                {partner.phone && <span className="flex items-center gap-1"><Phone size={12} />{partner.phone}</span>}
                <span className="text-indigo-400">{partner.organisation_name || `Org #${partner.organisation_id}`}</span>
              </div>
            </div>
            <button onClick={() => handleDelete(partner)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 size={18} /></button>
          </div>
        ))}
        {partners.length === 0 && <p className="text-center text-gray-600 dark:text-gray-500 py-8">Keine Partner angelegt</p>}
      </div>
    </div>
  );
}

// ============================================
// SYSTEM TAB
// ============================================
function SystemTab({ stats, onRefresh }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings size={20} className="text-gray-600 dark:text-gray-400" />
          System-Übersicht
        </h2>
        <button onClick={onRefresh} className="p-2 bg-gray-100 dark:bg-gray-950 hover:bg-gray-200 dark:hover:bg-gray-900 rounded-lg text-gray-700 dark:text-gray-400"><RefreshCw size={18} /></button>
      </div>

      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard icon={Building2} label="Organisationen" value={stats?.organisations || 0} color="indigo" />
        <StatCard icon={Users} label="Benutzer" value={stats?.users || 0} color="blue" />
        <StatCard icon={UserCheck} label="Partner" value={stats?.partners || 0} color="amber" />
        <StatCard icon={Database} label="Objekte" value={stats?.objects || 0} color="green" />
        <StatCard icon={QrCode} label="Boxen" value={stats?.boxes || 0} color="purple" />
        <StatCard icon={BarChart3} label="Scans" value={stats?.scans || 0} color="pink" />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-white/10">
        <h3 className="text-gray-900 dark:text-white font-medium mb-4 flex items-center gap-2">
          <Server size={18} className="text-gray-600 dark:text-gray-400" />
          System-Information
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-white/5">
            <span className="text-gray-600 dark:text-gray-400">Version</span>
            <span className="text-gray-900 dark:text-white">TrapMap 1.0.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-white/5">
            <span className="text-gray-600 dark:text-gray-400">Umgebung</span>
            <span className="text-green-400">Production</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-white/5">
            <span className="text-gray-600 dark:text-gray-400">API Status</span>
            <span className="text-green-400 flex items-center gap-1"><Activity size={14} /> Online</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-white/5">
            <span className="text-gray-600 dark:text-gray-400">Datenbank</span>
            <span className="text-green-400">Supabase</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    indigo: "from-indigo-500 to-indigo-600",
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    amber: "from-amber-500 to-amber-600",
    pink: "from-pink-500 to-pink-600",
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-white/10">
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );
}

// ============================================
// DEMO REQUESTS TAB
// ============================================
function DemoRequestsTab({ demoRequests, onRefresh, showMessage, headers, jsonHeaders }) {
  const [creatingAccount, setCreatingAccount] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const handleCreateAccount = async (request) => {
    const password = prompt(`Demo-Account für ${request.name} erstellen.\n\nPasswort eingeben (oder leer lassen für automatisch generiertes):`) || 
                    'demo' + Math.random().toString(36).substr(2, 6);
    
    if (!password) return;

    setCreatingAccount(request.id);
    
    try {
      const res = await fetch(`${API_URL}/demo/create-account/${request.id}`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ password, trial_days: 90 })
      });

      const result = await res.json();

      if (res.ok) {
        showMessage('success', `Demo-Account für ${request.name} erstellt! Passwort: ${password}`);
        onRefresh();
      } else {
        showMessage('error', result.error || 'Fehler beim Erstellen des Demo-Accounts');
      }
    } catch (error) {
      showMessage('error', 'Netzwerkfehler beim Erstellen des Demo-Accounts');
      console.error(error);
    } finally {
      setCreatingAccount(null);
    }
  };

  const handleDelete = async (request) => {
    if (!window.confirm(`Demo-Anfrage von ${request.name} löschen?`)) return;
    
    try {
      const res = await fetch(`${API_URL}/demo/requests/${request.id}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        showMessage('success', 'Demo-Anfrage gelöscht');
        onRefresh();
      } else {
        showMessage('error', 'Fehler beim Löschen der Demo-Anfrage');
      }
    } catch (error) {
      showMessage('error', 'Netzwerkfehler beim Löschen');
      console.error(error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-900/20';
      case 'pending': return 'text-yellow-400 bg-yellow-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Erledigt';
      case 'pending': return 'Offen';
      default: return status;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Demo-Anfragen</h3>
        <div className="text-sm text-gray-400">
          {demoRequests.length} Anfrage{demoRequests.length !== 1 ? 'n' : ''}
        </div>
      </div>

      {demoRequests.length === 0 ? (
        <div className="bg-gray-900/50 rounded-lg p-8 text-center">
          <MessageSquare size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Noch keine Demo-Anfragen vorhanden</p>
        </div>
      ) : (
        <div className="space-y-3">
          {demoRequests.map((request) => (
            <div key={request.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-white">{request.name}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(request.status)}`}>
                      {getStatusText(request.status)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">E-Mail:</span>
                      <span className="text-gray-300 ml-2">{request.email}</span>
                    </div>
                    {request.company && (
                      <div>
                        <span className="text-gray-400">Firma:</span>
                        <span className="text-gray-300 ml-2">{request.company}</span>
                      </div>
                    )}
                    {request.phone && (
                      <div>
                        <span className="text-gray-400">Telefon:</span>
                        <span className="text-gray-300 ml-2">{request.phone}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-400">Datum:</span>
                      <span className="text-gray-300 ml-2">
                        {new Date(request.created_at).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                  </div>
                  
                  {request.expectations && (
                    <div className="mt-3">
                      <span className="text-gray-400 text-sm">Erwartungen:</span>
                      <p className="text-gray-300 mt-1 text-sm">{request.expectations}</p>
                    </div>
                  )}

                  {request.password && (
                    <div className="mt-3 p-2 bg-green-900/20 border border-green-500/30 rounded">
                      <span className="text-green-400 text-sm">Passwort: </span>
                      <code className="text-green-300">{request.password}</code>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  {request.status === 'pending' && (
                    <button
                      onClick={() => handleCreateAccount(request)}
                      disabled={creatingAccount === request.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded disabled:opacity-50"
                    >
                      {creatingAccount === request.id ? (
                        <Loader size={14} className="animate-spin" />
                      ) : (
                        <UserPlus size={14} />
                      )}
                      Account erstellen
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDelete(request)}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}