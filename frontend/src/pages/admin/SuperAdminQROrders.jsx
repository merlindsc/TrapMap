/* ============================================================
   TRAPMAP – SUPER-ADMIN QR-CODE BESTELLSYSTEM
   Ein-Klick QR-Code Versand an Organisationen
   ============================================================ */

import React, { useState, useEffect } from "react";
import {
  QrCode, Send, Package, Mail, Download, RefreshCw,
  CheckCircle, AlertCircle, Building2, Hash, Euro,
  ChevronDown, ChevronUp, Clock, FileText, Loader,
  Plus, Settings, TrendingUp, Users
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function SuperAdminQROrders() {
  const token = localStorage.getItem("trapmap_token");
  const headers = { Authorization: `Bearer ${token}` };

  // Data State
  const [organisations, setOrganisations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Order Form State
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [quantity, setQuantity] = useState(100);
  const [customEmail, setCustomEmail] = useState("");
  const [pricing, setPricing] = useState(null);

  // UI State
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedOrg, setExpandedOrg] = useState(null);
  const [showOrderForm, setShowOrderForm] = useState(false);

  // ============================================
  // LOAD DATA
  // ============================================
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Organisationen mit Stats laden
      const statsRes = await fetch(`${API}/qr-orders/stats`, { headers });
      if (statsRes.ok) {
        const data = await statsRes.json();
        console.log("📊 Loaded organisations:", data);
        setOrganisations(data);
      }

      // Letzte Bestellungen laden
      const ordersRes = await fetch(`${API}/qr-orders/orders?limit=20`, { headers });
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PREIS BERECHNEN
  // ============================================
  useEffect(() => {
    if (quantity >= 1) {
      calculatePrice();
    }
  }, [quantity]);

  const calculatePrice = async () => {
    try {
      const res = await fetch(`${API}/qr-orders/price?quantity=${quantity}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPricing(data);
      }
    } catch (err) {
      console.error("Price calc error:", err);
    }
  };

  // ============================================
  // ⭐ EIN-KLICK BESTELLUNG
  // ============================================
  const handleOneClickOrder = async () => {
    if (!selectedOrg) {
      setError("Bitte Organisation auswählen");
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API}/qr-orders/process`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationId: selectedOrg.id,
          quantity: quantity,
          email: customEmail || selectedOrg.contact_email
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Bestellung fehlgeschlagen");
      }

      setResult(data);
      setShowOrderForm(false);
      loadData(); // Refresh

    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // ============================================
  // SCHNELL-BESTELLUNG (direkt aus Liste)
  // ============================================
  const handleQuickOrder = async (org, qty) => {
    // E-Mail prüfen
    const email = org.contact_email || org.email;
    if (!email) {
      setError(`${org.name} hat keine E-Mail-Adresse hinterlegt. Bitte "Individuell" verwenden.`);
      return;
    }

    if (!confirm(`${qty} QR-Codes an ${org.name} (${email}) senden?`)) return;

    setProcessing(true);
    setError(null);

    try {
      const res = await fetch(`${API}/qr-orders/process`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationId: org.id,
          quantity: qty,
          email: email
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Bestellung fehlgeschlagen");
      }

      setResult(data);
      loadData();

    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader size={40} style={styles.spinner} />
        <p>Lade Daten...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <QrCode size={32} />
            QR-Code Bestellsystem
          </h1>
          <p style={styles.subtitle}>
            Ein-Klick Versand an Organisationen
          </p>
        </div>

        <button style={styles.refreshButton} onClick={loadData}>
          <RefreshCw size={18} />
          Aktualisieren
        </button>
      </div>

      {/* ERFOLGS-MELDUNG */}
      {result && (
        <div style={styles.successBanner}>
          <CheckCircle size={24} />
          <div>
            <strong>Bestellung erfolgreich versendet!</strong>
            <p>
              {result.generatedCodes} Codes ({result.order?.codes || result.codes}) wurden an {result.email} gesendet.
              <br />
              Gesamtpreis: {(result.order?.price || 0).toFixed(2)} €
            </p>
          </div>
          <button onClick={() => setResult(null)} style={styles.closeButton}>×</button>
        </div>
      )}

      {/* FEHLER-MELDUNG */}
      {error && (
        <div style={styles.errorBanner}>
          <AlertCircle size={24} />
          <span>{error}</span>
          <button onClick={() => setError(null)} style={styles.closeButton}>×</button>
        </div>
      )}

      {/* STATISTIK CARDS */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <Building2 size={24} style={{ color: "#6366f1" }} />
          <div>
            <span style={styles.statValue}>{organisations.length}</span>
            <span style={styles.statLabel}>Organisationen</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <QrCode size={24} style={{ color: "#10b981" }} />
          <div>
            <span style={styles.statValue}>
              {organisations.reduce((sum, o) => sum + (o.qr_codes_ordered || 0), 0)}
            </span>
            <span style={styles.statLabel}>Codes generiert</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <Package size={24} style={{ color: "#f59e0b" }} />
          <div>
            <span style={styles.statValue}>
              {organisations.reduce((sum, o) => sum + (o.usedCodes || 0), 0)}
            </span>
            <span style={styles.statLabel}>Codes verwendet</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <FileText size={24} style={{ color: "#8b5cf6" }} />
          <div>
            <span style={styles.statValue}>{orders.length}</span>
            <span style={styles.statLabel}>Bestellungen</span>
          </div>
        </div>
      </div>

      {/* NEUE BESTELLUNG BUTTON */}
      <button 
        style={styles.newOrderButton}
        onClick={() => setShowOrderForm(!showOrderForm)}
      >
        <Plus size={20} />
        Neue Bestellung erstellen
        {showOrderForm ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {/* BESTELLFORMULAR */}
      {showOrderForm && (
        <div style={styles.orderForm}>
          <h3>📦 Neue QR-Code Bestellung</h3>

          {/* Organisation auswählen */}
          <div style={styles.formGroup}>
            <label>Organisation *</label>
            <select
              value={selectedOrg?.id || ""}
              onChange={(e) => {
                const org = organisations.find(o => String(o.id) === e.target.value);
                setSelectedOrg(org);
                setCustomEmail(org?.contact_email || org?.email || "");
              }}
              style={styles.select}
            >
              <option value="">Bitte auswählen...</option>
              {organisations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.qr_prefix || "Kein Präfix"})
                </option>
              ))}
            </select>
          </div>

          {/* Gewählte Organisation Info */}
          {selectedOrg && (
            <div style={styles.orgInfo}>
              <div>
                <strong>{selectedOrg.name}</strong>
                <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
                  <span>Präfix: {selectedOrg.qr_prefix || "Wird generiert"}</span>
                  <span style={{ marginLeft: 16 }}>Nächste Nr: {selectedOrg.qr_next_number || 1}</span>
                  <span style={{ marginLeft: 16 }}>Bereits bestellt: {selectedOrg.qr_codes_ordered || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Anzahl */}
          <div style={styles.formGroup}>
            <label>Anzahl QR-Codes</label>
            <div style={styles.quantityButtons}>
              <button
                style={{
                  ...styles.quantityBtn,
                  background: quantity === 50 ? "#6366f1" : "#374151"
                }}
                onClick={() => setQuantity(50)}
              >
                50
              </button>
              <button
                style={{
                  ...styles.quantityBtn,
                  background: quantity === 100 ? "#6366f1" : "#374151"
                }}
                onClick={() => setQuantity(100)}
              >
                100
              </button>
              <button
                style={{
                  ...styles.quantityBtn,
                  background: quantity === 250 ? "#6366f1" : "#374151"
                }}
                onClick={() => setQuantity(250)}
              >
                250
              </button>
              <button
                style={{
                  ...styles.quantityBtn,
                  background: quantity === 500 ? "#6366f1" : "#374151"
                }}
                onClick={() => setQuantity(500)}
              >
                500
              </button>
            </div>
            <input
              type="number"
              min="1"
              max="10000"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              style={styles.input}
            />
          </div>

          {/* E-Mail */}
          <div style={styles.formGroup}>
            <label>E-Mail-Adresse für Versand</label>
            <input
              type="email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="E-Mail Adresse eingeben..."
              style={styles.input}
            />
          </div>

          {/* Preisberechnung */}
          {pricing && (
            <div style={styles.pricingCard}>
              <div style={styles.pricingRow}>
                <span>Stückpreis:</span>
                <span>{pricing.unitPrice?.toFixed(2) || "0.00"} €</span>
              </div>
              {pricing.discount > 0 && (
                <span style={styles.discountBadge}>
                  {pricing.discount}% Mengenrabatt
                </span>
              )}
              <div style={styles.pricingTotal}>
                <span>Gesamt:</span>
                <span>{pricing.totalPrice?.toFixed(2) || "0.00"} €</span>
              </div>
            </div>
          )}

          {/* Code-Vorschau */}
          {selectedOrg && (
            <div style={styles.codePreview}>
              <span>Code-Vorschau:</span>
              <code style={{ color: "#10b981" }}>
                {selectedOrg.qr_prefix || "TM"}-{String(selectedOrg.qr_next_number || 1).padStart(4, '0')} bis{' '}
                {selectedOrg.qr_prefix || "TM"}-{String((selectedOrg.qr_next_number || 1) + quantity - 1).padStart(4, '0')}
              </code>
            </div>
          )}

          {/* Absenden Button */}
          <button
            style={{
              ...styles.submitButton,
              opacity: processing || !selectedOrg ? 0.5 : 1
            }}
            onClick={handleOneClickOrder}
            disabled={processing || !selectedOrg}
          >
            {processing ? (
              <>
                <Loader size={20} style={styles.spinner} />
                Wird verarbeitet...
              </>
            ) : (
              <>
                <Send size={20} />
                Erstellen & per E-Mail versenden
              </>
            )}
          </button>
        </div>
      )}

      {/* ORGANISATIONEN LISTE */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <Building2 size={24} />
          Organisationen
        </h2>

        <div style={styles.orgList}>
          {organisations.map(org => (
            <div key={org.id} style={styles.orgCard}>
              <div style={styles.orgHeader}>
                <div style={styles.orgMain}>
                  <strong>{org.name}</strong>
                  <div style={styles.orgMeta}>
                    <span><Hash size={14} /> {org.qr_prefix || "—"}</span>
                    <span><Mail size={14} /> {org.contact_email || org.email || "Keine E-Mail"}</span>
                  </div>
                </div>

                <div style={styles.orgStats}>
                  <div style={styles.orgStat}>
                    <span style={styles.orgStatValue}>{org.qr_codes_ordered || 0}</span>
                    <span style={styles.orgStatLabel}>Bestellt</span>
                  </div>
                  <div style={styles.orgStat}>
                    <span style={styles.orgStatValue}>{org.usedCodes || 0}</span>
                    <span style={styles.orgStatLabel}>Verwendet</span>
                  </div>
                  <div style={styles.orgStat}>
                    <span style={{
                      ...styles.orgStatValue,
                      color: org.availableCodes > 20 ? "#10b981" : org.availableCodes > 0 ? "#f59e0b" : "#ef4444"
                    }}>
                      {org.availableCodes || 0}
                    </span>
                    <span style={styles.orgStatLabel}>Verfügbar</span>
                  </div>
                </div>
              </div>

              {/* Schnell-Buttons - IMMER aktiv, Fehler wird beim Klick gezeigt */}
              <div style={styles.quickButtons}>
                <button
                  style={{
                    ...styles.quickBtn,
                    opacity: processing ? 0.5 : 1
                  }}
                  onClick={() => handleQuickOrder(org, 50)}
                  disabled={processing}
                >
                  +50
                </button>
                <button
                  style={{
                    ...styles.quickBtn,
                    opacity: processing ? 0.5 : 1
                  }}
                  onClick={() => handleQuickOrder(org, 100)}
                  disabled={processing}
                >
                  +100
                </button>
                <button
                  style={{
                    ...styles.quickBtn,
                    opacity: processing ? 0.5 : 1
                  }}
                  onClick={() => handleQuickOrder(org, 250)}
                  disabled={processing}
                >
                  +250
                </button>
                <button
                  style={{...styles.quickBtn, background: "#6366f1"}}
                  onClick={() => {
                    setSelectedOrg(org);
                    setCustomEmail(org.contact_email || org.email || "");
                    setShowOrderForm(true);
                  }}
                >
                  Individuell
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LETZTE BESTELLUNGEN */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <Clock size={24} />
          Letzte Bestellungen
        </h2>

        {orders.length === 0 ? (
          <p style={styles.emptyText}>Noch keine Bestellungen vorhanden</p>
        ) : (
          <div style={styles.ordersList}>
            {orders.map(order => (
              <div key={order.id} style={styles.orderRow}>
                <div style={styles.orderInfo}>
                  <strong>{order.organisations?.name || "Unbekannt"}</strong>
                  <div style={styles.orderMeta}>
                    <span>{order.quantity} Codes</span>
                    <span>•</span>
                    <span>{order.codes}</span>
                    <span>•</span>
                    <span>{new Date(order.created_at).toLocaleDateString("de-DE")}</span>
                  </div>
                </div>

                <span style={{
                  ...styles.statusBadge,
                  background: order.status === "sent" ? "#14532d" : 
                             order.status === "generated" ? "#1e3a5f" : "#374151",
                  color: order.status === "sent" ? "#86efac" : 
                         order.status === "generated" ? "#93c5fd" : "#9ca3af"
                }}>
                  {order.status === "sent" ? "✓ Versendet" : 
                   order.status === "generated" ? "Generiert" : order.status}
                </span>

                {order.sent_to_email && (
                  <span style={styles.orderEmail}>
                    <Mail size={12} />
                    {order.sent_to_email}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// STYLES
// ============================================
const styles = {
  container: {
    padding: "24px",
    maxWidth: "1200px",
    margin: "0 auto"
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "400px",
    color: "#9ca3af"
  },
  spinner: {
    animation: "spin 1s linear infinite"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px"
  },
  title: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "28px",
    fontWeight: "bold",
    margin: 0
  },
  subtitle: {
    color: "#9ca3af",
    marginTop: "8px"
  },
  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    background: "#374151",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer"
  },
  successBanner: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 20px",
    background: "#14532d",
    borderRadius: "12px",
    marginBottom: "24px",
    color: "#86efac"
  },
  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 20px",
    background: "#7f1d1d",
    borderRadius: "12px",
    marginBottom: "24px",
    color: "#fca5a5"
  },
  closeButton: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    color: "inherit",
    fontSize: "24px",
    cursor: "pointer"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "24px"
  },
  statCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "20px",
    background: "#1f2937",
    borderRadius: "12px"
  },
  statValue: {
    display: "block",
    fontSize: "28px",
    fontWeight: "bold"
  },
  statLabel: {
    display: "block",
    fontSize: "13px",
    color: "#9ca3af"
  },
  newOrderButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "16px",
    background: "#6366f1",
    border: "none",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    marginBottom: "16px"
  },
  orderForm: {
    background: "#1f2937",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px"
  },
  formGroup: {
    marginBottom: "20px"
  },
  select: {
    width: "100%",
    padding: "12px 16px",
    background: "#111827",
    border: "1px solid #374151",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "16px",
    marginTop: "8px"
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    background: "#111827",
    border: "1px solid #374151",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "16px",
    marginTop: "8px",
    boxSizing: "border-box"
  },
  orgInfo: {
    padding: "16px",
    background: "#111827",
    borderRadius: "8px",
    marginBottom: "16px"
  },
  quantityButtons: {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
    marginBottom: "8px"
  },
  quantityBtn: {
    flex: 1,
    padding: "10px",
    background: "#374151",
    border: "1px solid #374151",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600"
  },
  pricingCard: {
    background: "#111827",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "16px"
  },
  pricingRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #374151"
  },
  discountBadge: {
    display: "inline-block",
    padding: "4px 12px",
    background: "#14532d",
    color: "#86efac",
    borderRadius: "20px",
    fontSize: "13px",
    margin: "8px 0"
  },
  pricingTotal: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 0 0",
    fontWeight: "bold",
    fontSize: "18px"
  },
  codePreview: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "16px",
    background: "#111827",
    borderRadius: "8px",
    marginBottom: "16px",
    fontFamily: "monospace"
  },
  submitButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    padding: "16px",
    background: "#10b981",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer"
  },
  section: {
    marginTop: "32px"
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "20px",
    fontWeight: "600",
    marginBottom: "16px"
  },
  orgList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  orgCard: {
    background: "#1f2937",
    borderRadius: "12px",
    padding: "16px"
  },
  orgHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px"
  },
  orgMain: {
    flex: 1
  },
  orgMeta: {
    display: "flex",
    gap: "16px",
    marginTop: "8px",
    fontSize: "13px",
    color: "#9ca3af"
  },
  orgStats: {
    display: "flex",
    gap: "20px"
  },
  orgStat: {
    textAlign: "center"
  },
  orgStatValue: {
    display: "block",
    fontSize: "20px",
    fontWeight: "bold"
  },
  orgStatLabel: {
    display: "block",
    fontSize: "11px",
    color: "#6b7280"
  },
  quickButtons: {
    display: "flex",
    gap: "8px"
  },
  quickBtn: {
    padding: "8px 16px",
    background: "#374151",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600"
  },
  emptyText: {
    color: "#6b7280",
    textAlign: "center",
    padding: "40px"
  },
  ordersList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  orderRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "14px 16px",
    background: "#1f2937",
    borderRadius: "8px"
  },
  orderInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  orderMeta: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "13px",
    color: "#9ca3af"
  },
  statusBadge: {
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px"
  },
  orderEmail: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#6b7280",
    width: "100%"
  }
};