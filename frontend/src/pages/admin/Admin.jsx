/* ============================================================
   TRAPMAP — ADMIN PAGE
   Tab 1: Organisationen verwalten
   Tab 2: Benutzer verwalten (alle Orgs)
   Nur für Super-Admin
   ============================================================ */

import { useState, useEffect } from "react";
import { 
  Plus, Building2, Trash2, Loader, Users, Check, 
  UserPlus, ChevronDown, ChevronUp, Key, 
  ToggleLeft, ToggleRight, AlertCircle, Search
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function Admin() {
  const token = localStorage.getItem("trapmap_token");
  
  const [activeTab, setActiveTab] = useState("orgs");
  const [orgs, setOrgs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [expandedOrg, setExpandedOrg] = useState(null);
  const [orgUsers, setOrgUsers] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  // Neue Organisation Form
  const [newOrg, setNewOrg] = useState({
    name: "", address: "", zip: "", city: "", phone: "", email: "",
    adminEmail: "", adminFirstName: "", adminLastName: ""
  });

  // Neuer User Form
  const [newUser, setNewUser] = useState({
    orgId: "", email: "", firstName: "", lastName: "", role: "technician"
  });

  const roles = [
    { value: "admin", label: "Admin", color: "purple" },
    { value: "supervisor", label: "Supervisor", color: "blue" },
    { value: "technician", label: "Techniker", color: "green" },
    { value: "auditor", label: "Auditor", color: "orange" },
    { value: "viewer", label: "Kunde", color: "gray" },
    { value: "partner", label: "Partner", color: "cyan" }
  ];

  // Organisationen laden
  const loadOrgs = async () => {
    try {
      const res = await fetch(`${API}/admin/organisations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setOrgs(await res.json());
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Alle User laden
  const loadAllUsers = async () => {
    try {
      const res = await fetch(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setAllUsers(await res.json());
    } catch (e) {
      console.error("Load users error:", e);
    }
  };

  useEffect(() => {
    loadOrgs();
    loadAllUsers();
  }, []);

  // User einer Organisation laden
  const loadOrgUsers = async (orgId) => {
    try {
      const res = await fetch(`${API}/admin/organisations/${orgId}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const users = await res.json();
        setOrgUsers(prev => ({ ...prev, [orgId]: users }));
      }
    } catch (e) {
      console.error("Load users error:", e);
    }
  };

  const toggleOrg = (orgId) => {
    if (expandedOrg === orgId) {
      setExpandedOrg(null);
    } else {
      setExpandedOrg(orgId);
      if (!orgUsers[orgId]) loadOrgUsers(orgId);
    }
  };

  // Organisation erstellen
  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!newOrg.name.trim()) {
      setMessage({ type: "error", text: "Name ist erforderlich" });
      return;
    }

    const hasAdminData = newOrg.adminEmail || newOrg.adminFirstName || newOrg.adminLastName;
    const hasAllAdminData = newOrg.adminEmail && newOrg.adminFirstName && newOrg.adminLastName;
    
    if (hasAdminData && !hasAllAdminData) {
      setMessage({ type: "error", text: "Bitte alle Admin-Felder ausfüllen oder alle leer lassen" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${API}/admin/organisations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newOrg)
      });

      if (res.ok) {
        const created = await res.json();
        setOrgs(prev => [...prev, created]);
        setNewOrg({ name: "", address: "", zip: "", city: "", phone: "", email: "", adminEmail: "", adminFirstName: "", adminLastName: "" });
        
        let msg = `Organisation "${created.name}" erstellt!`;
        if (created.adminUser) {
          msg += created.adminUser.emailSent 
            ? ` Einladungs-Email an ${created.adminUser.email} gesendet.`
            : ` Admin erstellt, aber Email konnte nicht gesendet werden.`;
        }
        setMessage({ type: "success", text: msg });
        loadAllUsers();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Fehler" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Netzwerkfehler" });
    } finally {
      setSaving(false);
    }
  };

  // Neuen User erstellen
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.orgId || !newUser.email || !newUser.firstName || !newUser.lastName) {
      setMessage({ type: "error", text: "Bitte alle Felder ausfüllen" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${API}/admin/organisations/${newUser.orgId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role
        })
      });

      if (res.ok) {
        const created = await res.json();
        setNewUser({ orgId: "", email: "", firstName: "", lastName: "", role: "technician" });
        
        const msg = created.emailSent 
          ? `Benutzer erstellt! Einladungs-Email an ${created.email} gesendet.`
          : `Benutzer erstellt, aber Email konnte nicht gesendet werden.`;
        setMessage({ type: "success", text: msg });
        loadAllUsers();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Fehler" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Netzwerkfehler" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrg = async (id, name) => {
    if (!confirm(`Organisation "${name}" wirklich löschen?\n\nAlle Benutzer, Objekte und Daten werden gelöscht!`)) return;

    try {
      const res = await fetch(`${API}/admin/organisations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setOrgs(prev => prev.filter(o => o.id !== id));
        setMessage({ type: "success", text: "Organisation gelöscht" });
        loadAllUsers();
      }
    } catch (e) {
      setMessage({ type: "error", text: "Fehler beim Löschen" });
    }
  };

  const toggleUserActive = async (userId, orgId = null) => {
    try {
      const res = await fetch(`${API}/admin/users/${userId}/toggle-active`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        if (orgId) loadOrgUsers(orgId);
        loadAllUsers();
      }
    } catch (e) {
      console.error("Toggle error:", e);
    }
  };

  const resetPassword = async (userId, email) => {
    if (!confirm(`Passwort für ${email} zurücksetzen?\n\nEin neues temporäres Passwort wird per Email gesendet.`)) return;

    try {
      const res = await fetch(`${API}/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const result = await res.json();
        setMessage({ 
          type: "success", 
          text: result.emailSent 
            ? `Neues Passwort an ${email} gesendet`
            : `Passwort zurückgesetzt, aber Email konnte nicht gesendet werden`
        });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Fehler beim Zurücksetzen" });
    }
  };

  const deleteUser = async (userId, email, orgId = null) => {
    if (!confirm(`Benutzer "${email}" wirklich löschen?`)) return;

    try {
      const res = await fetch(`${API}/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        if (orgId) loadOrgUsers(orgId);
        loadAllUsers();
        setMessage({ type: "success", text: "Benutzer gelöscht" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Fehler beim Löschen" });
    }
  };

  const getRoleStyle = (role) => {
    const colors = {
      admin: "bg-purple-500/20 text-purple-400",
      supervisor: "bg-blue-500/20 text-blue-400",
      technician: "bg-green-500/20 text-green-400",
      auditor: "bg-orange-500/20 text-orange-400",
      viewer: "bg-gray-500/20 text-gray-400",
      partner: "bg-cyan-500/20 text-cyan-400"
    };
    return colors[role] || colors.viewer;
  };

  const getRoleLabel = (role) => roles.find(r => r.value === role)?.label || role;

  const filteredUsers = allUsers.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(search) ||
      user.first_name?.toLowerCase().includes(search) ||
      user.last_name?.toLowerCase().includes(search) ||
      user.org_name?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Admin</h1>
      <p className="text-gray-400 mb-6">Organisationen und Benutzer verwalten</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("orgs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
            activeTab === "orgs" ? "bg-indigo-600 text-white" : "bg-[#1a1a2e] text-gray-400 hover:text-white"
          }`}
        >
          <Building2 size={18} />
          Organisationen
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
            activeTab === "users" ? "bg-indigo-600 text-white" : "bg-[#1a1a2e] text-gray-400 hover:text-white"
          }`}
        >
          <Users size={18} />
          Benutzer
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-900/30 border border-green-500/30 text-green-400'
            : 'bg-red-900/30 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* TAB: ORGANISATIONEN */}
      {activeTab === "orgs" && (
        <>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Plus size={20} className="text-green-400" />
              Neue Organisation erstellen
            </h2>

            <form onSubmit={handleCreateOrg} className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Building2 size={16} /> Organisation
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Name *</label>
                    <input type="text" value={newOrg.name} onChange={(e) => setNewOrg(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="Firma GmbH" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">E-Mail (Firma)</label>
                    <input type="email" value={newOrg.email} onChange={(e) => setNewOrg(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="info@firma.de" />
                  </div>
                </div>
                <div className="grid md:grid-cols-4 gap-4 mt-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">Straße</label>
                    <input type="text" value={newOrg.address} onChange={(e) => setNewOrg(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="Musterstraße 1" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">PLZ</label>
                    <input type="text" value={newOrg.zip} onChange={(e) => setNewOrg(prev => ({ ...prev, zip: e.target.value }))}
                      className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="12345" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Ort</label>
                    <input type="text" value={newOrg.city} onChange={(e) => setNewOrg(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="Hamburg" />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-6">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <UserPlus size={16} /> Admin-Benutzer (optional)
                </h3>
                <p className="text-xs text-gray-500 mb-3">Erstellt automatisch einen Admin mit Einladungs-Email.</p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Vorname</label>
                    <input type="text" value={newOrg.adminFirstName} onChange={(e) => setNewOrg(prev => ({ ...prev, adminFirstName: e.target.value }))}
                      className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="Max" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Nachname</label>
                    <input type="text" value={newOrg.adminLastName} onChange={(e) => setNewOrg(prev => ({ ...prev, adminLastName: e.target.value }))}
                      className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="Mustermann" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">E-Mail</label>
                    <input type="email" value={newOrg.adminEmail} onChange={(e) => setNewOrg(prev => ({ ...prev, adminEmail: e.target.value }))}
                      className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="max@firma.de" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50">
                {saving ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
                Organisation erstellen
              </button>
            </form>
          </div>

          <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 size={20} className="text-indigo-400" />
              Alle Organisationen ({orgs.length})
            </h2>

            {loading ? (
              <div className="flex justify-center py-8"><Loader className="animate-spin text-indigo-400" size={32} /></div>
            ) : orgs.length === 0 ? (
              <p className="text-gray-400">Keine Organisationen vorhanden</p>
            ) : (
              <div className="space-y-3">
                {orgs.map(org => (
                  <div key={org.id} className="bg-[#0d0d1a] rounded-lg border border-white/5 overflow-hidden">
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5" onClick={() => toggleOrg(org.id)}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">ID: {org.id}</span>
                        <h3 className="font-medium text-white">{org.name}</h3>
                        {expandedOrg === org.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">{orgUsers[org.id]?.length || "?"} User</span>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteOrg(org.id, org.name); }}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg" title="Löschen">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {expandedOrg === org.id && (
                      <div className="border-t border-white/5 p-4">
                        <p className="text-sm text-gray-400 mb-4">
                          {[org.address, org.zip, org.city].filter(Boolean).join(", ") || "Keine Adresse"}
                        </p>
                        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2"><Users size={16} /> Benutzer</h4>

                        {!orgUsers[org.id] ? (
                          <Loader className="animate-spin text-gray-400" size={20} />
                        ) : orgUsers[org.id].length === 0 ? (
                          <p className="text-sm text-gray-500">Keine Benutzer</p>
                        ) : (
                          <div className="space-y-2">
                            {orgUsers[org.id].map(user => (
                              <div key={user.id} className="flex items-center justify-between p-3 bg-[#1a1a2e] rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full ${user.active ? 'bg-green-500' : 'bg-red-500'}`} />
                                  <div>
                                    <div className="text-white text-sm">{user.first_name} {user.last_name}</div>
                                    <div className="text-gray-500 text-xs">{user.email}</div>
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded ${getRoleStyle(user.role)}`}>{getRoleLabel(user.role)}</span>
                                  {user.must_change_password && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">PW ändern</span>}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => toggleUserActive(user.id, org.id)} className={`p-1.5 rounded hover:bg-white/10 ${user.active ? 'text-green-400' : 'text-red-400'}`}>
                                    {user.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                  </button>
                                  <button onClick={() => resetPassword(user.id, user.email)} className="p-1.5 text-yellow-400 rounded hover:bg-white/10"><Key size={18} /></button>
                                  <button onClick={() => deleteUser(user.id, user.email, org.id)} className="p-1.5 text-red-400 rounded hover:bg-white/10"><Trash2 size={18} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB: BENUTZER */}
      {activeTab === "users" && (
        <>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <UserPlus size={20} className="text-green-400" />
              Neuen Benutzer erstellen
            </h2>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Organisation *</label>
                  <select value={newUser.orgId} onChange={(e) => setNewUser(prev => ({ ...prev, orgId: e.target.value }))}
                    className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white" required>
                    <option value="">-- Auswählen --</option>
                    {orgs.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Rolle *</label>
                  <select value={newUser.role} onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white">
                    {roles.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">E-Mail *</label>
                  <input type="email" value={newUser.email} onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="user@firma.de" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Vorname *</label>
                  <input type="text" value={newUser.firstName} onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="Max" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nachname *</label>
                  <input type="text" value={newUser.lastName} onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="Mustermann" required />
                </div>
                <div className="flex items-end">
                  <button type="submit" disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50">
                    {saving ? <Loader size={18} className="animate-spin" /> : <UserPlus size={18} />}
                    Erstellen
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users size={20} className="text-indigo-400" />
                Alle Benutzer ({allUsers.length})
              </h2>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Suchen..." className="pl-10 pr-4 py-2 bg-[#0d0d1a] border border-white/10 rounded-lg text-white text-sm w-64" />
              </div>
            </div>

            {allUsers.length === 0 ? (
              <p className="text-gray-400">Keine Benutzer vorhanden</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm border-b border-white/10">
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Name</th>
                      <th className="pb-3 font-medium">E-Mail</th>
                      <th className="pb-3 font-medium">Organisation</th>
                      <th className="pb-3 font-medium">Rolle</th>
                      <th className="pb-3 font-medium text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3"><div className={`w-2.5 h-2.5 rounded-full ${user.active ? 'bg-green-500' : 'bg-red-500'}`} /></td>
                        <td className="py-3 text-white">
                          {user.first_name} {user.last_name}
                          {user.must_change_password && <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">PW</span>}
                        </td>
                        <td className="py-3 text-gray-400">{user.email}</td>
                        <td className="py-3 text-gray-400">{user.org_name || "-"}</td>
                        <td className="py-3"><span className={`text-xs px-2 py-0.5 rounded ${getRoleStyle(user.role)}`}>{getRoleLabel(user.role)}</span></td>
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => toggleUserActive(user.id)} className={`p-1.5 rounded hover:bg-white/10 ${user.active ? 'text-green-400' : 'text-red-400'}`}>
                              {user.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                            </button>
                            <button onClick={() => resetPassword(user.id, user.email)} className="p-1.5 text-yellow-400 rounded hover:bg-white/10"><Key size={16} /></button>
                            <button onClick={() => deleteUser(user.id, user.email)} className="p-1.5 text-red-400 rounded hover:bg-white/10"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}