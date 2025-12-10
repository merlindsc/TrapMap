// ============================================
// EMAIL SERVICE
// Resend Integration für TrapMap
// ============================================

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'TrapMap <noreply@trap-map.de>';

/**
 * Einladungs-Email an neuen Benutzer senden
 */
const sendInvitationEmail = async (to, { name, email, tempPassword, orgName }) => {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: to,
      subject: `Willkommen bei TrapMap - Ihr Zugang für ${orgName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a1f3a 0%, #0f1419 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: #fff; margin: 0; font-size: 28px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .credentials p { margin: 8px 0; }
            .credentials strong { color: #1a1f3a; }
            .password { font-family: monospace; font-size: 18px; background: #fef3c7; padding: 8px 16px; border-radius: 4px; display: inline-block; }
            .button { display: inline-block; background: #4f46e5; color: #fff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; font-size: 14px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 TrapMap</h1>
            </div>
            <div class="content">
              <h2>Hallo ${name}!</h2>
              <p>Sie wurden als Administrator für <strong>${orgName}</strong> bei TrapMap eingeladen.</p>
              
              <div class="credentials">
                <p><strong>Ihre Zugangsdaten:</strong></p>
                <p>E-Mail: <strong>${email}</strong></p>
                <p>Temporäres Passwort: <span class="password">${tempPassword}</span></p>
              </div>
              
              <div class="warning">
                ⚠️ <strong>Wichtig:</strong> Bitte ändern Sie Ihr Passwort beim ersten Login!
              </div>
              
              <p style="text-align: center;">
                <a href="https://trap-map.de" class="button">Jetzt einloggen →</a>
              </p>
              
              <p>Bei Fragen wenden Sie sich an Ihren Administrator.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} TrapMap · Pest Control Monitoring</p>
              <p>Diese E-Mail wurde automatisch generiert.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Einladungs-Email gesendet an: ${to}`);
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Passwort-Reset Email senden
 */
const sendPasswordResetEmail = async (to, { name, resetToken }) => {
  try {
    const resetLink = `https://trap-map.de/reset-password?token=${resetToken}`;
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: to,
      subject: 'TrapMap - Passwort zurücksetzen',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a1f3a 0%, #0f1419 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: #fff; margin: 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #4f46e5; color: #fff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 TrapMap</h1>
            </div>
            <div class="content">
              <h2>Passwort zurücksetzen</h2>
              <p>Hallo ${name},</p>
              <p>Sie haben angefordert, Ihr Passwort zurückzusetzen. Klicken Sie auf den Button um ein neues Passwort zu vergeben:</p>
              
              <p style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" class="button">Neues Passwort vergeben →</a>
              </p>
              
              <p style="color: #6b7280; font-size: 14px;">Dieser Link ist 1 Stunde gültig. Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} TrapMap · Pest Control Monitoring</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Password reset email error:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Password-Reset-Email gesendet an: ${to}`);
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generiert ein sicheres temporäres Passwort
 */
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

module.exports = {
  sendInvitationEmail,
  sendPasswordResetEmail,
  generateTempPassword
};