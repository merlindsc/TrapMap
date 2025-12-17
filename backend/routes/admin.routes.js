// ============================================
// ADMIN ROUTES - ERWEITERT
// Super-Admin Funktionen für alle Entitäten
// ============================================

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { supabase } = require("../config/supabase");
const { authenticate } = require("../middleware/auth");

// Super-Admin Check
const superAdminOnly = (req, res, next) => {
  const allowedEmails = [
    "admin@demo.trapmap.de",
    "merlin@trapmap.de",
    "hilfe@die-schaedlingsexperten.de"
  ];
  
  const isDebug = process.env.NODE_ENV !== 'production';
  
  if (isDebug) {
    console.log("🔒 Super-Admin Check:");
    console.log("  - User object:", req.user ? "Present" : "Missing");
    console.log("  - User email:", req.user?.email || "undefined");
    console.log("  - Allowed emails:", allowedEmails);
  }
  
  if (!req.user) {
    if (isDebug) console.log("❌ Super-Admin Check Failed: No user object");
    return res.status(403).json({ error: "Keine Berechtigung", message: "Benutzerinformationen fehlen" });
  }
  
  if (!req.user.email) {
    if (isDebug) console.log("❌ Super-Admin Check Failed: No email in user object");
    return res.status(403).json({ error: "Keine Berechtigung", message: "E-Mail-Adresse fehlt" });
  }
  
  if (!allowedEmails.includes(req.user.email)) {
    if (isDebug) console.log("❌ Super-Admin Check Failed: Email not in allowed list");
    return res.status(403).json({ error: "Keine Berechtigung", message: "Super-Admin Rechte erforderlich" });
  }
  
  if (isDebug) console.log("✅ Super-Admin Check Passed");
  next();
};

router.use(authenticate);
router.use(superAdminOnly);

// ============================================
// SYSTEM STATS
// ============================================
router.get("/stats", async (req, res) => {
  try {
    const [orgsRes, usersRes, objectsRes, boxesRes, scansRes] = await Promise.all([
      supabase.from("organisations").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("objects").select("id", { count: "exact", head: true }),
      supabase.from("boxes").select("id", { count: "exact", head: true }),
      supabase.from("scans").select("id", { count: "exact", head: true })
    ]);

    // Partners separat abfragen (Tabelle existiert evtl. nicht)
    let partnersCount = 0;
    try {
      const partnersRes = await supabase.from("partners").select("id", { count: "exact", head: true });
      partnersCount = partnersRes.count || 0;
    } catch (e) {
      // Tabelle existiert nicht - ignorieren
    }

    res.json({
      organisations: orgsRes.count || 0,
      users: usersRes.count || 0,
      objects: objectsRes.count || 0,
      boxes: boxesRes.count || 0,
      scans: scansRes.count || 0,
      partners: partnersCount
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ORGANISATIONEN
// ============================================

// Alle Organisationen laden
router.get("/organisations", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("organisations")
      .select("*")
      .order("id", { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Organisation erstellen
router.post("/organisations", async (req, res) => {
  try {
    const { name, address, zip, city, phone, email } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name ist erforderlich" });
    }

    const { data, error } = await supabase
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

    if (error) return res.status(400).json({ error: error.message });
    
    console.log(`✅ Organisation erstellt: ${name} (ID: ${data.id})`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Organisation aktualisieren (NEU!)
router.put("/organisations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, zip, city, phone, email } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name ist erforderlich" });
    }

    const { data, error } = await supabase
      .from("organisations")
      .update({
        name,
        address: address || null,
        zip: zip || null,
        city: city || null,
        phone: phone || null,
        email: email || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    
    console.log(`✏️ Organisation aktualisiert: ${name} (ID: ${id})`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Organisation löschen
router.delete("/organisations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Starte Organisation Löschung: ID ${id}`);

    // Erst prüfen ob Organisation existiert
    const { data: orgExists, error: checkError } = await supabase
      .from("organisations")
      .select("id, name")
      .eq("id", id)
      .single();

    if (checkError || !orgExists) {
      console.log("Organisation nicht gefunden:", checkError?.message);
      return res.status(404).json({ error: "Organisation nicht gefunden" });
    }

    console.log(`🏢 Organisation gefunden: ${orgExists.name}`);

    // Schritt 1: Alle Scans löschen
    console.log("🔄 Lösche Scans...");
    const { error: scansError, count: scansCount } = await supabase
      .from("scans")
      .delete()
      .eq("organisation_id", id);
    
    if (scansError) {
      console.error("❌ Fehler beim Löschen von Scans:", scansError.message);
      return res.status(500).json({ error: `Fehler beim Löschen von Scans: ${scansError.message}` });
    }
    console.log(`✅ ${scansCount || 0} Scans gelöscht`);

    // Schritt 2: Alle Boxen löschen
    console.log("🔄 Lösche Boxen...");
    const { error: boxesError, count: boxesCount } = await supabase
      .from("boxes")
      .delete()
      .eq("organisation_id", id);
    
    if (boxesError) {
      console.error("❌ Fehler beim Löschen von Boxen:", boxesError.message);
      return res.status(500).json({ error: `Fehler beim Löschen von Boxen: ${boxesError.message}` });
    }
    console.log(`✅ ${boxesCount || 0} Boxen gelöscht`);

    // Schritt 3: Alle Objekte löschen
    console.log("🔄 Lösche Objekte...");
    const { error: objectsError, count: objectsCount } = await supabase
      .from("objects")
      .delete()
      .eq("organisation_id", id);
    
    if (objectsError) {
      console.error("❌ Fehler beim Löschen von Objekten:", objectsError.message);
      return res.status(500).json({ error: `Fehler beim Löschen von Objekten: ${objectsError.message}` });
    }
    console.log(`✅ ${objectsCount || 0} Objekte gelöscht`);

    // Schritt 4: Alle Users löschen (außer Super-Admins)
    console.log("🔄 Lösche Benutzer...");
    const { error: usersError, count: usersCount } = await supabase
      .from("users")
      .delete()
      .eq("organisation_id", id)
      .not("email", "in", "(admin@demo.trapmap.de,merlin@trapmap.de,hilfe@die-schaedlingsexperten.de)");
    
    if (usersError) {
      console.error("❌ Fehler beim Löschen von Benutzern:", usersError.message);
      return res.status(500).json({ error: `Fehler beim Löschen von Benutzern: ${usersError.message}` });
    }
    console.log(`✅ ${usersCount || 0} Benutzer gelöscht`);

    // Schritt 5: Partner löschen (falls vorhanden)
    console.log("🔄 Lösche Partner...");
    const { error: partnersError, count: partnersCount } = await supabase
      .from("partners")
      .delete()
      .eq("organisation_id", id);
    
    if (partnersError) {
      console.error("❌ Fehler beim Löschen von Partnern:", partnersError.message);
      return res.status(500).json({ error: `Fehler beim Löschen von Partnern: ${partnersError.message}` });
    }
    console.log(`✅ ${partnersCount || 0} Partner gelöscht`);

    // Schritt 6: Organisation löschen
    console.log("🔄 Lösche Organisation...");
    const { error: orgError, count: orgCount } = await supabase
      .from("organisations")
      .delete()
      .eq("id", id);

    if (orgError) {
      console.error("❌ Fehler beim Löschen der Organisation:", orgError.message);
      return res.status(500).json({ error: `Fehler beim Löschen der Organisation: ${orgError.message}` });
    }

    if (!orgCount || orgCount === 0) {
      console.error("❌ Organisation wurde nicht gelöscht (count=0)");
      return res.status(500).json({ error: "Organisation konnte nicht gelöscht werden" });
    }

    console.log(`✅ Organisation erfolgreich gelöscht: ID ${id}, Name: ${orgExists.name}`);
    res.json({ 
      message: "Organisation und alle zugehörigen Daten wurden erfolgreich gelöscht",
      deleted: {
        organisation: orgExists.name,
        scans: scansCount || 0,
        boxes: boxesCount || 0,
        objects: objectsCount || 0,
        users: usersCount || 0,
        partners: partnersCount || 0
      }
    });
  } catch (err) {
    console.error("❌ Organisation delete catch:", err.message, err.stack);
    res.status(500).json({ error: `Unerwarteter Fehler: ${err.message}` });
  }
});

// ============================================
// BENUTZER
// ============================================

// Alle Benutzer laden (alle Organisationen)
router.get("/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select(`
        id, email, first_name, last_name, role, active, 
        organisation_id, created_at,
        organisations (name)
      `)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    
    // Organisation-Name flatten
    const users = (data || []).map(u => ({
      ...u,
      organisation_name: u.organisations?.name || null
    }));
    
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Benutzer erstellen
router.post("/users", async (req, res) => {
  try {
    const { email, password, first_name, last_name, role, organisation_id } = req.body;

    if (!email || !password || !organisation_id) {
      return res.status(400).json({ error: "E-Mail, Passwort und Organisation erforderlich" });
    }

    // Prüfen ob E-Mail bereits existiert
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: "E-Mail bereits vergeben" });
    }

    // Passwort hashen
    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("users")
      .insert({
        email: email.toLowerCase(),
        password_hash,
        first_name: first_name || null,
        last_name: last_name || null,
        role: role || "technician",
        organisation_id: parseInt(organisation_id),
        active: true,
        must_change_password: true
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    
    console.log(`✅ Benutzer erstellt: ${email}`);
    delete data.password_hash;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Benutzer aktualisieren
router.put("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, role, active, password } = req.body;

    const updates = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (role !== undefined) updates.role = role;
    if (active !== undefined) updates.active = active;
    if (password) updates.password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    
    delete data.password_hash;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Benutzer löschen
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (error) return res.status(400).json({ error: error.message });
    
    console.log(`🗑️ Benutzer gelöscht: ID ${id}`);
    res.json({ message: "Gelöscht" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// PARTNER (Externe Kunden-Zugänge)
// ============================================

// Alle Partner laden
router.get("/partners", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("partners")
      .select(`
        id, email, name, company, phone, is_active, 
        organisation_id, last_login, created_at,
        organisations (name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      // Falls Tabelle nicht existiert
      if (error.code === "42P01") {
        return res.json([]);
      }
      return res.status(400).json({ error: error.message });
    }
    
    const partners = (data || []).map(p => ({
      ...p,
      organisation_name: p.organisations?.name || null
    }));
    
    res.json(partners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Partner erstellen
router.post("/partners", async (req, res) => {
  try {
    const { email, password, name, company, phone, organisation_id } = req.body;

    if (!email || !password || !name || !organisation_id) {
      return res.status(400).json({ error: "E-Mail, Passwort, Name und Organisation erforderlich" });
    }

    // Prüfen ob E-Mail bereits existiert
    const { data: existing } = await supabase
      .from("partners")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: "E-Mail bereits vergeben" });
    }

    // Passwort hashen
    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("partners")
      .insert({
        email: email.toLowerCase(),
        password_hash,
        name,
        company: company || null,
        phone: phone || null,
        organisation_id: parseInt(organisation_id),
        is_active: true
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    
    console.log(`✅ Partner erstellt: ${name} (${email})`);
    delete data.password_hash;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Partner aktualisieren
router.put("/partners/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, company, phone, is_active, password } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (company !== undefined) updates.company = company;
    if (phone !== undefined) updates.phone = phone;
    if (is_active !== undefined) updates.is_active = is_active;
    if (password) updates.password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("partners")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    
    delete data.password_hash;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Partner löschen
router.delete("/partners/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Erst Objekt-Zuordnungen löschen
    await supabase.from("partner_objects").delete().eq("partner_id", id).catch(() => {});

    const { error } = await supabase
      .from("partners")
      .delete()
      .eq("id", id);

    if (error) return res.status(400).json({ error: error.message });
    
    console.log(`🗑️ Partner gelöscht: ID ${id}`);
    res.json({ message: "Gelöscht" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;