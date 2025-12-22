/* ============================================================
   TRAPMAP CHATBOT CONTROLLER
   ============================================================ */

const chatbotService = require('../services/chatbot.service');

// Chat-Historie pro User (in-memory, später evtl. Redis/DB)
const chatHistories = new Map();

// Maximale Historie-Länge
const MAX_HISTORY = 20;

// Rate Limiting pro User
const userMessageCounts = new Map();
const DAILY_LIMIT = 100;

function resetDailyLimits() {
  userMessageCounts.clear();
  console.log('[Chatbot] Daily limits reset');
}

// Reset jeden Tag um Mitternacht
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    resetDailyLimits();
  }
}, 60000);

/**
 * POST /api/chat
 * Sendet eine Nachricht an den Chatbot
 */
async function sendMessage(req, res) {
  try {
    const { message } = req.body;
    const userId = req.user.id;
    const organisationId = req.user.organisation_id;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Nachricht erforderlich' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Nachricht zu lang (max 2000 Zeichen)' });
    }

    // Rate Limiting prüfen
    const today = new Date().toDateString();
    const userKey = `${userId}-${today}`;
    const currentCount = userMessageCounts.get(userKey) || 0;

    if (currentCount >= DAILY_LIMIT) {
      return res.status(429).json({ 
        error: 'Tageslimit erreicht', 
        message: `Du hast das Limit von ${DAILY_LIMIT} Nachrichten pro Tag erreicht. Versuche es morgen wieder.`,
        limit: DAILY_LIMIT,
        used: currentCount
      });
    }

    // Chat-Historie holen oder erstellen
    if (!chatHistories.has(userId)) {
      chatHistories.set(userId, []);
    }
    const history = chatHistories.get(userId);

    // User-Nachricht zur Historie hinzufügen
    history.push({ role: 'user', content: message });

    // Historie kürzen wenn zu lang
    while (history.length > MAX_HISTORY) {
      history.shift();
    }

    // Chatbot aufrufen
    const result = await chatbotService.chat(history, organisationId, userId);

    // Antwort zur Historie hinzufügen
    history.push({ role: 'assistant', content: result.response });

    // Message Count erhöhen
    userMessageCounts.set(userKey, currentCount + 1);

    res.json({
      response: result.response,
      function_called: result.function_called,
      tokens_used: result.tokens_used,
      messages_today: currentCount + 1,
      messages_remaining: DAILY_LIMIT - (currentCount + 1)
    });

  } catch (error) {
    console.error('[Chatbot] Controller error:', error);
    
    if (error.code === 'insufficient_quota') {
      return res.status(503).json({ 
        error: 'Service vorübergehend nicht verfügbar',
        message: 'Der Chatbot ist gerade nicht erreichbar. Bitte versuche es später.'
      });
    }

    res.status(500).json({ 
      error: 'Chatbot-Fehler',
      message: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.'
    });
  }
}

/**
 * GET /api/chat/history
 * Holt die Chat-Historie des Users
 */
async function getHistory(req, res) {
  try {
    const userId = req.user.id;
    const history = chatHistories.get(userId) || [];

    res.json({
      history: history.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      count: history.length
    });

  } catch (error) {
    console.error('[Chatbot] Get history error:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Historie' });
  }
}

/**
 * DELETE /api/chat/history
 * Löscht die Chat-Historie des Users
 */
async function clearHistory(req, res) {
  try {
    const userId = req.user.id;
    chatHistories.delete(userId);

    res.json({ message: 'Chat-Historie gelöscht' });

  } catch (error) {
    console.error('[Chatbot] Clear history error:', error);
    res.status(500).json({ error: 'Fehler beim Löschen der Historie' });
  }
}

/**
 * GET /api/chat/status
 * Gibt den Status des Chatbots zurück (Limit etc.)
 */
async function getStatus(req, res) {
  try {
    const userId = req.user.id;
    const today = new Date().toDateString();
    const userKey = `${userId}-${today}`;
    const currentCount = userMessageCounts.get(userKey) || 0;

    res.json({
      available: true,
      daily_limit: DAILY_LIMIT,
      messages_used: currentCount,
      messages_remaining: DAILY_LIMIT - currentCount,
      history_length: (chatHistories.get(userId) || []).length
    });

  } catch (error) {
    console.error('[Chatbot] Get status error:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Status' });
  }
}

module.exports = {
  sendMessage,
  getHistory,
  clearHistory,
  getStatus
};
