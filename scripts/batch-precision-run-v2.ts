
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const SNIPER_TARGETS_BATCH_2 = [
  {
    name: 'Althorp Grange',
    manager: 'Sunderjit Singh Bhullar',
    manager_email: 'sunderjit.bhullar@smhc.uk.com',
    status: 'Inadequate'
  },
  {
    name: 'Willow Brook House',
    manager: 'Tendai Masunda',
    manager_email: 'tendai.masunda@smhc.uk.com',
    status: 'Inadequate'
  },
  {
    name: 'Dane View Care Home',
    manager: 'Rebecca Thompson',
    manager_email: 'rebecca.thompson@bayswoodcare.co.uk',
    status: 'Requires Improvement'
  },
  {
    name: 'The Gables',
    manager: 'Jayne Hollins',
    manager_email: 'jayne@gableshome.co.uk',
    status: 'Inadequate'
  }
];

async function runBatch() {
  console.log('🚀 Starting Precision Sniper Batch Update (Batch 2)...');

  for (const target of SNIPER_TARGETS_BATCH_2) {
    console.log(`\n🎯 Processing: ${target.name} (${target.status})`);
    
    const updateData: any = { 
      email: target.manager_email,
      registered_manager: target.manager,
      email_enrichment_status: 'complete',
      email_confidence: 100,
      anymail_checked_at: new Date().toISOString(),
      note: `Sniper Verified: Cluster ${target.status}`
    };

    const { data: lead, error: findError } = await supabase
      .from('leads')
      .update(updateData)
      .ilike('name', `%${target.name}%`)
      .select();

    if (findError) {
      console.error(`❌ Error updating ${target.name}:`, findError.message);
      continue;
    }

    if (!lead || lead.length === 0) {
      console.warn(`⚠️ Lead not found in database for: ${target.name}`);
      continue;
    }

    console.log(`✅ Success! Updated ${target.name} with ${target.manager_email}`);
  }

  console.log('\n✨ Batch 2 Complete. Scaling to HC-One Cluster next.');
}

runBatch().catch(console.error);
