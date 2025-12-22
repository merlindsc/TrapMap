require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
  console.log('\n=== PRÜFE FOREIGN KEY CONSTRAINTS ===\n');

  // Hole alle Foreign Key Constraints für die boxes Tabelle
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'boxes';
    `
  });

  if (error) {
    console.error('Fehler:', error);
    console.log('\n⚠️ RPC funktioniert nicht, verwende direkte SQL-Abfrage...\n');
    return;
  }

  console.log('Foreign Key Constraints auf boxes Tabelle:');
  console.log(JSON.stringify(data, null, 2));
})();
