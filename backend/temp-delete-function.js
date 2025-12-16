// ============================================
// DELETE DEMO REQUEST FUNCTION
// Add this to the end of demo.service.js
// ============================================

exports.deleteDemoRequest = async (requestId) => {
  const { data, error } = await supabase
    .from('demo_requests')
    .delete()
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  
  if (!data) {
    throw new Error('Demo-Anfrage nicht gefunden');
  }

  return data;
};