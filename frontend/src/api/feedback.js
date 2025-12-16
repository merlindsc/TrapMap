// ============================================
// FEEDBACK API
// API-Calls für Feedback-System
// ============================================

import axios from './axios';

/**
 * Feedback direkt senden
 */
export const sendFeedback = async (feedbackData) => {
  try {
    const response = await axios.post('/feedback', feedbackData);
    return response.data;
  } catch (error) {
    console.error('Feedback API Error:', error);
    throw error.response?.data || { message: 'Fehler beim Senden des Feedbacks' };
  }
};