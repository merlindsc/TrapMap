// ============================================
// FLOOR PLANS SERVICE
// Lagepläne verwalten + Boxen platzieren
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
  const { data, error } = await supabase
    .from("floor_plans")
    .insert({
      object_id: floorPlanData.object_id,
      organisation_id: organisationId,
      name: floorPlanData.name,
      image_url: floorPlanData.image_url,
      width: floorPlanData.width || null,
      height: floorPlanData.height || null,
      // Grid-Einstellungen
      grid_mode: floorPlanData.grid_mode || 'preset',
      grid_preset: floorPlanData.grid_preset || 'medium',
      grid_cols: floorPlanData.grid_cols || 20,
      grid_rows: floorPlanData.grid_rows || 20,
      real_width_m: floorPlanData.real_width_m || null,
      real_height_m: floorPlanData.real_height_m || null,
      cell_size_m: floorPlanData.cell_size_m || null
    })
    .select()
    .single();

  if (error) {
    console.error("FloorPlans create Error:", error);
    throw new Error(error.message);
  }

  console.log(`✅ Lageplan erstellt: ${data.name} (ID: ${data.id})`);
  return data;
};

// ============================================
// UPDATE FLOOR PLAN
// ============================================
exports.update = async (id, updateData, organisationId) => {
  // Build update object dynamically
  const updateFields = {};
  
  if (updateData.name !== undefined) updateFields.name = updateData.name;
  if (updateData.image_url !== undefined) updateFields.image_url = updateData.image_url;
  if (updateData.width !== undefined) updateFields.width = updateData.width;
  if (updateData.height !== undefined) updateFields.height = updateData.height;
  
  // Grid-Einstellungen
  if (updateData.grid_mode !== undefined) updateFields.grid_mode = updateData.grid_mode;
  if (updateData.grid_preset !== undefined) updateFields.grid_preset = updateData.grid_preset;
  if (updateData.grid_cols !== undefined) updateFields.grid_cols = updateData.grid_cols;
  if (updateData.grid_rows !== undefined) updateFields.grid_rows = updateData.grid_rows;
  if (updateData.real_width_m !== undefined) updateFields.real_width_m = updateData.real_width_m;
  if (updateData.real_height_m !== undefined) updateFields.real_height_m = updateData.real_height_m;
  if (updateData.cell_size_m !== undefined) updateFields.cell_size_m = updateData.cell_size_m;

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
// Mit box_type_name als flaches Feld!
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
      control_interval_days,
      object_id,
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

  // Flatten box_type_name for frontend
  const flattenedData = (data || []).map(box => ({
    ...box,
    box_type_name: box.box_types?.name || null,
    box_type_category: box.box_types?.category || null
  }));

  return flattenedData;
};

// ============================================
// GET UNPLACED BOXES
// Mit box_type_name als flaches Feld!
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
      control_interval_days,
      object_id,
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

  // Flatten box_type_name for frontend
  const flattenedData = (data || []).map(box => ({
    ...box,
    box_type_name: box.box_types?.name || null,
    box_type_category: box.box_types?.category || null
  }));

  return flattenedData;
};

// ============================================
// PLACE BOX ON FLOOR PLAN
// ============================================
exports.placeBox = async (floorPlanId, boxId, posX, posY, gridPosition, organisationId) => {
  const updateData = {
    floor_plan_id: parseInt(floorPlanId),
    pos_x: parseFloat(posX),
    pos_y: parseFloat(posY),
    updated_at: new Date().toISOString()
  };
  
  // Grid position optional
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

  console.log(`📍 Box ${boxId} auf Lageplan ${floorPlanId} platziert`);
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