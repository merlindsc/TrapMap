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
// Upload image to Supabase Storage
// ========================================================
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const orgId = req.user.organisation_id;
    const file = req.file;
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext = file.originalname.split('.').pop();
    const fileName = `floorplans/${orgId}/${timestamp}-${randomStr}.${ext}`;

    console.log(`📤 Uploading floor plan image: ${fileName}`);

    // Upload to Supabase Storage
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

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('floorplans')
      .getPublicUrl(fileName);

    console.log(`✅ Floor plan uploaded: ${urlData.publicUrl}`);

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
// Also deletes image from Supabase Storage
// ========================================================
exports.delete = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { id } = req.params;
    
    // First get the floor plan to find image path
    const floorPlan = await floorPlansService.getById(id, orgId);
    
    if (floorPlan && floorPlan.image_url) {
      // Extract file path from URL
      const url = floorPlan.image_url;
      // URL format: https://xxx.supabase.co/storage/v1/object/public/floorplans/path/to/file.jpg
      const match = url.match(/\/floorplans\/(.+)$/);
      if (match) {
        const filePath = match[1];
        console.log(`🗑️ Deleting floor plan image: ${filePath}`);
        
        const { error: storageError } = await supabase.storage
          .from('floorplans')
          .remove([filePath]);
          
        if (storageError) {
          console.warn("⚠️ Could not delete image from storage:", storageError);
          // Continue anyway - don't block deletion
        } else {
          console.log("✅ Image deleted from storage");
        }
      }
    }
    
    // Delete from database
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
// PUT /api/floorplans/:id/boxes/:boxId
// Place or update box position on floor plan
// ========================================================
exports.placeBox = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { id, boxId } = req.params;
    const { pos_x, pos_y } = req.body;
    
    console.log(`📍 Placing box ${boxId} on plan ${id} at (${pos_x}, ${pos_y})`);
    
    const data = await floorPlansService.placeBox(id, boxId, pos_x, pos_y, orgId);
    res.json(data);
  } catch (err) {
    console.error("FloorPlans placeBox Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ========================================================
// POST /api/floorplans/:id/boxes
// Create new box directly on floor plan
// ========================================================
exports.createBoxOnPlan = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { id } = req.params; // floor plan id
    const { pos_x, pos_y, number, box_type_id, notes, object_id } = req.body;

    console.log(`📦 Creating box on plan ${id} at (${pos_x}, ${pos_y})`);

    // Create box in database
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

    console.log(`✅ Box ${data.number} created on floor plan`);
    res.status(201).json(data);
  } catch (err) {
    console.error("FloorPlans createBoxOnPlan Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ========================================================
// DELETE /api/floorplans/boxes/:boxId
// Remove box from floor plan (not delete, just unlink)
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