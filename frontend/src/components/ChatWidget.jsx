/* ============================================================
   TRAPMAP CHATBOT WIDGET
   GPT-4o mini Support-Bot
   ============================================================ */

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, X, Send, Loader2, Bot, User, 
  Trash2, AlertCircle, Sparkles, ChevronDown, Maximize2, Minimize2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './ChatWidget.css';

const API_URL = import.meta.env.VITE_API_URL;

export default function ChatWidget() {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true); // Fullscreen als Default
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Konstanten
  const CHAT_WINDOW_MARGIN = 80; // Margin für Chat-Fenster bei Tastatur

  // Token aus localStorage
  const getToken = () => {
    const token = localStorage.getItem('trapmap_token');
    // Falls token "null" als String oder leer ist, nicht verwenden
    if (!token || token === 'null' || token === 'undefined') {
      return null;
    }
    return token;
  };

  // Scrollt zu neuen Nachrichten
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  // Auto-scroll zu neuen Nachrichten
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus auf Input wenn geöffnet
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      loadStatus();
      loadHistory();
      // Add data attribute to body to notify other components
      document.body.setAttribute('data-chat-open', 'true');
    } else {
      // Remove data attribute when chat is closed
      document.body.removeAttribute('data-chat-open');
    }
    
    return () => {
      document.body.removeAttribute('data-chat-open');
    };
  }, [isOpen]);

  // Tastatur-Sichtbarkeits-Behandlung für mobile Geräte
  useEffect(() => {
    if (!isOpen) return;

    // Visual Viewport API für bessere Tastatur-Behandlung
    if (window.visualViewport) {
      const handleResize = () => {
        const viewport = window.visualViewport;
        const chatWindow = document.querySelector('.chat-window');
        
        if (chatWindow && viewport) {
          const viewportHeight = viewport.height;
          const windowHeight = window.innerHeight;
          const keyboardHeight = windowHeight - viewportHeight;
          
          // Tastatur ist sichtbar (mehr als 150px Differenz)
          if (keyboardHeight > 150) {
            // Auf Mobile: Passe Höhe an Viewport an (ohne Tastatur)
            chatWindow.style.height = `${viewportHeight}px`;
            chatWindow.style.maxHeight = `${viewportHeight}px`;
            chatWindow.style.transform = `translateY(0)`;
          } else {
            // Normal: Respektiere Fullscreen/Half-Screen Modus
            if (isFullscreen) {
              chatWindow.style.height = '100dvh';
              chatWindow.style.maxHeight = '100dvh';
            } else {
              chatWindow.style.height = '50dvh';
              chatWindow.style.maxHeight = '50dvh';
            }
            chatWindow.style.transform = '';
          }
        }
      };

      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
      
      // Initial resize
      handleResize();
      
      return () => {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      };
    }
  }, [isOpen, isFullscreen]);

  // Status laden
  const loadStatus = async () => {
    const token = getToken();
    if (!token) return; // Nicht laden wenn nicht eingeloggt
    
    try {
      const res = await fetch(`${API_URL}/chat/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error('Status load error:', e);
    }
  };

  // Historie laden
  const loadHistory = async () => {
    const token = getToken();
    if (!token) return; // Nicht laden wenn nicht eingeloggt
    
    try {
      const res = await fetch(`${API_URL}/chat/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.history && data.history.length > 0) {
          setMessages(data.history);
        }
      }
    } catch (e) {
      console.error('History load error:', e);
    }
  };

  // Nachricht senden
  const sendMessage = async (e) => {
    e?.preventDefault();
    
    if (!input.trim() || loading) return;

    const token = getToken();
    if (!token) {
      setError('Bitte zuerst einloggen');
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setError(null);
    
    // User-Nachricht sofort anzeigen
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError(`Tageslimit erreicht (${data.limit} Nachrichten). Morgen geht's weiter!`);
        } else {
          setError(data.message || 'Fehler beim Senden');
        }
        return;
      }

      // Bot-Antwort hinzufügen
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      
      // Status aktualisieren
      if (data.messages_remaining !== undefined) {
        setStatus(prev => ({
          ...prev,
          messages_used: data.messages_today,
          messages_remaining: data.messages_remaining
        }));
      }

    } catch (e) {
      console.error('Send error:', e);
      setError('Netzwerkfehler. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  // Historie löschen
  const clearHistory = async () => {
    const token = getToken();
    if (!token) {
      setMessages([]);
      return;
    }

    try {
      await fetch(`${API_URL}/chat/history`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMessages([]);
    } catch (e) {
      console.error('Clear error:', e);
      setMessages([]); // Trotzdem lokal leeren
    }
  };

  // Chat zurücksetzen (ohne Bestätigung)
  const resetChat = () => {
    setMessages([]);
    setError(null);
  };

  // Markdown-ähnliche Formatierung parsen
  const parseMarkdown = (text) => {
    if (!text) return '';
    
    return text
      // **bold** -> <strong>
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // *italic* -> <em>
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // `code` -> <code>
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  };

  // Quick Actions - Kundenrelevant
  const quickActions = [
    { label: '📊 Meine Übersicht', message: 'Zeig mir eine Übersicht meiner Standorte und Boxen' },
    { label: '🕐 Letzte Kontrollen', message: 'Was waren meine letzten Kontrollen?' },
    { label: '⚠️ Handlungsbedarf', message: 'Gibt es Boxen mit Auffälligkeiten oder kritischem Befall?' },
    { label: '📅 Überfällige Boxen', message: 'Welche Boxen sind überfällig und müssen kontrolliert werden?' },
    { label: '📦 Mehr Boxen bestellen', message: 'Ich möchte zusätzliche Boxen bestellen' },
    { label: '📄 Report erstellen', message: 'Erstelle einen PDF-Report für mein erstes Objekt' },
    { label: '❓ Wie funktioniert TrapMap?', message: 'Erkläre mir kurz wie TrapMap funktioniert und welche Funktionen es gibt' },
    { label: '💬 Feedback geben', message: 'Ich möchte Feedback zu TrapMap geben' },
  ];

  return (
    <>
      {/* Floating Button */}
      <button 
        className={`chat-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Chat öffnen"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        {!isOpen && <span className="chat-badge">AI</span>}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={`chat-window ${isFullscreen ? 'fullscreen' : 'halfscreen'}`}>
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <Bot size={20} />
              <div>
                <span className="chat-title">TrapMap Assistent</span>
                <span className="chat-subtitle">
                  {status ? `${status.messages_remaining} Nachrichten übrig` : 'Powered by GPT-4o'}
                </span>
              </div>
            </div>
            <div className="chat-header-actions">
              {/* Fullscreen/Half Toggle Button (nur Mobile) */}
              <button 
                onClick={() => setIsFullscreen(!isFullscreen)} 
                title={isFullscreen ? "Halbes Display" : "Ganzes Display"}
                className="screen-toggle-btn mobile-only"
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              
              {messages.length > 0 && (
                <button 
                  onClick={resetChat} 
                  title="Neuer Chat"
                  className="reset-btn"
                >
                  <ChevronDown size={16} />
                  <span>Neu</span>
                </button>
              )}
              <button onClick={clearHistory} title="Verlauf löschen">
                <Trash2 size={16} />
              </button>
              <button onClick={() => setIsOpen(false)} title="Schließen" className="close-btn">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-welcome">
                <Sparkles size={32} />
                <h3>Hallo! 👋</h3>
                <p>Ich bin dein TrapMap-Assistent. Wie kann ich dir helfen?</p>
                <div className="quick-actions">
                  {quickActions.map((action, i) => (
                    <button 
                      key={i} 
                      onClick={() => {
                        setInput(action.message);
                        setTimeout(() => {
                          sendMessage({ preventDefault: () => {} });
                        }, 50);
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className="message-content">
                  {msg.content.split('\n').map((line, j) => (
                    <p 
                      key={j} 
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(line) || '&nbsp;' }}
                    />
                  ))}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-message assistant">
                <div className="message-avatar">
                  <Bot size={16} />
                </div>
                <div className="message-content loading">
                  <Loader2 size={16} className="spin" />
                  <span>Denke nach...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="chat-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form className="chat-input" onSubmit={sendMessage}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nachricht eingeben..."
              disabled={loading}
              maxLength={2000}
            />
            <button type="submit" disabled={!input.trim() || loading}>
              {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}