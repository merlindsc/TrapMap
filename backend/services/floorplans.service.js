// ============================================
// FLOOR PLANS SERVICE V2
// Lagepläne verwalten + Grid-Konfiguration
// ============================================

const { supabase } = require("../config/supabase");

// ============================================
// GET FLOOR PLANS BY OBJECT
// ============================================
exports.getByObjectId = async (objectId, organisationId) => {
  const { data, error } = await supabase
    .from("floor_plans")
    .select("*")
    .eq("object_id", objectId)
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("FloorPlans getByObjectId Error:", error);
    throw new Error(error.message);
  }

  return data || [];
};

// ============================================
// GET SINGLE FLOOR PLAN
// ============================================
exports.getById = async (id, organisationId) => {
  const { data, error } = await supabase
    .from("floor_plans")
    .select("*")
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .single();

  if (error) {
    console.error("FloorPlans getById Error:", error);
    throw new Error(error.message);
  }

  return data;
};

// ============================================
// CREATE FLOOR PLAN
// ============================================
exports.create = async (floorPlanData, organisationId) => {
  const insertData = {
    object_id: floorPlanData.object_id,
    organisation_id: organisationId,
    name: floorPlanData.name,
    image_url: floorPlanData.image_url,
    width: floorPlanData.width || null,
    height: floorPlanData.height || null,
    // Grid-Konfiguration (nur cols/rows - existieren sicher)
    grid_cols: floorPlanData.grid_cols || 20,
    grid_rows: floorPlanData.grid_rows || 20
  };

  console.log(`📐 Creating floor plan:`, insertData);

  const { data, error } = await supabase
    .from("floor_plans")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("FloorPlans create Error:", error);
    throw new Error(error.message);
  }

  console.log(`✅ Lageplan erstellt: ${data.name} (ID: ${data.id}) - Grid: ${data.grid_cols}x${data.grid_rows}`);
  return data;
};

// ============================================
// UPDATE FLOOR PLAN
// ============================================
exports.update = async (id, updateData, organisationId) => {
  const updateFields = {};

  // Standard-Felder
  if (updateData.name !== undefined) updateFields.name = updateData.name;
  if (updateData.image_url !== undefined) updateFields.image_url = updateData.image_url;
  if (updateData.width !== undefined) updateFields.width = updateData.width;
  if (updateData.height !== undefined) updateFields.height = updateData.height;
  
  // Grid-Spalten
  if (updateData.grid_cols !== undefined) updateFields.grid_cols = updateData.grid_cols;
  if (updateData.grid_rows !== undefined) updateFields.grid_rows = updateData.grid_rows;

  console.log(`📐 Updating floor plan ${id}:`, updateFields);

  const { data, error } = await supabase
    .from("floor_plans")
    .update(updateFields)
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) {
    console.error("FloorPlans update Error:", error);
    throw new Error(error.message);
  }

  console.log(`✅ Lageplan aktualisiert: ID ${id} - Grid: ${data.grid_cols}x${data.grid_rows}`);
  return data;
};

// ============================================
// DELETE FLOOR PLAN
// ============================================
exports.delete = async (id, organisationId) => {
  // First, unlink all boxes from this floor plan
  await supabase
    .from("boxes")
    .update({ 
      floor_plan_id: null, 
      pos_x: null, 
      pos_y: null,
      grid_position: null
    })
    .eq("floor_plan_id", id)
    .eq("organisation_id", organisationId);

  // Then delete the floor plan
  const { error } = await supabase
    .from("floor_plans")
    .delete()
    .eq("id", id)
    .eq("organisation_id", organisationId);

  if (error) {
    console.error("FloorPlans delete Error:", error);
    throw new Error(error.message);
  }

  console.log(`🗑️ Lageplan gelöscht: ID ${id}`);
  return { success: true };
};

// ============================================
// GET BOXES ON FLOOR PLAN
// ============================================
exports.getBoxesOnPlan = async (floorPlanId, organisationId) => {
  const { data, error } = await supabase
    .from("boxes")
    .select(`
      id,
      number,
      notes,
      current_status,
      pos_x,
      pos_y,
      grid_position,
      floor_plan_id,
      box_type_id,
      box_types:box_type_id (
        id,
        name,
        category
      )
    `)
    .eq("floor_plan_id", floorPlanId)
    .eq("organisation_id", organisationId)
    .eq("active", true)
    .order("number", { ascending: true });

  if (error) {
    console.error("FloorPlans getBoxesOnPlan Error:", error);
    throw new Error(error.message);
  }

  return data || [];
};

// ============================================
// GET UNPLACED BOXES
// ============================================
exports.getUnplacedBoxes = async (objectId, organisationId) => {
  const { data, error } = await supabase
    .from("boxes")
    .select(`
      id,
      number,
      notes,
      current_status,
      box_type_id,
      box_types:box_type_id (
        id,
        name,
        category
      )
    `)
    .eq("object_id", objectId)
    .eq("organisation_id", organisationId)
    .eq("active", true)
    .is("floor_plan_id", null)
    .order("number", { ascending: true });

  if (error) {
    console.error("FloorPlans getUnplacedBoxes Error:", error);
    throw new Error(error.message);
  }

  return data || [];
};

// ============================================
// PLACE BOX ON FLOOR PLAN (mit Grid-Position)
// ============================================
exports.placeBox = async (floorPlanId, boxId, posX, posY, gridPosition, organisationId) => {
  const updateData = {
    floor_plan_id: parseInt(floorPlanId),
    pos_x: parseFloat(posX),
    pos_y: parseFloat(posY),
    updated_at: new Date().toISOString()
  };

  // Grid-Position hinzufügen falls vorhanden
  if (gridPosition) {
    updateData.grid_position = gridPosition;
  }

  const { data, error } = await supabase
    .from("boxes")
    .update(updateData)
    .eq("id", parseInt(boxId))
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) {
    console.error("FloorPlans placeBox Error:", error);
    throw new Error(error.message);
  }

  console.log(`📍 Box ${boxId} auf Lageplan ${floorPlanId} platziert (${gridPosition || 'keine Grid-Position'})`);
  return data;
};

// ============================================
// REMOVE BOX FROM FLOOR PLAN
// ============================================
exports.removeBoxFromPlan = async (boxId, organisationId) => {
  const { data, error } = await supabase
    .from("boxes")
    .update({
      floor_plan_id: null,
      pos_x: null,
      pos_y: null,
      grid_position: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", parseInt(boxId))
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) {
    console.error("FloorPlans removeBoxFromPlan Error:", error);
    throw new Error(error.message);
  }

  console.log(`📤 Box ${boxId} von Lageplan entfernt`);
  return data;
};