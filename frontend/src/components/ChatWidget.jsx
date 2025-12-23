/* ============================================================
   TRAPMAP CHATBOT WIDGET
   GPT-4o mini Support-Bot
   ============================================================ */

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, X, Send, Loader2, Bot, User, 
  Trash2, AlertCircle, Sparkles, ChevronDown
} from 'lucide-react';
import './ChatWidget.css';

const API_URL = import.meta.env.VITE_API_URL;

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Token aus localStorage
  const getToken = () => {
    const token = localStorage.getItem('trapmap_token');
    // Falls token "null" als String oder leer ist, nicht verwenden
    if (!token || token === 'null' || token === 'undefined') {
      return null;
    }
    return token;
  };

  // Scroll zu neuen Nachrichten
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
    }
  }, [isOpen]);

  // Keyboard visibility handling für mobile
  useEffect(() => {
    if (!isOpen) return;

    // Visual Viewport API für besseres Keyboard-Handling
    if (window.visualViewport) {
      const handleResize = () => {
        const viewport = window.visualViewport;
        const chatWindow = document.querySelector('.chat-window');
        
        if (chatWindow && viewport) {
          // Berechne die Höhe unter Berücksichtigung der Tastatur
          const viewportHeight = viewport.height;
          const offsetTop = viewport.offsetTop;
          
          // Passe Chat-Fenster an, wenn Tastatur sichtbar ist
          if (window.innerHeight > viewportHeight) {
            chatWindow.style.height = `${viewportHeight - 80}px`;
            chatWindow.style.transform = `translateY(${offsetTop}px)`;
          } else {
            chatWindow.style.height = '';
            chatWindow.style.transform = '';
          }
        }
      };

      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
      
      return () => {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      };
    }
  }, [isOpen]);

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
    if (!confirm('Chat-Verlauf wirklich löschen?')) return;

    const token = getToken();
    if (!token) return;

    try {
      await fetch(`${API_URL}/chat/history`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMessages([]);
    } catch (e) {
      console.error('Clear error:', e);
    }
  };

  // Quick Actions
  const quickActions = [
    { label: '📊 Übersicht', message: 'Zeig mir eine Übersicht meiner Boxen' },
    { label: '⚠️ Überfällig', message: 'Welche Boxen sind überfällig?' },
    { label: '📋 Letzte Scans', message: 'Was waren meine letzten Kontrollen?' },
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
        <div className="chat-window">
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
              <button onClick={clearHistory} title="Verlauf löschen">
                <Trash2 size={16} />
              </button>
              <button onClick={() => setIsOpen(false)} title="Schließen">
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
                <p>Ich bin dein TrapMap-Assistent. Frag mich nach deinen Boxen, Kontrollen oder wie TrapMap funktioniert.</p>
                <div className="quick-actions">
                  {quickActions.map((action, i) => (
                    <button 
                      key={i} 
                      onClick={() => {
                        setInput(action.message);
                        sendMessage({ preventDefault: () => {} });
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
                    <p key={j}>{line}</p>
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