/* ============================================================
   TRAPMAP – QR-CODE GENERATOR PAGE
   Generiert QR-Codes mit URLs die auf TrapMap zeigen
   ============================================================ */

import React, { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  QrCode, Download, Printer, Plus, Trash2, Copy, Check,
  FileText, Settings, Info, ExternalLink
} from "lucide-react";

// Basis-URL für Scans
const SCAN_BASE_URL = "https://trap-map.de/s";

export default function QRCodeGenerator() {
  const [prefix, setPrefix] = useState("TM");
  const [startNumber, setStartNumber] = useState(1);
  const [count, setCount] = useState(10);
  const [generatedCodes, setGeneratedCodes] = useState([]);
  const [codeSize, setCodeSize] = useState(200);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(null);
  
  const printRef = useRef(null);

  // ============================================
  // CODES GENERIEREN
  // ============================================
  const generateCodes = () => {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const number = startNumber + i;
      const codeId = `${prefix}-${String(number).padStart(4, '0')}`;
      const url = `${SCAN_BASE_URL}/${codeId}`;
      
      codes.push({
        id: codeId,
        url: url,
        number: number
      });
    }
    setGeneratedCodes(codes);
  };

  // ============================================
  // EINZELNEN CODE KOPIEREN
  // ============================================
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // ============================================
  // ALLE URLS KOPIEREN
  // ============================================
  const copyAllUrls = () => {
    const urls = generatedCodes.map(c => c.url).join('\n');
    navigator.clipboard.writeText(urls);
    setCopied('all');
    setTimeout(() => setCopied(null), 2000);
  };

  // ============================================
  // DRUCKEN
  // ============================================
  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open('', '', 'width=800,height=600');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>TrapMap QR-Codes</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
            }
            .code-item {
              text-align: center;
              padding: 10px;
              border: 1px dashed #ccc;
              break-inside: avoid;
            }
            .code-item svg {
              max-width: 100%;
            }
            .code-label {
              margin-top: 8px;
              font-weight: bold;
              font-size: 12px;
            }
            @media print {
              .grid {
                grid-template-columns: repeat(4, 1fr);
              }
            }
          </style>
        </head>
        <body>
          <h2>TrapMap QR-Codes</h2>
          <p>Generiert: ${new Date().toLocaleDateString('de-DE')}</p>
          <div class="grid">
            ${generatedCodes.map(code => `
              <div class="code-item">
                ${document.getElementById(`qr-${code.id}`).outerHTML}
                <div class="code-label">${code.id}</div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // ============================================
  // CSV EXPORT
  // ============================================
  const exportCSV = () => {
    const csv = [
      'Code,URL',
      ...generatedCodes.map(c => `${c.id},${c.url}`)
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trapmap-codes-${prefix}-${startNumber}-${startNumber + count - 1}.csv`;
    a.click();
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          <QrCode size={28} />
          QR-Code Generator
        </h1>
        <p style={styles.subtitle}>
          Erstelle QR-Codes für deine Monitoring-Boxen
        </p>
      </div>

      {/* Info Box */}
      <div style={styles.infoBox}>
        <Info size={20} />
        <div>
          <strong>So funktioniert's:</strong>
          <p>Jeder QR-Code enthält eine URL wie <code>https://trap-map.de/s/TM-0001</code></p>
          <p>Beim Scannen öffnet sich TrapMap und erkennt automatisch die Box.</p>
        </div>
      </div>

      {/* Generator Form */}
      <div style={styles.formCard}>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label>Präfix</label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              maxLength={10}
              style={styles.input}
              placeholder="TM"
            />
            <small>z.B. TM, BOX, HAM</small>
          </div>

          <div style={styles.formGroup}>
            <label>Startnummer</label>
            <input
              type="number"
              value={startNumber}
              onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
              min={1}
              style={styles.input}
            />
            <small>Erste Nummer</small>
          </div>

          <div style={styles.formGroup}>
            <label>Anzahl</label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(Math.min(100, parseInt(e.target.value) || 1))}
              min={1}
              max={100}
              style={styles.input}
            />
            <small>Max. 100 auf einmal</small>
          </div>
        </div>

        {/* Vorschau */}
        <div style={styles.preview}>
          <span>Vorschau: </span>
          <code style={styles.previewCode}>
            {`${prefix}-${String(startNumber).padStart(4, '0')}`}
          </code>
          <span> bis </span>
          <code style={styles.previewCode}>
            {`${prefix}-${String(startNumber + count - 1).padStart(4, '0')}`}
          </code>
        </div>

        <button style={styles.generateButton} onClick={generateCodes}>
          <Plus size={20} />
          {generatedCodes.length > 0 ? 'Neu generieren' : 'Codes generieren'}
        </button>
      </div>

      {/* Generated Codes */}
      {generatedCodes.length > 0 && (
        <>
          {/* Actions */}
          <div style={styles.actions}>
            <button style={styles.actionButton} onClick={handlePrint}>
              <Printer size={18} />
              Drucken
            </button>
            <button style={styles.actionButton} onClick={exportCSV}>
              <FileText size={18} />
              CSV Export
            </button>
            <button style={styles.actionButton} onClick={copyAllUrls}>
              {copied === 'all' ? <Check size={18} /> : <Copy size={18} />}
              {copied === 'all' ? 'Kopiert!' : 'Alle URLs kopieren'}
            </button>
            <button 
              style={styles.actionButton} 
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings size={18} />
              Größe
            </button>
          </div>

          {/* Size Settings */}
          {showSettings && (
            <div style={styles.settingsBar}>
              <label>QR-Code Größe: {codeSize}px</label>
              <input
                type="range"
                min={100}
                max={400}
                value={codeSize}
                onChange={(e) => setCodeSize(parseInt(e.target.value))}
                style={styles.slider}
              />
            </div>
          )}

          {/* Codes Grid */}
          <div style={styles.codesGrid} ref={printRef}>
            {generatedCodes.map((code) => (
              <div key={code.id} style={styles.codeCard}>
                <div style={styles.qrWrapper}>
                  <QRCodeSVG
                    id={`qr-${code.id}`}
                    value={code.url}
                    size={codeSize}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                
                <div style={styles.codeInfo}>
                  <strong style={styles.codeId}>{code.id}</strong>
                  
                  <div style={styles.codeUrl}>
                    <code>{code.url}</code>
                    <button
                      style={styles.copyButton}
                      onClick={() => copyToClipboard(code.url, code.id)}
                      title="URL kopieren"
                    >
                      {copied === code.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <a
                  href={code.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.testLink}
                >
                  <ExternalLink size={14} />
                  Testen
                </a>
              </div>
            ))}
          </div>

          {/* Bestellhinweis */}
          <div style={styles.orderHint}>
            <h3>📦 Codes drucken lassen?</h3>
            <p>
              Exportiere die URLs als CSV und lade sie bei einem Etiketten-Anbieter hoch:
            </p>
            <ul>
              <li><strong>Labelident.com</strong> - Professionell, wetterfest (~6ct/Stück)</li>
              <li><strong>Vistaprint.de</strong> - Einfach online (~10ct/Stück)</li>
              <li><strong>Avery Zweckform</strong> - Selbst drucken mit Laser</li>
            </ul>
          </div>
        </>
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
    maxWidth: "1200px",
    margin: "0 auto",
    color: "#fff"
  },
  header: {
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
  infoBox: {
    display: "flex",
    gap: "16px",
    padding: "16px 20px",
    background: "#1e3a5f",
    borderRadius: "12px",
    marginBottom: "24px",
    color: "#93c5fd"
  },
  formCard: {
    background: "#1f2937",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "24px"
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "20px",
    marginBottom: "20px"
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  input: {
    padding: "12px 16px",
    background: "#111827",
    border: "1px solid #374151",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "16px"
  },
  preview: {
    padding: "12px 16px",
    background: "#111827",
    borderRadius: "8px",
    marginBottom: "20px",
    color: "#9ca3af"
  },
  previewCode: {
    color: "#10b981",
    fontWeight: "bold"
  },
  generateButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "14px",
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer"
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "20px"
  },
  actionButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    background: "#374151",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px"
  },
  settingsBar: {
    padding: "16px",
    background: "#1f2937",
    borderRadius: "12px",
    marginBottom: "20px"
  },
  slider: {
    width: "100%",
    marginTop: "8px"
  },
  codesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: "20px",
    marginBottom: "32px"
  },
  codeCard: {
    background: "#1f2937",
    borderRadius: "12px",
    padding: "16px",
    textAlign: "center"
  },
  qrWrapper: {
    background: "#fff",
    borderRadius: "8px",
    padding: "8px",
    display: "inline-block",
    marginBottom: "12px"
  },
  codeInfo: {
    marginBottom: "12px"
  },
  codeId: {
    fontSize: "18px",
    display: "block",
    marginBottom: "8px"
  },
  codeUrl: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "11px",
    color: "#6b7280",
    wordBreak: "break-all"
  },
  copyButton: {
    background: "none",
    border: "none",
    color: "#6b7280",
    cursor: "pointer",
    padding: "4px"
  },
  testLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    color: "#60a5fa",
    fontSize: "13px",
    textDecoration: "none"
  },
  orderHint: {
    background: "#1f2937",
    borderRadius: "12px",
    padding: "20px",
    marginTop: "32px"
  }
};