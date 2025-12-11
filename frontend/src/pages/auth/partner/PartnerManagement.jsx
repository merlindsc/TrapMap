/* ============================================================
   TRAPMAP – PARTNER VERWALTUNG
   Für Admins: Partner erstellen und verwalten
   ============================================================ */

import React, { useState, useEffect } from "react";
import {
  Users, Plus, Edit2, Trash2, Building2, Mail, Phone,
  Check, X, Loader, AlertCircle, ChevronDown, Eye, EyeOff,
  RefreshCw, Search
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function PartnerManagement() {
  const token = localStorage.getItem("trapmap_token");
  const headers = { Authorization: `Bearer ${token}` };

  // State
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState([]);
  const [objects, setObjects] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Dialog State
  const [showDialog, setShowDialog] = useState(false);
  const [editPartner, setEditPartner] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    company: "",
    phone: "",
    objectIds: []
  });
  const [showPassword, setShowPassword] = useState(false);

  // ============================================
  // DATEN LADEN
  // ============================================
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Partner laden
      const partnerRes = await fetch(`${API}/partners`, { headers });
      if (partnerRes.ok) {
        const data = await partnerRes.json();
        setPartners(Array.isArray(data) ? data : []);
      }

      // Objekte laden
      const objectRes = await fetch(`${API}/objects`, { headers });
      if (objectRes.ok) {
        const data = await objectRes.json();
        setObjects(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // DIALOG ÖFFNEN
  // ============================================
  const openCreateDialog = () => {
    setEditPartner(null);
    setForm({
      email: "",
      password: "",
      name: "",
      company: "",
      phone: "",
      objectIds: []
    });
    setShowDialog(true);
  };

  const openEditDialog = (partner) => {
    setEditPartner(partner);
    setForm({
      email: partner.email,
      password: "", // Leer lassen für Update
      name: partner.name,
      company: partner.company || "",
      phone: partner.phone || "",
      objectIds: partner.objects?.map(o => o.id) || []
    });
    setShowDialog(true);
  };

  // ============================================
  // SPEICHERN
  // ============================================
  const handleSave = async () => {
    if (!form.email || !form.name) {
      setError("E-Mail und Name sind erforderlich");
      return;
    }

    if (!editPartner && !form.password) {
      setError("Passwort ist für neue Partner erforderlich");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = editPartner 
        ? `${API}/partners/${editPartner.id}`
        : `${API}/partners`;
      
      const method = editPartner ? "PUT" : "POST";

      const body = {
        name: form.name,
        company: form.company,
        phone: form.phone,
        objectIds: form.objectIds
      };

      // Nur bei neuen Partnern oder wenn Passwort gesetzt
      if (!editPartner) {
        body.email = form.email;
        body.password = form.password;
      } else if (form.password) {
        body.password = form.password;
      }

      const res = await fetch(url, {
        method,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Speichern fehlgeschlagen");
      }

      setSuccess(editPartner ? "Partner aktualisiert" : "Partner erstellt");
      setShowDialog(false);
      loadData();

      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // LÖSCHEN
  // ============================================
  const handleDelete = async (partner) => {
    if (!confirm(`Partner "${partner.name}" wirklich löschen?`)) return;

    try {
      const res = await fetch(`${API}/partners/${partner.id}`, {
        method: "DELETE",
        headers
      });

      if (!res.ok) throw new Error("Löschen fehlgeschlagen");

      setSuccess("Partner gelöscht");
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // ============================================
  // OBJEKT TOGGLE
  // ============================================
  const toggleObject = (objectId) => {
    setForm(f => ({
      ...f,
      objectIds: f.objectIds.includes(objectId)
        ? f.objectIds.filter(id => id !== objectId)
        : [...f.objectIds, objectId]
    }));
  };

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader size={32} style={styles.spinner} />
        <p>Lade Partner...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            <Users size={24} />
            Partner-Verwaltung
          </h2>
          <p style={styles.subtitle}>
            Externe Kunden können hier Zugang zu ihren Objekten erhalten
          </p>
        </div>
        <button style={styles.addButton} onClick={openCreateDialog}>
          <Plus size={18} />
          Neuer Partner
        </button>
      </div>

      {/* SUCCESS */}
      {success && (
        <div style={styles.successBox}>
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div style={styles.errorBox}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)} style={styles.closeError}>×</button>
        </div>
      )}

      {/* PARTNER LISTE */}
      {partners.length === 0 ? (
        <div style={styles.emptyState}>
          <Users size={48} color="#6b7280" />
          <h3>Noch keine Partner</h3>
          <p>Erstellen Sie Partner-Zugänge für Ihre Kunden</p>
          <button style={styles.addButton} onClick={openCreateDialog}>
            <Plus size={18} />
            Ersten Partner erstellen
          </button>
        </div>
      ) : (
        <div style={styles.partnerList}>
          {partners.map(partner => (
            <div key={partner.id} style={styles.partnerCard}>
              <div style={styles.partnerHeader}>
                <div style={styles.partnerMain}>
                  <strong style={styles.partnerName}>{partner.name}</strong>
                  {partner.company && (
                    <span style={styles.partnerCompany}>
                      <Building2 size={14} />
                      {partner.company}
                    </span>
                  )}
                </div>
                <div style={styles.partnerActions}>
                  <button 
                    style={styles.iconButton}
                    onClick={() => openEditDialog(partner)}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    style={{...styles.iconButton, color: "#ef4444"}}
                    onClick={() => handleDelete(partner)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div style={styles.partnerMeta}>
                <span><Mail size={14} /> {partner.email}</span>
                {partner.phone && <span><Phone size={14} /> {partner.phone}</span>}
              </div>

              <div style={styles.partnerObjects}>
                <span style={styles.objectsLabel}>Zugewiesene Objekte:</span>
                {partner.objects?.length > 0 ? (
                  <div style={styles.objectTags}>
                    {partner.objects.map(obj => (
                      <span key={obj.id} style={styles.objectTag}>
                        {obj.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={styles.noObjects}>Keine Objekte zugewiesen</span>
                )}
              </div>

              <div style={styles.partnerFooter}>
                <span style={{
                  ...styles.statusBadge,
                  background: partner.is_active ? "#14532d" : "#7f1d1d"
                }}>
                  {partner.is_active ? "Aktiv" : "Inaktiv"}
                </span>
                {partner.last_login && (
                  <span style={styles.lastLogin}>
                    Letzter Login: {new Date(partner.last_login).toLocaleDateString("de-DE")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DIALOG */}
      {showDialog && (
        <div style={styles.overlay} onClick={() => setShowDialog(false)}>
          <div style={styles.dialog} onClick={e => e.stopPropagation()}>
            <h3 style={styles.dialogTitle}>
              {editPartner ? "Partner bearbeiten" : "Neuen Partner erstellen"}
            </h3>

            {/* Form */}
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label>Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Max Mustermann"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Firma</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={e => setForm({...form, company: e.target.value})}
                  placeholder="BMW AG"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>E-Mail *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="max@firma.de"
                  style={styles.input}
                  disabled={!!editPartner}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Telefon</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                  placeholder="+49 123 456789"
                  style={styles.input}
                />
              </div>

              <div style={{...styles.formGroup, gridColumn: "1 / -1"}}>
                <label>
                  {editPartner ? "Neues Passwort (leer lassen für unverändert)" : "Passwort *"}
                </label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    placeholder="••••••••"
                    style={{...styles.input, paddingRight: "40px"}}
                  />
                  <button
                    type="button"
                    style={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Objekte auswählen */}
            <div style={styles.objectsSection}>
              <label>Objekte zuweisen</label>
              <p style={styles.hint}>
                Der Partner kann nur die ausgewählten Objekte sehen und dort Kontrollen durchführen.
              </p>
              <div style={styles.objectCheckboxes}>
                {objects.map(obj => (
                  <label key={obj.id} style={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={form.objectIds.includes(obj.id)}
                      onChange={() => toggleObject(obj.id)}
                    />
                    <span>{obj.name}</span>
                    <span style={styles.objectCity}>{obj.city}</span>
                  </label>
                ))}
                {objects.length === 0 && (
                  <p style={styles.noObjectsHint}>Keine Objekte vorhanden</p>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div style={styles.dialogActions}>
              <button 
                style={styles.cancelButton}
                onClick={() => setShowDialog(false)}
              >
                Abbrechen
              </button>
              <button
                style={styles.saveButton}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader size={18} style={styles.spinner} />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    {editPartner ? "Speichern" : "Partner erstellen"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// STYLES
// ============================================
const styles = {
  container: {
    padding: "24px",
    color: "#fff"
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px",
    color: "#9ca3af"
  },
  spinner: {
    animation: "spin 1s linear infinite"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "16px"
  },
  title: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "22px",
    fontWeight: "bold",
    margin: 0
  },
  subtitle: {
    color: "#9ca3af",
    marginTop: "4px",
    fontSize: "14px"
  },
  addButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 18px",
    background: "#6366f1",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer"
  },
  successBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    background: "#14532d",
    borderRadius: "8px",
    marginBottom: "16px",
    color: "#86efac"
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    background: "#7f1d1d",
    borderRadius: "8px",
    marginBottom: "16px",
    color: "#fca5a5"
  },
  closeError: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    color: "#fca5a5",
    fontSize: "20px",
    cursor: "pointer"
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "60px 20px",
    background: "#1f2937",
    borderRadius: "12px",
    textAlign: "center"
  },
  partnerList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  partnerCard: {
    background: "#1f2937",
    borderRadius: "12px",
    padding: "16px"
  },
  partnerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px"
  },
  partnerMain: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  partnerName: {
    fontSize: "16px"
  },
  partnerCompany: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#9ca3af"
  },
  partnerActions: {
    display: "flex",
    gap: "4px"
  },
  iconButton: {
    padding: "8px",
    background: "#374151",
    border: "none",
    borderRadius: "6px",
    color: "#9ca3af",
    cursor: "pointer"
  },
  partnerMeta: {
    display: "flex",
    gap: "16px",
    fontSize: "13px",
    color: "#9ca3af",
    marginBottom: "12px"
  },
  partnerObjects: {
    marginBottom: "12px"
  },
  objectsLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "6px",
    display: "block"
  },
  objectTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px"
  },
  objectTag: {
    padding: "4px 10px",
    background: "#374151",
    borderRadius: "4px",
    fontSize: "12px"
  },
  noObjects: {
    fontSize: "12px",
    color: "#6b7280",
    fontStyle: "italic"
  },
  partnerFooter: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    paddingTop: "12px",
    borderTop: "1px solid #374151"
  },
  statusBadge: {
    padding: "4px 10px",
    borderRadius: "4px",
    fontSize: "12px"
  },
  lastLogin: {
    fontSize: "12px",
    color: "#6b7280"
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000
  },
  dialog: {
    background: "#1f2937",
    borderRadius: "12px",
    padding: "24px",
    maxWidth: "500px",
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto"
  },
  dialogTitle: {
    fontSize: "18px",
    fontWeight: "600",
    marginBottom: "20px"
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px"
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  input: {
    padding: "10px 12px",
    background: "#111827",
    border: "1px solid #374151",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "14px"
  },
  passwordWrapper: {
    position: "relative"
  },
  passwordToggle: {
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "#6b7280",
    cursor: "pointer"
  },
  objectsSection: {
    marginTop: "20px"
  },
  hint: {
    fontSize: "12px",
    color: "#6b7280",
    marginTop: "4px",
    marginBottom: "10px"
  },
  objectCheckboxes: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "200px",
    overflowY: "auto",
    padding: "12px",
    background: "#111827",
    borderRadius: "8px"
  },
  checkbox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
    fontSize: "14px"
  },
  objectCity: {
    marginLeft: "auto",
    fontSize: "12px",
    color: "#6b7280"
  },
  noObjectsHint: {
    color: "#6b7280",
    fontSize: "13px",
    textAlign: "center",
    padding: "20px"
  },
  dialogActions: {
    display: "flex",
    gap: "12px",
    marginTop: "24px"
  },
  cancelButton: {
    flex: 1,
    padding: "12px",
    background: "#374151",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "14px",
    cursor: "pointer"
  },
  saveButton: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px",
    background: "#10b981",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer"
  }
};