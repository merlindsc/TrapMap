// ============================================
// ADMIN ROUTES
// Super-Admin: Organisationen + User verwalten
// ============================================

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { supabase } = require("../config/supabase");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const { sendInvitationEmail, generateTempPassword } = require("../services/email.service");

// Super-Admin Check
const superAdminOnly = (req, res, next) => {
  const allowedEmails = [
    "admin@demo.trapmap.de",
    "merlin@trapmap.de",
    "hilfe@die-schaedlingsexperten.de"
  ];
  
  if (!req.user?.email || !allowedEmails.includes(req.user.email)) {
    return res.status(403).json({ error: "Keine Berechtigung" });
  }
  next();
};

router.use(authenticate);
router.use(superAdminOnly);

// ============================================
// ORGANISATIONEN
// ============================================

// Alle Organisationen laden
router.get("/organisations", asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("organisations")
    .select("*")
    .order("id", { ascending: true });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
}));

// Organisation + Admin-User erstellen
router.post("/organisations", asyncHandler(async (req, res) => {
  const { 
    name, address, zip, city, phone, email,
    // Admin User Daten
    adminEmail, adminFirstName, adminLastName 
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Organisationsname ist erforderlich" });
  }

  // 1. Organisation erstellen
  const { data: org, error: orgError } = await supabase
    .from("organisations")
    .insert({
      name,
      address: address || null,
      zip: zip || null,
      city: city || null,
      phone: phone || null,
      email: email || null
    })
    .select()
    .single();

  if (orgError) {
    return res.status(400).json({ error: orgError.message });
  }

  console.log(`Organisation erstellt: ${name} (ID: ${org.id})`);

  // 2. Falls Admin-User Daten angegeben, User erstellen
  let adminUser = null;
  if (adminEmail && adminFirstName && adminLastName) {
    // Prüfen ob Email schon existiert
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", adminEmail.toLowerCase())
      .single();

    if (existingUser) {
      // Organisation wieder löschen
      await supabase.from("organisations").delete().eq("id", org.id);
      return res.status(400).json({ error: `E-Mail ${adminEmail} existiert bereits` });
    }

    // Temporäres Passwort generieren
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // User erstellen
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        organisation_id: org.id,
        email: adminEmail.toLowerCase(),
        password_hash: passwordHash,
        first_name: adminFirstName,
        last_name: adminLastName,
        role: "admin",
        active: true,
        must_change_password: true
      })
      .select()
      .single();

    if (userError) {
      // Organisation wieder löschen bei Fehler
      await supabase.from("organisations").delete().eq("id", org.id);
      return res.status(400).json({ error: userError.message });
    }

    console.log(`Admin-User erstellt: ${adminEmail} (ID: ${user.id})`);

    // 3. Einladungs-Email senden
    const emailResult = await sendInvitationEmail(adminEmail, {
      name: adminFirstName,
      email: adminEmail,
      tempPassword: tempPassword,
      orgName: name
    });

    if (!emailResult.success) {
      console.error("Email konnte nicht gesendet werden:", emailResult.error);
    }

    adminUser = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      emailSent: emailResult.success
    };
  }

  res.json({
    ...org,
    adminUser
  });
}));

// Organisation löschen
router.delete("/organisations/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Erst alle abhängigen Daten löschen
  await supabase.from("scans").delete().eq("organisation_id", id);
  await supabase.from("boxes").delete().eq("organisation_id", id);
  await supabase.from("layouts").delete().eq("organisation_id", id);
  await supabase.from("objects").delete().eq("organisation_id", id);
  await supabase.from("users").delete().eq("organisation_id", id);

  const { error } = await supabase
    .from("organisations")
    .delete()
    .eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  
  console.log(`Organisation gelöscht: ID ${id}`);
  res.json({ message: "Gelöscht" });
}));

// ============================================
// BENUTZER
// ============================================

// ALLE Benutzer laden (über alle Organisationen)
router.get("/users", asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select(`
      id, email, first_name, last_name, role, active, created_at, must_change_password,
      organisation_id,
      organisations!inner(name)
    `)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  
  // Flatten org name
  const users = data.map(u => ({
    ...u,
    org_name: u.organisations?.name || null,
    organisations: undefined
  }));
  
  res.json(users);
}));

// Alle Benutzer einer Organisation laden
router.get("/organisations/:orgId/users", asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  const { data, error } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, role, active, created_at, must_change_password")
    .eq("organisation_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
}));

// Einzelnen Benutzer zu Organisation hinzufügen
router.post("/organisations/:orgId/users", asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const { email, firstName, lastName, role = "technician" } = req.body;

  if (!email || !firstName || !lastName) {
    return res.status(400).json({ error: "E-Mail, Vorname und Nachname sind erforderlich" });
  }

  // Prüfen ob Email schon existiert
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase())
    .single();

  if (existingUser) {
    return res.status(400).json({ error: `E-Mail ${email} existiert bereits` });
  }

  // Organisation holen für Email
  const { data: org } = await supabase
    .from("organisations")
    .select("name")
    .eq("id", orgId)
    .single();

  // Temporäres Passwort generieren
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  // User erstellen
  const { data: user, error } = await supabase
    .from("users")
    .insert({
      organisation_id: parseInt(orgId),
      email: email.toLowerCase(),
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      role: role,
      active: true,
      must_change_password: true
    })
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  // Einladungs-Email senden
  const emailResult = await sendInvitationEmail(email, {
    name: firstName,
    email: email,
    tempPassword: tempPassword,
    orgName: org?.name || "TrapMap"
  });

  console.log(`User erstellt: ${email} für Org ${orgId}`);

  res.json({
    ...user,
    emailSent: emailResult.success
  });
}));

// Benutzer deaktivieren/aktivieren
router.patch("/users/:userId/toggle-active", asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Aktuellen Status holen
  const { data: user } = await supabase
    .from("users")
    .select("active")
    .eq("id", userId)
    .single();

  if (!user) {
    return res.status(404).json({ error: "Benutzer nicht gefunden" });
  }

  // Status umschalten
  const { data, error } = await supabase
    .from("users")
    .update({ active: !user.active })
    .eq("id", userId)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  console.log(`User ${userId} ${data.active ? 'aktiviert' : 'deaktiviert'}`);
  res.json(data);
}));

// Benutzer löschen
router.delete("/users/:userId", asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", userId);

  if (error) return res.status(400).json({ error: error.message });

  console.log(`User gelöscht: ${userId}`);
  res.json({ message: "Gelöscht" });
}));

// Passwort zurücksetzen (neues temporäres Passwort)
router.post("/users/:userId/reset-password", asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // User holen
  const { data: user } = await supabase
    .from("users")
    .select("email, first_name, organisation_id")
    .eq("id", userId)
    .single();

  if (!user) {
    return res.status(404).json({ error: "Benutzer nicht gefunden" });
  }

  // Organisation holen
  const { data: org } = await supabase
    .from("organisations")
    .select("name")
    .eq("id", user.organisation_id)
    .single();

  // Neues Passwort generieren
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  // Passwort aktualisieren
  const { error } = await supabase
    .from("users")
    .update({ 
      password_hash: passwordHash,
      must_change_password: true 
    })
    .eq("id", userId);

  if (error) return res.status(400).json({ error: error.message });

  // Email senden
  const emailResult = await sendInvitationEmail(user.email, {
    name: user.first_name,
    email: user.email,
    tempPassword: tempPassword,
    orgName: org?.name || "TrapMap"
  });

  console.log(`Passwort zurückgesetzt für User ${userId}`);

  res.json({ 
    message: "Passwort zurückgesetzt",
    emailSent: emailResult.success 
  });
}));

module.exports = router;