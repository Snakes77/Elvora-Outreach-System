import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const targetIds = [
  'fd9dd895-dfec-4993-861c-8b209bd86770',
  'f05094d0-dbcc-4870-aa0c-204468c3cfba',
  'acfebcdb-f6a9-4785-a4ef-3de98fc2b041',
  '38369679-fbd4-4016-8f13-3edf01bde06d',
  // and the ones from names (I'll just query by domain not null)
];

async function getEnrichmentTargets() {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, name, website_domain, registered_manager, nominated_individual')
    .not('website_domain', 'is', null)
    .in('overall_rating', ['Inadequate', 'Requires improvement'])
    .is('anymail_checked_at', null)
    .limit(10);

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log(JSON.stringify(leads, null, 2));
  }
}

getEnrichmentTargets();
