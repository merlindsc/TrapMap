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
      height: floorPlanData.height || null
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
  const { data, error } = await supabase
    .from("floor_plans")
    .update({
      name: updateData.name,
      image_url: updateData.image_url,
      width: updateData.width,
      height: updateData.height
    })
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
      pos_y: null 
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
// PLACE BOX ON FLOOR PLAN
// ============================================
exports.placeBox = async (floorPlanId, boxId, posX, posY, organisationId) => {
  const { data, error } = await supabase
    .from("boxes")
    .update({
      floor_plan_id: parseInt(floorPlanId),
      pos_x: parseFloat(posX),
      pos_y: parseFloat(posY),
      updated_at: new Date().toISOString()
    })
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