/* ============================================================
   TRAPMAP – PARTNER SERVICE
   Verwaltet externe Partner/Kunden-Zugänge
   
   Features:
   - Partner erstellen mit automatischer E-Mail
   - Partner Login mit must_change_password Check
   - Passwort ändern
   - Objekt-Zugriff verwalten
   ============================================================ */

const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');
const { sign } = require('../utils/jwt');

// E-Mail Service (Resend)
let Resend;
let resend;
try {
  Resend = require('resend').Resend;
  resend = new Resend(process.env.RESEND_API_KEY);
} catch (e) {
  console.log('⚠️ Resend nicht installiert - E-Mails werden nicht gesendet');
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@trap-map.de';
const APP_URL = process.env.APP_URL || 'https://trap-map.de';

// ============================================
// E-MAIL SENDEN
// ============================================
async function sendPartnerWelcomeEmail(partner, password, organisationName) {
  if (!resend) {
    console.log('⚠️ E-Mail Service nicht verfügbar');
    return false;
  }

  try {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
    .credentials { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .credential-row { display: flex; margin: 10px 0; }
    .credential-label { font-weight: 600; width: 100px; color: #64748b; }
    .credential-value { font-family: monospace; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; }
    .btn { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin-top: 20px; }
    .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🪤 TrapMap</h1>
      <p>Partner-Zugang aktiviert</p>
    </div>
    <div class="content">
      <p>Hallo <strong>${partner.name}</strong>,</p>
      
      <p>Ihr Partner-Zugang für <strong>${organisationName}</strong> wurde eingerichtet.</p>
      
      <div class="credentials">
        <h3 style="margin-top: 0;">Ihre Zugangsdaten</h3>
        <div class="credential-row">
          <span class="credential-label">E-Mail:</span>
          <span class="credential-value">${partner.email}</span>
        </div>
        <div class="credential-row">
          <span class="credential-label">Passwort:</span>
          <span class="credential-value">${password}</span>
        </div>
      </div>
      
      <div class="warning">
        <strong>⚠️ Wichtig:</strong> Bitte ändern Sie Ihr Passwort nach dem ersten Login!
      </div>
      
      <p>Mit Ihrem Partner-Zugang können Sie:</p>
      <ul>
        <li>Zugewiesene Objekte einsehen</li>
        <li>QR-Codes scannen und Kontrollen durchführen</li>
        <li>Berichte einsehen</li>
      </ul>
      
      <a href="${APP_URL}/partner/login" class="btn">Jetzt anmelden →</a>
      
      <div class="footer">
        <p>TrapMap - Professionelle Schädlingsüberwachung</p>
        <p>Bei Fragen wenden Sie sich an Ihren Ansprechpartner bei ${organisationName}.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: partner.email,
      subject: `TrapMap Partner-Zugang: Ihre Zugangsdaten`,
      html
    });

    console.log(`✅ Partner Welcome-Email gesendet an: ${partner.email}`);
    return true;
  } catch (err) {
    console.error('❌ E-Mail Fehler:', err);
    return false;
  }
}

// ============================================
// PARTNER ERSTELLEN
// ============================================
exports.createPartner = async (organisationId, partnerData, sendEmail = true) => {
  const { email, password, name, company, phone, objectIds } = partnerData;

  // Prüfe ob E-Mail bereits existiert
  const { data: existing } = await supabase
    .from('partners')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (existing) {
    throw new Error('Diese E-Mail wird bereits verwendet');
  }

  // Passwort hashen
  const password_hash = await bcrypt.hash(password, 10);

  // Partner erstellen mit must_change_password = true
  const { data: partner, error } = await supabase
    .from('partners')
    .insert({
      organisation_id: parseInt(organisationId),
      email: email.toLowerCase(),
      password_hash,
      name,
      company: company || null,
      phone: phone || null,
      is_active: true,
      must_change_password: true
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Objekt-Zuordnungen erstellen
  if (objectIds && objectIds.length > 0) {
    const assignments = objectIds.map(objectId => ({
      partner_id: partner.id,
      object_id: parseInt(objectId),
      can_scan: true,
      can_view_reports: true
    }));

    await supabase.from('partner_objects').insert(assignments);
  }

  // Organisation Name holen für E-Mail
  let organisationName = 'TrapMap';
  if (sendEmail) {
    const { data: org } = await supabase
      .from('organisations')
      .select('name')
      .eq('id', organisationId)
      .single();
    
    if (org) organisationName = org.name;
    
    // Welcome E-Mail senden (mit Klartext-Passwort!)
    await sendPartnerWelcomeEmail(partner, password, organisationName);
  }

  delete partner.password_hash;
  return partner;
};

// ============================================
// PARTNER LOGIN
// ============================================
exports.loginPartner = async (email, password) => {
  const { data: partner, error } = await supabase
    .from('partners')
    .select('*, organisations(id, name)')
    .eq('email', email.toLowerCase())
    .eq('is_active', true)
    .maybeSingle();

  if (error || !partner) {
    throw new Error('Ungültige Anmeldedaten');
  }

  const validPassword = await bcrypt.compare(password, partner.password_hash);
  if (!validPassword) {
    throw new Error('Ungültige Anmeldedaten');
  }

  // Objekt-Zuordnungen laden
  const { data: assignments } = await supabase
    .from('partner_objects')
    .select('object_id, can_scan, can_view_reports, objects(id, name, address, city)')
    .eq('partner_id', partner.id);

  // Last login updaten
  await supabase
    .from('partners')
    .update({ last_login: new Date().toISOString() })
    .eq('id', partner.id);

  // Token erstellen
  const token = sign({
    id: partner.id,
    email: partner.email,
    name: partner.name,
    company: partner.company,
    organisation_id: partner.organisation_id,
    type: 'partner',
    objectIds: assignments?.map(a => a.object_id) || []
  });

  return {
    token,
    partner: {
      id: partner.id,
      email: partner.email,
      name: partner.name,
      company: partner.company,
      organisation: partner.organisations,
      must_change_password: partner.must_change_password || false,
      objects: assignments?.map(a => ({
        ...a.objects,
        can_scan: a.can_scan,
        can_view_reports: a.can_view_reports
      })) || []
    }
  };
};

// ============================================
// PARTNER PASSWORT ÄNDERN
// ============================================
exports.changePartnerPassword = async (partnerId, currentPassword, newPassword) => {
  // Partner laden
  const { data: partner, error } = await supabase
    .from('partners')
    .select('id, password_hash')
    .eq('id', partnerId)
    .single();

  if (error || !partner) {
    throw new Error('Partner nicht gefunden');
  }

  // Aktuelles Passwort prüfen
  const validPassword = await bcrypt.compare(currentPassword, partner.password_hash);
  if (!validPassword) {
    throw new Error('Aktuelles Passwort ist falsch');
  }

  // Neues Passwort hashen
  const newHash = await bcrypt.hash(newPassword, 10);

  // Passwort updaten und must_change_password auf false setzen
  const { error: updateError } = await supabase
    .from('partners')
    .update({ 
      password_hash: newHash,
      must_change_password: false 
    })
    .eq('id', partnerId);

  if (updateError) {
    throw new Error('Fehler beim Ändern des Passworts');
  }

  return { success: true };
};

// ============================================
// PARTNER OBJEKTE ABRUFEN
// ============================================
exports.getPartnerObjects = async (partnerId) => {
  const { data, error } = await supabase
    .from('partner_objects')
    .select(`
      object_id,
      can_scan,
      can_view_reports,
      objects (
        id,
        name,
        address,
        city
      )
    `)
    .eq('partner_id', partnerId);

  if (error) throw new Error(error.message);

  return data?.map(po => ({
    ...po.objects,
    can_scan: po.can_scan,
    can_view_reports: po.can_view_reports
  })) || [];
};

// ============================================
// PARTNER BOXEN ABRUFEN
// ============================================
exports.getPartnerBoxes = async (partnerId, objectId) => {
  // Prüfe ob Partner Zugriff auf das Objekt hat
  const { data: access } = await supabase
    .from('partner_objects')
    .select('object_id')
    .eq('partner_id', partnerId)
    .eq('object_id', parseInt(objectId))
    .maybeSingle();

  if (!access) {
    throw new Error('Kein Zugriff auf dieses Objekt');
  }

  // Boxen laden
  const { data: boxes, error } = await supabase
    .from('boxes')
    .select(`
      id,
      name,
      description,
      qr_code,
      status,
      latitude,
      longitude,
      floor,
      room,
      last_scan,
      next_check,
      box_types (id, name, icon, color)
    `)
    .eq('object_id', parseInt(objectId))
    .order('name');

  if (error) throw new Error(error.message);

  return boxes || [];
};

// ============================================
// PARTNER SCAN DURCHFÜHREN
// ============================================
exports.recordPartnerScan = async (partnerId, boxId, scanData) => {
  const { status, notes, findings } = scanData;

  // Box laden und prüfen ob Partner Zugriff hat
  const { data: box } = await supabase
    .from('boxes')
    .select('id, object_id, name')
    .eq('id', parseInt(boxId))
    .single();

  if (!box) {
    throw new Error('Box nicht gefunden');
  }

  // Zugriffsprüfung
  const { data: access } = await supabase
    .from('partner_objects')
    .select('can_scan')
    .eq('partner_id', partnerId)
    .eq('object_id', box.object_id)
    .maybeSingle();

  if (!access || !access.can_scan) {
    throw new Error('Keine Scan-Berechtigung für diese Box');
  }

  // Scan erstellen
  const { data: scan, error } = await supabase
    .from('scans')
    .insert({
      box_id: parseInt(boxId),
      scanned_by_partner: partnerId,
      scanner_type: 'partner',
      status: status || 'ok',
      notes: notes || null,
      findings: findings || null,
      scanned_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Box-Status updaten
  await supabase
    .from('boxes')
    .update({
      status: status || 'ok',
      last_scan: new Date().toISOString()
    })
    .eq('id', parseInt(boxId));

  return scan;
};

// ============================================
// PARTNER BY ORGANISATION
// ============================================
exports.getPartnersByOrganisation = async (organisationId) => {
  const { data, error } = await supabase
    .from('partners')
    .select(`
      id,
      email,
      name,
      company,
      phone,
      is_active,
      must_change_password,
      last_login,
      created_at,
      partner_objects (
        object_id,
        objects (id, name)
      )
    `)
    .eq('organisation_id', parseInt(organisationId))
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data?.map(p => ({
    ...p,
    objects: p.partner_objects?.map(po => po.objects) || []
  })) || [];
};

// ============================================
// PARTNER AKTUALISIEREN
// ============================================
exports.updatePartner = async (partnerId, organisationId, updateData) => {
  const { name, company, phone, is_active, objectIds, password } = updateData;

  // Prüfe ob Partner zur Organisation gehört
  const { data: existing } = await supabase
    .from('partners')
    .select('id')
    .eq('id', partnerId)
    .eq('organisation_id', parseInt(organisationId))
    .single();

  if (!existing) {
    throw new Error('Partner nicht gefunden');
  }

  // Update-Daten vorbereiten
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (company !== undefined) updates.company = company;
  if (phone !== undefined) updates.phone = phone;
  if (is_active !== undefined) updates.is_active = is_active;
  if (password) {
    updates.password_hash = await bcrypt.hash(password, 10);
    updates.must_change_password = true;
  }

  // Partner updaten
  const { data: partner, error } = await supabase
    .from('partners')
    .update(updates)
    .eq('id', partnerId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Objekt-Zuordnungen aktualisieren wenn angegeben
  if (objectIds !== undefined) {
    // Alte Zuordnungen löschen
    await supabase
      .from('partner_objects')
      .delete()
      .eq('partner_id', partnerId);

    // Neue Zuordnungen erstellen
    if (objectIds.length > 0) {
      const assignments = objectIds.map(objectId => ({
        partner_id: partnerId,
        object_id: parseInt(objectId),
        can_scan: true,
        can_view_reports: true
      }));

      await supabase.from('partner_objects').insert(assignments);
    }
  }

  delete partner.password_hash;
  return partner;
};

// ============================================
// PARTNER LÖSCHEN
// ============================================
exports.deletePartner = async (partnerId, organisationId) => {
  // Prüfe ob Partner zur Organisation gehört
  const { data: existing } = await supabase
    .from('partners')
    .select('id')
    .eq('id', partnerId)
    .eq('organisation_id', parseInt(organisationId))
    .single();

  if (!existing) {
    throw new Error('Partner nicht gefunden');
  }

  // Partner löschen (cascade löscht partner_objects automatisch)
  const { error } = await supabase
    .from('partners')
    .delete()
    .eq('id', partnerId);

  if (error) throw new Error(error.message);

  return { success: true };
};