import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getContactInfo() {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, name, website_domain, registered_manager, nominated_individual')
    .in('name', ['Knights Care (5) Limited', 'Oakview Care Home Limited', 'CareTech Community Services Limited']);

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log(JSON.stringify(leads, null, 2));
  }
}

getContactInfo();
