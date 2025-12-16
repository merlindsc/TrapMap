/* ============================================================
   TRAPMAP – DEMO SERVICE
   Handles demo account requests and creation
   ============================================================ */

const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');
const { createDemoQRCodesAndBoxes } = require('./demo-qr-boxes.service');

// E-Mail Service (Resend) - optional
let Resend;
let resend;
try {
  Resend = require('resend').Resend;
  resend = new Resend(process.env.RESEND_API_KEY);
} catch (e) {
  console.log('⚠️ Resend nicht installiert - E-Mails werden nicht gesendet');
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'info@trap-map.de';
const APP_URL = process.env.APP_URL || 'https://trap-map.de';

// ============================================
// DEMO REQUEST SUBMISSION
// ============================================
exports.submitDemoRequest = async (data) => {
  const { name, company, email, phone, expectations } = data;

  // Check if request already exists for this email
  const { data: existing } = await supabase
    .from('demo_requests')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    throw new Error('Für diese E-Mail-Adresse liegt bereits eine Demo-Anfrage vor.');
  }

  // Insert demo request (simplified without verification fields for now)
  const { data: request, error } = await supabase
    .from('demo_requests')
    .insert([{
      name,
      company,
      email,
      phone,
      expectations,
      status: 'pending',
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;

  // AUTOMATICALLY CREATE DEMO ACCOUNT IMMEDIATELY
  try {
    console.log('🚀 Auto-creating demo account for:', request.email);
    const demoAccount = await exports.createDemoAccount(request.id, {
      trial_days: 90
    });
    console.log('✅ Demo account auto-created successfully');
    return {
      ...request,
      account_created: true,
      organization: demoAccount.organization,
      user: demoAccount.user,
      login_url: demoAccount.login_url
    };
  } catch (autoCreateError) {
    console.error('❌ Auto-creation failed, sending notification instead:', autoCreateError);
    // Fallback: Send notification email to admin
    try {
      await sendAdminNotification(request);
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
    }
  }

  return request;
};

// ============================================
// GET ALL DEMO REQUESTS
// ============================================
exports.getDemoRequests = async () => {
  const { data, error } = await supabase
    .from('demo_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// ============================================
// CREATE DEMO ACCOUNT FROM REQUEST
// ============================================
exports.createDemoAccount = async (requestId, options = {}) => {
  const { password: providedPassword, trial_days = 90 } = options;

  // Get demo request
  const { data: request, error: requestError } = await supabase
    .from('demo_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error('Demo-Anfrage nicht gefunden');
  }

  if (request.status === 'completed') {
    throw new Error('Für diese Anfrage wurde bereits ein Account erstellt');
  }

  // Generate organization name from company or name
  const orgName = request.company || `${request.name} Demo`;
  
  // Generate random password if none provided
  const password = providedPassword || Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10).toUpperCase();
  const hashedPassword = await bcrypt.hash(password, 12);
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + trial_days);

  try {
    // Generate unique short QR prefix for demo organization (3 chars max)
    // Uses both letters and numbers for more combinations (36^1 = 36 possibilities)
    const random = Math.random().toString(36).toUpperCase().slice(-1);
    const qrPrefix = `DM${random}`; // DM = Demo + 1 random char/number (3 total)
    
    // Start transaction-like operations
    
    // 1. Create organization
    const { data: organization, error: orgError } = await supabase
      .from('organisations')
      .insert([{
        name: orgName,
        contact_name: request.name,
        email: request.email,
        phone: request.phone,
        qr_prefix: qrPrefix,
        qr_next_number: 1,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (orgError) throw orgError;

    // 2. Create admin user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([{
        email: request.email,
        password_hash: hashedPassword,
        first_name: request.name.split(' ')[0] || request.name,
        last_name: request.name.split(' ').slice(1).join(' ') || '',
        role: 'admin',
        organisation_id: organization.id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (userError) throw userError;

    // 3. Update demo request status
    const { error: updateError } = await supabase
      .from('demo_requests')
      .update({ 
        status: 'completed',
        account_created_at: new Date().toISOString(),
        organisation_id: organization.id,
        user_id: user.id
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // 4. Create demo QR codes and boxes (20 each)
    try {
      await createDemoQRCodesAndBoxes(organization, user);
      console.log('✅ Demo QR codes and boxes created successfully');
    } catch (qrError) {
      console.error('Failed to create demo QR codes/boxes:', qrError);
      // Don't fail account creation if QR creation fails
    }

    // 5. Send welcome email with LOGIN CREDENTIALS immediately
    try {
      await sendInstantLoginEmail(request, password, organization);
    } catch (emailError) {
      console.error('Failed to send login credentials email:', emailError);
      // Don't fail account creation if email fails
    }

    return {
      organization,
      user,
      trial_end_date: trialEndDate,
      login_url: `${APP_URL}/login`
    };

  } catch (error) {
    console.error('Error creating demo account:', error);
    throw new Error(`Fehler beim Erstellen des Demo-Accounts: ${error.message}`);
  }
};

// ============================================
// DELETE DEMO REQUEST
// ============================================
exports.deleteDemoRequest = async (requestId) => {
  const { data, error } = await supabase
    .from('demo_requests')
    .delete()
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  
  if (!data) {
    throw new Error('Demo-Anfrage nicht gefunden');
  }

  return data;
};

// ============================================
// EMAIL FUNCTIONS
// ============================================

async function sendInstantLoginEmail(request, password, organization) {
  if (!resend) {
    console.log('⚠️ Resend not available - instant login email not sent');
    return;
  }

  const subject = '🎉 TrapMap Demo-Account sofort verfügbar - Hier sind Ihre Login-Daten!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <h1 style="color: #3B82F6; text-align: center;">🎉 Willkommen bei TrapMap!</h1>
      
      <div style="background: linear-gradient(135deg, #3B82F6, #1E40AF); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
        <h2 style="margin: 0; color: white;">Ihr Demo-Account ist SOFORT verfügbar!</h2>
        <p style="margin: 10px 0 0; font-size: 16px;">Keine Wartezeit - loggen Sie sich jetzt direkt ein!</p>
      </div>

      <div style="background-color: #f8fafc; border: 2px solid #3B82F6; padding: 25px; border-radius: 12px; margin: 25px 0;">
        <h3 style="color: #1E40AF; margin-top: 0;">🔑 Ihre Login-Daten:</h3>
        <div style="background-color: white; padding: 15px; border-radius: 8px; border-left: 4px solid #3B82F6;">
          <p style="margin: 8px 0;"><strong>🌐 Login-URL:</strong><br><a href="${APP_URL}/login" style="color: #3B82F6; font-size: 18px; text-decoration: none;">${APP_URL}/login</a></p>
          <p style="margin: 8px 0;"><strong>📧 E-Mail:</strong><br><span style="font-size: 16px; color: #1E40AF;">${request.email}</span></p>
          <p style="margin: 8px 0;"><strong>🔒 Passwort:</strong><br><span style="font-size: 16px; color: #DC2626; background: #FEF2F2; padding: 5px 8px; border-radius: 4px; font-family: monospace;">${password}</span></p>
        </div>
      </div>

      <div style="background-color: #FEF3C7; border: 2px solid #F59E0B; padding: 20px; border-radius: 12px; margin: 25px 0;">
        <h3 style="color: #92400E; margin-top: 0;">⚠️ WICHTIG - Nach dem ersten Login:</h3>
        <ul style="color: #92400E; margin: 0;">
          <li><strong>Sie MÜSSEN Ihr Passwort sofort ändern</strong></li>
          <li>Ein Pop-up wird Sie automatisch dazu auffordern</li>
          <li>Wählen Sie ein sicheres, persönliches Passwort</li>
        </ul>
      </div>

      <div style="background-color: #F0FDF4; border: 2px solid #10B981; padding: 20px; border-radius: 12px; margin: 25px 0;">
        <h3 style="color: #065F46; margin-top: 0;">✨ Ihr Demo-Account enthält bereits:</h3>
        <ul style="color: #065F46; margin: 0;">
          <li>🏷️ <strong>20 fertige QR-Codes</strong> zum sofortigen Einsatz</li>
          <li>📦 <strong>20 Demo-Boxen</strong> in Ihrem virtuellen Lager</li>
          <li>🎯 <strong>Vollzugang zu allen Funktionen</strong> für 90 Tage</li>
          <li>📚 <strong>Interaktive Anleitung</strong> im Dashboard</li>
          <li>🆘 <strong>Persönlicher Support</strong> bei Fragen</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/login" 
           style="background: linear-gradient(135deg, #3B82F6, #1E40AF); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);">
          🚀 JETZT EINLOGGEN
        </a>
      </div>

      <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
        <h3 style="color: #475569; margin-top: 0;">💬 Fragen oder Probleme?</h3>
        <p style="margin: 5px 0;"><strong>📧 E-Mail:</strong> <a href="mailto:${FROM_EMAIL}" style="color: #3B82F6;">${FROM_EMAIL}</a></p>
        <p style="margin: 5px 0;"><strong>📞 Telefon:</strong> 0152 / 026 370 89</p>
        <p style="margin: 15px 0 5px; color: #64748B;">Wir helfen Ihnen gerne weiter!</p>
      </div>

      <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
      
      <p style="text-align: center; color: #64748B; font-size: 14px; margin: 0;">
        Mit freundlichen Grüßen<br>
        <strong>Das TrapMap Team</strong><br>
        <small>Organization: ${organization.name} (${organization.qr_prefix})</small>
      </p>
    </div>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: request.email,
    subject,
    html
  });
}

async function sendAdminNotification(request) {
  if (!resend) return;

  const subject = `Neue Demo-Anfrage von ${request.name}`;
  const html = `
    <h2>Neue Demo-Anfrage</h2>
    <p><strong>Name:</strong> ${request.name}</p>
    <p><strong>Firma:</strong> ${request.company || 'Nicht angegeben'}</p>
    <p><strong>E-Mail:</strong> ${request.email}</p>
    <p><strong>Telefon:</strong> ${request.phone || 'Nicht angegeben'}</p>
    <p><strong>Erwartungen:</strong></p>
    <blockquote>${request.expectations || 'Keine Angabe'}</blockquote>
    <p><strong>Zeitpunkt:</strong> ${new Date(request.created_at).toLocaleString('de-DE')}</p>
    
    <hr>
    <p><em>Demo-Account über das Admin-Panel erstellen: ${APP_URL}/admin</em></p>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: FROM_EMAIL, // Send to admin
    subject,
    html
  });
}

async function sendConfirmationEmail(request) {
  if (!resend) return;

  const subject = 'Ihre TrapMap Demo-Anfrage wurde eingereicht';
  const html = `
    <h2>Vielen Dank für Ihr Interesse an TrapMap!</h2>
    <p>Hallo ${request.name},</p>
    
    <p>wir haben Ihre Demo-Anfrage erhalten und werden uns innerhalb von 24 Stunden bei Ihnen melden.</p>
    
    <p><strong>Ihre Angaben:</strong></p>
    <ul>
      <li>Name: ${request.name}</li>
      <li>Firma: ${request.company || 'Nicht angegeben'}</li>
      <li>E-Mail: ${request.email}</li>
      ${request.phone ? `<li>Telefon: ${request.phone}</li>` : ''}
    </ul>
    
    <p>Bei Fragen können Sie uns gerne direkt kontaktieren:</p>
    <p>📧 E-Mail: ${FROM_EMAIL}<br>
    📞 Telefon: 0152 / 026 370 89</p>
    
    <p>Mit freundlichen Grüßen<br>
    Das TrapMap Team</p>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: request.email,
    subject,
    html
  });
}

async function sendWelcomeEmail(request, password) {
  if (!resend) return;

  const subject = 'Ihr TrapMap Demo-Account ist bereit!';
  const html = `
    <h2>Willkommen bei TrapMap!</h2>
    <p>Hallo ${request.name},</p>
    
    <p>Ihr Demo-Account wurde erfolgreich erstellt. Sie können sich jetzt anmelden:</p>
    
    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Login-Daten:</strong></p>
      <p>🌐 URL: <a href="${APP_URL}/login">${APP_URL}/login</a></p>
      <p>📧 E-Mail: ${request.email}</p>
      <p>🔒 Passwort: ${password}</p>
    </div>
    
    <p><strong>Wichtige Hinweise:</strong></p>
    <ul>
      <li>Ihr Demo-Account ist bis zum 01.02.2026 kostenlos nutzbar</li>
      <li>Sie haben vollen Zugriff auf alle TrapMap Funktionen</li>
      <li>Ändern Sie Ihr Passwort nach dem ersten Login</li>
      <li>Bei Fragen stehen wir Ihnen gerne zur Verfügung</li>
    </ul>
    
    <p>Viel Erfolg mit TrapMap!</p>
    
    <p>📧 Support: ${FROM_EMAIL}<br>
    📞 Telefon: 0152 / 026 370 89</p>
    
    <p>Mit freundlichen Grüßen<br>
    Das TrapMap Team</p>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: request.email,
    subject,
    html
  });
}

// ============================================
// VERIFY DEMO REQUEST & AUTO-CREATE ACCOUNT
// ============================================
exports.verifyDemoRequest = async (token) => {
  // Find demo request by token
  const { data: request, error: requestError } = await supabase
    .from('demo_requests')
    .select('*')
    .eq('verification_token', token)
    .eq('status', 'pending_verification')
    .single();

  if (requestError || !request) {
    throw new Error('Ungültiger oder abgelaufener Verifizierungslink');
  }

  // Check if token has expired
  if (new Date() > new Date(request.verification_expires)) {
    throw new Error('Verifizierungslink ist abgelaufen');
  }

  // Auto-create demo account
  try {
    const accountResult = await exports.createDemoAccount(request.id, {
      trial_days: 90
    });

    return {
      success: true,
      message: 'E-Mail verifiziert und Demo-Account erstellt!',
      account: accountResult
    };

  } catch (error) {
    console.error('Auto-creation failed:', error);
    throw new Error(`Fehler bei der Account-Erstellung: ${error.message}`);
  }
};

// ============================================
// SEND VERIFICATION EMAIL
// ============================================
async function sendVerificationEmail(request) {
  if (!resend) {
    console.log('⚠️ Resend not available - verification email not sent');
    return;
  }

  const verifyUrl = `${APP_URL}/verify-demo?token=${request.verification_token}`;
  
  const subject = 'TrapMap Demo-Zugang bestätigen';
  const html = `
    <h2>TrapMap Demo-Zugang bestätigen</h2>
    <p>Hallo ${request.name},</p>
    
    <p>vielen Dank für Ihr Interesse an TrapMap! Um Ihren Demo-Zugang zu aktivieren, bestätigen Sie bitte Ihre E-Mail-Adresse:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verifyUrl}" 
         style="background-color: #3B82F6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
        🚀 Demo-Zugang aktivieren
      </a>
    </div>
    
    <p><strong>Was passiert nach der Bestätigung?</strong></p>
    <ul>
      <li>✅ Ihr Demo-Account wird sofort erstellt</li>
      <li>📧 Sie erhalten Login-Daten per E-Mail</li>
      <li>🎯 90 Tage kostenloser Vollzugang zu TrapMap</li>
      <li>🆘 Persönlicher Support bei Fragen</li>
    </ul>
    
    <p><small>Dieser Link ist 24 Stunden gültig. Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
    ${verifyUrl}</small></p>
    
    <p>📧 Support: ${FROM_EMAIL}<br>
    📞 Telefon: 0152 / 026 370 89</p>
    
    <p>Mit freundlichen Grüßen<br>
    Das TrapMap Team</p>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: request.email,
    subject,
    html
  });
}