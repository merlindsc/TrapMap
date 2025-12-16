/* ============================================================
   TRAPMAP - FEEDBACK WIDGET
   Direktes Feedback an info@trap-map.de
   ============================================================ */

import React, { useState } from "react";
import { 
  MessageCircle, X, Send, Star, Lightbulb, 
  Bug, Heart, Zap, CheckCircle 
} from "lucide-react";
import { sendFeedback } from "../api/feedback";
import "./FeedbackWidget.css";

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState({
    type: 'general',
    rating: 0,
    message: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const feedbackTypes = [
    { id: 'general', label: 'Allgemeines Feedback', icon: <MessageCircle size={20} />, color: '#6366f1' },
    { id: 'feature', label: 'Feature-Wunsch', icon: <Lightbulb size={20} />, color: '#f59e0b' },
    { id: 'bug', label: 'Bug melden', icon: <Bug size={20} />, color: '#ef4444' },
    { id: 'praise', label: 'Lob & Anerkennung', icon: <Heart size={20} />, color: '#10b981' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!feedback.message.trim()) return;

    setIsSubmitting(true);

    try {
      const result = await sendFeedback({
        type: feedback.type,
        rating: feedback.rating || null,
        message: feedback.message.trim(),
        contactEmail: feedback.email || null
      });

      if (result.success) {
        // Mark as submitted
        setIsSubmitted(true);
        
        // Reset form after delay
        setTimeout(() => {
          setIsSubmitted(false);
          setIsOpen(false);
          setFeedback({
            type: 'general',
            rating: 0,
            message: '',
            email: ''
          });
        }, 3000);
      }
      
    } catch (error) {
      console.error('Feedback error:', error);
      alert('Fehler beim Senden des Feedbacks. Bitte versuche es später erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={24}
        className={`star ${i < feedback.rating ? 'filled' : ''}`}
        onClick={() => setFeedback(prev => ({ ...prev, rating: i + 1 }))}
      />
    ));
  };

  if (isSubmitted) {
    return (
      <div className="feedback-overlay">
        <div className="feedback-panel success">
          <div className="success-content">
            <CheckCircle size={48} className="success-icon" />
            <h3>Vielen Dank!</h3>
            <p>Dein Feedback wurde erfolgreich gesendet! Wir schätzen deine Rückmeldung sehr.</p>
            <button onClick={() => setIsOpen(false)} className="close-feedback">
              Schließen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Feedback Trigger Button */}
      <div className="feedback-trigger" onClick={() => setIsOpen(true)}>
        <MessageCircle size={20} />
        <span className="feedback-label">Feedback</span>
      </div>

      {/* Feedback Panel */}
      {isOpen && (
        <div className="feedback-overlay">
          <div className="feedback-panel">
            <div className="feedback-header">
              <div className="feedback-title">
                <Zap size={24} />
                <h3>Dein Feedback ist uns wichtig!</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="close-feedback">
                <X size={20} />
              </button>
            </div>

            <div className="feedback-content">
              <div className="beta-info">
                <p>🚀 <strong>Wir sind in der BETA-Phase!</strong></p>
                <p>Hilf uns TrapMap zu verbessern. Jedes Feedback zählt!</p>
              </div>

              <form onSubmit={handleSubmit} className="feedback-form">
                {/* Feedback Type */}
                <div className="form-group">
                  <label>Art des Feedbacks</label>
                  <div className="feedback-types">
                    {feedbackTypes.map(type => (
                      <button
                        key={type.id}
                        type="button"
                        className={`feedback-type ${feedback.type === type.id ? 'active' : ''}`}
                        onClick={() => setFeedback(prev => ({ ...prev, type: type.id }))}
                        style={{ '--type-color': type.color }}
                      >
                        {type.icon}
                        <span>{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div className="form-group">
                  <label>Wie zufrieden bist du mit TrapMap? (optional)</label>
                  <div className="star-rating">
                    {renderStars()}
                    <span className="rating-text">
                      {feedback.rating === 0 && 'Noch nicht bewertet'}
                      {feedback.rating === 1 && 'Sehr unzufrieden'}
                      {feedback.rating === 2 && 'Unzufrieden'}
                      {feedback.rating === 3 && 'Neutral'}
                      {feedback.rating === 4 && 'Zufrieden'}
                      {feedback.rating === 5 && 'Sehr zufrieden'}
                    </span>
                  </div>
                </div>

                {/* Message */}
                <div className="form-group">
                  <label>Dein Feedback *</label>
                  <textarea
                    value={feedback.message}
                    onChange={(e) => setFeedback(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Teile uns deine Gedanken, Wünsche oder Probleme mit..."
                    rows={4}
                    required
                  />
                </div>

                {/* Contact Email */}
                <div className="form-group">
                  <label>Kontakt-E-Mail (optional)</label>
                  <input
                    type="email"
                    value={feedback.email}
                    onChange={(e) => setFeedback(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Für Rückfragen (optional)"
                  />
                </div>

                <button 
                  type="submit" 
                  className="submit-feedback"
                  disabled={!feedback.message.trim() || isSubmitting}
                >
                  <Send size={18} />
                  {isSubmitting ? 'Wird gesendet...' : 'Feedback senden'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}