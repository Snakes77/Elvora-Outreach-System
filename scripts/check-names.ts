import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkNames() {
  const { data: leads, count } = await supabase
    .from('leads')
    .select('id, registered_manager, nominated_individual', { count: 'exact' })
    .in('overall_rating', ['Inadequate', 'Requires improvement']);

  const withNames = leads?.filter(l => l.registered_manager || l.nominated_individual).length || 0;

  console.log(`--- Name Enrichment Status (Priority Leads) ---`);
  console.log(`Total Priority Leads: ${count}`);
  console.log(`Leads with Manager/NI Name: ${withNames}`);
}

checkNames();
