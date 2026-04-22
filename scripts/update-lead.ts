import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase-admin';

async function updateLead(name: string, field: string, value: any) {
  console.log(`[update-lead] Updating ${name}: ${field} = ${value}`);
  
  const { data, error } = await supabaseAdmin
    .from('leads')
    .update({ [field]: value })
    .ilike('name', `%${name}%`);

  if (error) {
    console.error('[update-lead] Error:', error);
  } else {
    console.log('[update-lead] Success!');
  }
}

const name = process.argv[2];
const field = process.argv[3];
const value = process.argv[4];

if (name && field && value) {
  updateLead(name, field, value);
} else {
  console.log('Usage: npx tsx scripts/update-lead.ts <name> <field> <value>');
}
