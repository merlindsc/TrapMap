// ============================================
// ADMIN ROUTES
// Nur für Super-Admin
// ============================================

const express = require("express");
const router = express.Router();
const { supabase } = require("../config/supabase");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

// Super-Admin Check
const superAdminOnly = (req, res, next) => {
  const allowedEmails = [
    "admin@demo.trapmap.de",
    "merlin@trapmap.de",
    "hilfe@die-schaedlingsexperten.de"
  ];
  
  if (!allowedEmails.includes(req.user.email)) {
    return res.status(403).json({ error: "Keine Berechtigung" });
  }
  next();
};

router.use(authenticate);
router.use(superAdminOnly);

// Alle Organisationen laden
router.get("/organisations", asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("organisations")
    .select("*")
    .order("id", { ascending: true });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
}));

// Organisation erstellen
router.post("/organisations", asyncHandler(async (req, res) => {
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
}));

// Organisation löschen
router.delete("/organisations/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Erst alle abhängigen Daten löschen
  await supabase.from("scans").delete().eq("organisation_id", id);
  await supabase.from("boxes").delete().eq("organisation_id", id);
  await supabase.from("objects").delete().eq("organisation_id", id);
  await supabase.from("users").delete().eq("organisation_id", id);

  const { error } = await supabase
    .from("organisations")
    .delete()
    .eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  
  console.log(`🗑️ Organisation gelöscht: ID ${id}`);
  res.json({ message: "Gelöscht" });
}));

module.exports = router;