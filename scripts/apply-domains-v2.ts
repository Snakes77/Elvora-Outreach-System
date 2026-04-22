import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const updates = [
  { id: 'fd9dd895-dfec-4993-861c-8b209bd86770', domain: 'milewood.co.uk' },
  { id: 'b5096a61-356f-4b30-b082-8cf7333a324d', domain: 'NOT_FOUND' },
  { id: 'f05094d0-dbcc-4870-aa0c-204468c3cfba', domain: 'archangelcare.co.uk' },
  { id: 'acfebcdb-f6a9-4785-a4ef-3de98fc2b041', domain: 'osjct.co.uk' },
  { id: '38369679-fbd4-4016-8f13-3edf01bde06d', domain: 'elysiumhealthcare.co.uk' }
];

async function applyUpdates() {
  for (const update of updates) {
    console.log(`Updating lead ${update.id}...`);
    const { error } = await supabase
      .from('leads')
      .update({ 
        website_domain: update.domain === 'NOT_FOUND' ? null : update.domain,
        website_url: update.domain === 'NOT_FOUND' ? null : `https://${update.domain}`,
        note: update.domain === 'NOT_FOUND' ? 'Domain not found in manual search' : 'Domain resolved manually'
      })
      .eq('id', update.id);

    if (error) {
      console.error(`Error updating lead ${update.id}:`, error.message);
    } else {
      console.log(`✅ Success`);
    }
  }
}

applyUpdates();
