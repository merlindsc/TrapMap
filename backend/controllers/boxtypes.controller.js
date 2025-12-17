/* ============================================================
   TRAPMAP - BOXTYPES CONTROLLER
   API-Endpunkte für Box-Typen
   
   Pfad: backend/src/controllers/boxtypes.controller.js
   ============================================================ */

const { supabase } = require("../config/supabase");

// GET /api/boxtypes - Alle Box-Typen der Organisation
exports.getAll = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    
    // Box-Typen aus der Datenbank laden
    const { data, error } = await supabase
      .from("box_types")
      .select("*")
      .or(`organisation_id.eq.${orgId},organisation_id.is.null`) // Org-spezifische + globale Typen
      .order("name");
    
    if (error) {
      console.error("BoxTypes laden fehlgeschlagen:", error);
      return res.status(500).json({ error: error.message });
    }
    
    res.json(data || []);
    
  } catch (err) {
    console.error("BoxTypes Controller Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/boxtypes/:id - Einzelner Box-Typ
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from("box_types")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) {
      return res.status(404).json({ error: "Box-Typ nicht gefunden" });
    }
    
    res.json(data);
    
  } catch (err) {
    console.error("BoxType getById Error:", err);
    res.status(500).json({ error: err.message });
  }
};