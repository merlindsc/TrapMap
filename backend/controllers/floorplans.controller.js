// ============================================
// FLOORPLANS CONTROLLER
// Lagepläne verwalten + Boxen platzieren
// ============================================

const floorPlansService = require("../services/floorplans.service");
const { supabase } = require("../config/supabase");

// ========================================================
// GET /api/floorplans/object/:objectId
// ========================================================
exports.getByObjectId = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { objectId } = req.params;
    
    const data = await floorPlansService.getByObjectId(objectId, orgId);
    res.json(data);
  } catch (err) {
    console.error("FloorPlans getByObjectId Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ========================================================
// GET /api/floorplans/:id
// ========================================================
exports.getById = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { id } = req.params;
    
    const data = await floorPlansService.getById(id, orgId);
    res.json(data);
  } catch (err) {
    console.error("FloorPlans getById Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ========================================================
// POST /api/floorplans/upload
// ========================================================
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const orgId = req.user.organisation_id;
    const file = req.file;
    
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext = file.originalname.split('.').pop();
    const fileName = `floorplans/${orgId}/${timestamp}-${randomStr}.${ext}`;

    const { data, error } = await supabase.storage
      .from('floorplans')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      console.error("Supabase Storage Error:", error);
      return res.status(500).json({ error: error.message });
    }

    const { data: urlData } = supabase.storage
      .from('floorplans')
      .getPublicUrl(fileName);

    res.json({ 
      url: urlData.publicUrl,
      path: fileName
    });
  } catch (err) {
    console.error("FloorPlans uploadImage Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ========================================================
// POST /api/floorplans
// ========================================================
exports.create = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    
    const data = await floorPlansService.create(req.body, orgId);
    res.status(201).json(data);
  } catch (err) {
    console.error("FloorPlans create Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ========================================================
// PUT /api/floorplans/:id
// ========================================================
exports.update = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { id } = req.params;
    
    const data = await floorPlansService.update(id, req.body, orgId);
    res.json(data);
  } catch (err) {
    console.error("FloorPlans update Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ========================================================
// DELETE /api/floorplans/:id
// ========================================================
exports.delete = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { id } = req.params;
    
    const floorPlan = await floorPlansService.getById(id, orgId);
    
    if (floorPlan && floorPlan.image_url) {
      const url = floorPlan.image_url;
      const match = url.match(/\/floorplans\/(.+)$/);
      if (match) {
        const filePath = match[1];
        
        const { error: storageError } = await supabase.storage
          .from('floorplans')
          .remove([filePath]);
          
        if (storageError) {
          console.warn("⚠️ Could not delete image from storage:", storageError);
        }
      }
    }
    
    await floorPlansService.delete(id, orgId);
    res.json({ success: true });
  } catch (err) {
    console.error("FloorPlans delete Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ========================================================
// GET /api/floorplans/:id/boxes
// ========================================================
exports.getBoxesOnPlan = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { id } = req.params;
    
    const data = await floorPlansService.getBoxesOnPlan(id, orgId);
    res.json(data);
  } catch (err) {
    console.error("FloorPlans getBoxesOnPlan Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ========================================================
// GET /api/floorplans/object/:objectId/unplaced
// ========================================================
exports.getUnplacedBoxes = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { objectId } = req.params;
    
    const data = await floorPlansService.getUnplacedBoxes(objectId, orgId);
    res.json(data);
  } catch (err) {
    console.error("FloorPlans getUnplacedBoxes Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ========================================================
// GET /api/floorplans/object/:objectId/gps
// ========================================================
exports.getGpsBoxes = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { objectId } = req.params;
    
    const data = await floorPlansService.getGpsBoxes(objectId, orgId);
    res.json(data);
  } catch (err) {
    console.error("FloorPlans getGpsBoxes Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ========================================================
// PUT /api/floorplans/:id/boxes/:boxId
// ========================================================
exports.placeBox = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { id, boxId } = req.params;
    const { pos_x, pos_y, grid_position } = req.body;
    
    console.log(`📍 Placing box ${boxId} on plan ${id} at (${pos_x}, ${pos_y}) grid: ${grid_position || 'none'}`);
    
    const data = await floorPlansService.placeBox(id, boxId, pos_x, pos_y, grid_position, orgId);
    res.json(data);
  } catch (err) {
    console.error("FloorPlans placeBox Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ========================================================
// POST /api/floorplans/:id/boxes
// ========================================================
exports.createBoxOnPlan = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { id } = req.params;
    const { pos_x, pos_y, grid_position, number, box_type_id, notes, object_id, control_interval_days } = req.body;

    const { data, error } = await supabase
      .from("boxes")
      .insert({
        organisation_id: orgId,
        object_id: object_id,
        floor_plan_id: parseInt(id),
        number: number,
        box_type_id: box_type_id ? parseInt(box_type_id) : null,
        notes: notes || null,
        pos_x: parseFloat(pos_x),
        pos_y: parseFloat(pos_y),
        grid_position: grid_position || null,
        control_interval_days: control_interval_days || 30,
        current_status: 'green',
        active: true
      })
      .select(`
        *,
        box_types:box_type_id (
          id,
          name,
          category
        )
      `)
      .single();

    if (error) {
      console.error("Create box error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error("FloorPlans createBoxOnPlan Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ========================================================
// DELETE /api/floorplans/boxes/:boxId
// ========================================================
exports.removeBoxFromPlan = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { boxId } = req.params;
    
    const data = await floorPlansService.removeBoxFromPlan(boxId, orgId);
    res.json(data);
  } catch (err) {
    console.error("FloorPlans removeBoxFromPlan Error:", err);
    res.status(500).json({ error: err.message });
  }
};