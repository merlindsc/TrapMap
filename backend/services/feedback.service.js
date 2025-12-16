// ============================================
// FEEDBACK SERVICE
// E-Mail-Versendung für Feedback
// ============================================

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'TrapMap Feedback <feedback@trap-map.de>';

/**
 * Feedback-E-Mail direkt senden
 */
const sendFeedbackEmail = async ({ type, rating, message, contactEmail, user }) => {
  try {
    // Debug: User-Daten ausgeben
    console.log('🔍 User object in feedback:', JSON.stringify(user, null, 2));
    
    const feedbackTypes = {
      'general': 'Allgemeines Feedback',
      'feature': 'Feature-Wunsch', 
      'bug': 'Bug-Meldung',
      'praise': 'Lob & Anerkennung'
    };

    const typeName = feedbackTypes[type] || 'Feedback';
    const ratingText = rating ? ` (${rating}/5 ⭐)` : '';

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: 'info@trap-map.de',
      subject: `TrapMap ${typeName}${ratingText}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              margin: 0; 
              padding: 0; 
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
              background: #f9fafb; 
            }
            .header { 
              background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); 
              padding: 30px; 
              text-align: center; 
              border-radius: 10px 10px 0 0; 
              color: white;
            }
            .header h1 { 
              margin: 0; 
              font-size: 24px; 
            }
            .content { 
              background: white; 
              padding: 30px; 
              border-radius: 0 0 10px 10px; 
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .feedback-info { 
              background: #f3f4f6; 
              border-left: 4px solid #6366f1; 
              padding: 16px; 
              margin: 20px 0; 
              border-radius: 0 4px 4px 0;
            }
            .feedback-info h3 { 
              margin: 0 0 10px 0; 
              color: #6366f1; 
              font-size: 18px;
            }
            .feedback-info p { 
              margin: 5px 0; 
            }
            .message-box { 
              background: #f9fafb; 
              border: 1px solid #e5e7eb; 
              border-radius: 8px; 
              padding: 20px; 
              margin: 20px 0; 
              font-style: italic;
              font-size: 16px;
              line-height: 1.5;
            }
            .user-info { 
              background: #fef3c7; 
              border-radius: 8px; 
              padding: 16px; 
              margin: 20px 0; 
            }
            .user-info h4 { 
              margin: 0 0 10px 0; 
              color: #92400e; 
            }
            .rating { 
              font-size: 20px; 
              margin: 10px 0; 
            }
            .footer { 
              text-align: center; 
              color: #6b7280; 
              font-size: 14px; 
              margin-top: 30px; 
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 TrapMap Feedback</h1>
            </div>
            <div class="content">
              <div class="feedback-info">
                <h3>${typeName}</h3>
                <p><strong>Von:</strong> ${user.first_name} ${user.last_name} (${user.email})</p>
                <p><strong>Organisation:</strong> ${user.organisation_name || user.organization_name || user.company || user.organisation || user.organization || 'Unbekannt'}</p>
                <p><strong>Rolle:</strong> ${user.role}</p>
                ${contactEmail ? `<p><strong>Kontakt-E-Mail:</strong> ${contactEmail}</p>` : ''}
                ${rating ? `<div class="rating"><strong>Bewertung:</strong> ${'⭐'.repeat(rating)} (${rating}/5)</div>` : ''}
                <p><strong>Zeitpunkt:</strong> ${new Date().toLocaleString('de-DE')}</p>
              </div>

              <div class="message-box">
                ${message.replace(/\n/g, '<br>')}
              </div>

              <div class="footer">
                <p>📧 Gesendet über das TrapMap Dashboard Feedback-System</p>
                <p>🚀 BETA-Version - Jedes Feedback hilft uns bei der Verbesserung!</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
TrapMap ${typeName}${ratingText}

Von: ${user.first_name} ${user.last_name} (${user.email})
Organisation: ${user.organisation_name || 'Unbekannt'}
Rolle: ${user.role}
${contactEmail ? `Kontakt-E-Mail: ${contactEmail}` : ''}
${rating ? `Bewertung: ${rating}/5 Sterne` : ''}

Nachricht:
${message}

---
Gesendet am: ${new Date().toLocaleString('de-DE')}
Über: TrapMap Dashboard Feedback-System
      `
    });

    if (error) {
      console.error('Resend Error:', error);
      return { success: false, error };
    }

    console.log('Feedback Email sent:', data);
    return { success: true, data };

  } catch (error) {
    console.error('Feedback Service Error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendFeedbackEmail
};