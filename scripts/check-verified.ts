import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error, count } = await supabase
    .from('leads')
    .select('name, email, registered_manager_name, nominated_individual_name, email_enrichment_status', { count: 'exact' })
    .eq('email_confidence', 100)
    .not('email', 'is', null);

  if (error) {
    console.error(error);
  } else {
    console.log(`Verified count: ${count}`);
    data.forEach(lead => console.log(`- ${lead.name}: ${lead.email} (Manager: ${lead.registered_manager_name}, Nominated: ${lead.nominated_individual_name})`));
  }
}
check();
