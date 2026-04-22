import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const updates = [
  { name: 'Knights Care (5) Limited', domain: 'knightscare.co.uk' },
  { name: 'Pretty 1098 Ltd', domain: 'NOT_FOUND' },
  { name: 'Oakview Care Home Limited', domain: 'oakviewcare.co.uk' },
  { name: 'CareTech Community Services Limited', domain: 'caretech-uk.com' }
];

async function applyUpdates() {
  for (const update of updates) {
    console.log(`Updating ${update.name}...`);
    const { error } = await supabase
      .from('leads')
      .update({ 
        website_domain: update.domain === 'NOT_FOUND' ? null : update.domain,
        website_url: update.domain === 'NOT_FOUND' ? null : `https://${update.domain}`,
        note: update.domain === 'NOT_FOUND' ? 'Domain not found in manual search' : 'Domain resolved manually'
      })
      .eq('name', update.name);

    if (error) {
      console.error(`Error updating ${update.name}:`, error.message);
    } else {
      console.log(`✅ Success`);
    }
  }
}

applyUpdates();
