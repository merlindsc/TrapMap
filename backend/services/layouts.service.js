// ============================================
// LAYOUTS SERVICE (Optimiert für neue API-Struktur)
// ============================================

const { supabase } = require("../config/supabase");

/** --------------------------------------------------
 * GET ALL LAYOUTS OF OBJECT
 * --------------------------------------------------*/
const getAll = async (objectId, organisationId) => {
  try {
    // Check object ownership
    const { data: object } = await supabase
      .from("objects")
      .select("id")
      .eq("id", objectId)
      .eq("organisation_id", organisationId)
      .single();

    if (!object) {
      return {
        success: false,
        statusCode: 404,
        message: "Object not found or access denied",
      };
    }

    const { data, error } = await supabase
      .from("layouts")
      .select("*")
      .eq("object_id", objectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get layouts error:", error);
      return { success: false, message: "Failed to fetch layouts" };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error("Get layouts service error:", err);
    return { success: false, message: "Failed to fetch layouts" };
  }
};

/** --------------------------------------------------
 * GET ONE LAYOUT (with boxes, zones, pins, labels)
 * --------------------------------------------------*/
const getOne = async (id, organisationId) => {
  try {
    const { data: layout, error } = await supabase
      .from("layouts")
      .select(`
        *,
        object:objects!inner(id, organisation_id, name)
      `)
      .eq("id", id)
      .eq("object.organisation_id", organisationId)
      .single();

    if (!layout || error) {
      return {
        success: false,
        statusCode: 404,
        message: "Layout not found",
      };
    }

    // Fetch all layout-linked elements
    const [{ data: boxes }, { data: zones }, { data: pins }, { data: labels }] =
      await Promise.all([
        supabase.from("boxes").select("*").eq("layout_id", id),
        supabase.from("zones").select("*").eq("layout_id", id),
        supabase.from("pins").select("*").eq("layout_id", id),
        supabase.from("labels").select("*").eq("layout_id", id),
      ]);

    return {
      success: true,
      data: {
        ...layout,
        boxes: boxes || [],
        zones: zones || [],
        pins: pins || [],
        labels: labels || [],
      },
    };
  } catch (error) {
    console.error("Get layout service error:", error);
    return { success: false, message: "Failed to fetch layout" };
  }
};

/** --------------------------------------------------
 * CREATE LAYOUT
 * --------------------------------------------------*/
const create = async (layoutData, organisationId) => {
  try {
    // Verify object belongs to organisation
    const { data: object } = await supabase
      .from("objects")
      .select("id")
      .eq("id", layoutData.object_id)
      .eq("organisation_id", organisationId)
      .single();

    if (!object) {
      return {
        success: false,
        statusCode: 403,
        message: "Object not found or access denied",
      };
    }

    // Ensure max 10 layouts per object
    const { count } = await supabase
      .from("layouts")
      .select("id", { count: "exact" })
      .eq("object_id", layoutData.object_id);

    if (count >= 10) {
      return {
        success: false,
        statusCode: 400,
        message: "Maximale Anzahl von 10 Lageplänen erreicht",
      };
    }

    const { data, error } = await supabase
      .from("layouts")
      .insert({
        object_id: layoutData.object_id,
        name: layoutData.name,
        image_url: layoutData.image_url,
        width: layoutData.width,
        height: layoutData.height,
        rotation: layoutData.rotation || 0,
        scale: layoutData.scale || 1.0,
        description: layoutData.description || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Create layout error:", error);
      return { success: false, message: "Failed to create layout" };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Create layout service error:", error);
    return { success: false, message: "Failed to create layout" };
  }
};

/** --------------------------------------------------
 * UPDATE LAYOUT
 * --------------------------------------------------*/
const update = async (id, organisationId, updates) => {
  try {
    const existing = await getOne(id, organisationId);
    if (!existing.success) return existing;

    const { data, error } = await supabase
      .from("layouts")
      .update({
        name: updates.name,
        image_url: updates.image_url,
        width: updates.width,
        height: updates.height,
        rotation: updates.rotation,
        scale: updates.scale,
        description: updates.description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update layout error:", error);
      return { success: false, message: "Failed to update layout" };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Update layout service error:", error);
    return { success: false, message: "Failed to update layout" };
  }
};

/** --------------------------------------------------
 * DELETE LAYOUT
 * --------------------------------------------------*/
const remove = async (id, organisationId) => {
  try {
    const existing = await getOne(id, organisationId);
    if (!existing.success) return existing;

    const { error } = await supabase
      .from("layouts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete layout error:", error);
      return { success: false, message: "Failed to delete layout" };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete layout service error:", error);
    return { success: false, message: "Failed to delete layout" };
  }
};

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
};
