/* ============================================================
   TRAPMAP - UPDATES WIDGET
   Zeigt aktuelle Updates und Neuigkeiten für alle Benutzer
   ============================================================ */

import React, { useState, useEffect } from "react";
import { 
  Bell, X, ChevronRight, Sparkles, Zap, 
  Gift, CheckCircle, AlertCircle, Info 
} from "lucide-react";
import "./UpdatesWidget.css";

const UPDATES = [
  {
    id: "offline-functionality-2024-12-18",
    type: "feature",
    title: "📴 Vollständige Offline-Funktionalität",
    description: "TrapMap funktioniert jetzt komplett offline! Boxen einrichten, Kontrollen durchführen und scannen - alles ohne Internetverbindung. Daten werden automatisch synchronisiert, sobald Sie wieder online sind.",
    date: "2024-12-18",
    version: "v4.0.0",
    priority: "high",
    read: false
  },
  {
    id: "demo-automation-2024-12-16",
    type: "feature",
    title: "🎉 Automatische Demo-Accounts",
    description: "Demo-Accounts werden jetzt sofort erstellt - keine Wartezeit mehr! 20 QR-Codes und Boxen inklusive.",
    date: "2024-12-16",
    version: "v3.1.0",
    priority: "high",
    read: false
  },
  {
    id: "logo-improvements-2024-12-16",
    type: "improvement", 
    title: "✨ Schärferes Logo & Design",
    description: "Das TrapMap Logo wurde optimiert und die Landing Page erhielt ein modernes Glasmorphism-Design.",
    date: "2024-12-16",
    version: "v3.0.9",
    priority: "medium",
    read: false
  },
  {
    id: "qr-prefix-optimization-2024-12-16",
    type: "improvement",
    title: "🏷️ Kürzere QR-Präfixe", 
    description: "QR-Code Präfixe sind jetzt nur noch 3 Zeichen lang für bessere Lesbarkeit.",
    date: "2024-12-16", 
    version: "v3.0.8",
    priority: "low",
    read: false
  },
  {
    id: "email-system-2024-12-16",
    type: "feature",
    title: "📧 Automatische E-Mails",
    description: "Neue Benutzer erhalten automatisch professionelle E-Mails mit Login-Daten und Anleitungen.",
    date: "2024-12-16",
    version: "v3.0.7", 
    priority: "medium",
    read: false
  },
  {
    id: "password-security-2024-12-16",
    type: "security",
    title: "🔒 Passwort-Sicherheit",
    description: "Demo-Benutzer müssen beim ersten Login ihr Passwort ändern für erhöhte Sicherheit.",
    date: "2024-12-16",
    version: "v3.0.6",
    priority: "high", 
    read: false
  }
];

export default function UpdatesWidget() {
  const [updates, setUpdates] = useState(UPDATES);
  const [isOpen, setIsOpen] = useState(false);
  const [showBadge, setShowBadge] = useState(true);

  useEffect(() => {
    // Load read status from localStorage
    const readUpdates = JSON.parse(localStorage.getItem('trapmap_read_updates') || '[]');
    setUpdates(prev => prev.map(update => ({
      ...update,
      read: readUpdates.includes(update.id)
    })));
  }, []);

  const unreadCount = updates.filter(update => !update.read).length;

  const markAsRead = (updateId) => {
    setUpdates(prev => {
      const newUpdates = prev.map(update => 
        update.id === updateId ? { ...update, read: true } : update
      );
      
      // Save to localStorage
      const readUpdates = newUpdates.filter(u => u.read).map(u => u.id);
      localStorage.setItem('trapmap_read_updates', JSON.stringify(readUpdates));
      
      return newUpdates;
    });
  };

  const markAllAsRead = () => {
    setUpdates(prev => {
      const newUpdates = prev.map(update => ({ ...update, read: true }));
      const readUpdates = newUpdates.map(u => u.id);
      localStorage.setItem('trapmap_read_updates', JSON.stringify(readUpdates));
      return newUpdates;
    });
    setShowBadge(false);
    setIsOpen(false); // Close panel immediately since widget will disappear
  };

  const getUpdateIcon = (type) => {
    switch(type) {
      case 'feature': return <Sparkles className="update-icon feature" />;
      case 'improvement': return <Zap className="update-icon improvement" />;
      case 'security': return <AlertCircle className="update-icon security" />;
      case 'bugfix': return <CheckCircle className="update-icon bugfix" />;
      default: return <Info className="update-icon default" />;
    }
  };

  const getPriorityClass = (priority) => {
    switch(priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium'; 
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  // Don't render anything if all updates are read
  if (unreadCount === 0) {
    return null;
  }

  return (
    <>
      {/* Update Trigger Button */}
      <div className="updates-trigger" onClick={() => setIsOpen(true)}>
        <Bell size={20} />
        {unreadCount > 0 && showBadge && (
          <span className="updates-badge">{unreadCount}</span>
        )}
      </div>

      {/* Update Panel */}
      {isOpen && (
        <div className="updates-overlay">
          <div className="updates-panel">
            <div className="updates-header">
              <div className="updates-title">
                <Gift size={24} />
                <h3>TrapMap Updates</h3>
              </div>
              <div className="updates-actions">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="mark-all-read">
                    Alle als gelesen markieren
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="close-updates">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="updates-content">
              {updates.map((update) => (
                <div 
                  key={update.id} 
                  className={`update-item ${update.read ? 'read' : 'unread'} ${getPriorityClass(update.priority)}`}
                  onClick={() => markAsRead(update.id)}
                >
                  <div className="update-main">
                    {getUpdateIcon(update.type)}
                    <div className="update-text">
                      <div className="update-title-row">
                        <h4>{update.title}</h4>
                        <span className="update-version">{update.version}</span>
                      </div>
                      <p>{update.description}</p>
                      <span className="update-date">{update.date}</span>
                    </div>
                    {!update.read && <div className="unread-dot"></div>}
                  </div>
                  <ChevronRight className="update-arrow" size={16} />
                </div>
              ))}
            </div>

            <div className="updates-footer">
              <p>Bleiben Sie über alle TrapMap Neuigkeiten auf dem Laufenden!</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}