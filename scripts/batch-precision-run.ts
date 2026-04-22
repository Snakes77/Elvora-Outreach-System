
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const SNIPER_TARGETS = [
  {
    name: 'Southbank',
    manager: 'Kiain McKean',
    manager_email: 'kiain.mckean@hoopleltd.co.uk',
    nominated_individual: 'Rosemary Gummery',
    nominated_email: 'rosemary.gummery@hoopleltd.co.uk'
  },
  {
    name: 'Hen Cloud House',
    manager: 'Danyel Bromley',
    manager_email: 'danyel.bromley@boroughcare.org.uk'
  },
  {
    name: 'Wythall Residential Home',
    manager: 'Michelle Ann Essex',
    manager_email: 'michelle.essex@magnacaregroup.co.uk'
  },
  {
    name: 'Fernhill House',
    manager: 'Andrew McIntyre',
    manager_email: 'andrew.mcintyre@berkleycaregroup.co.uk'
  },
  {
    name: 'Parklands Court',
    manager: 'Rebecca Bristow',
    manager_email: 'rebecca.bristow@advinia.com'
  }
];

async function runBatch() {
  console.log('🚀 Starting Precision Sniper Batch Update (V2)...');

  for (const target of SNIPER_TARGETS) {
    console.log(`\n🎯 Processing: ${target.name}`);
    
    const updateData: any = { 
      email: target.manager_email,
      registered_manager: target.manager,
      email_enrichment_status: 'complete',
      email_confidence: 100,
      anymail_checked_at: new Date().toISOString()
    };

    if (target.nominated_individual) {
        updateData.nominated_individual = target.nominated_individual;
        updateData.nominated_individual_email = target.nominated_email;
    }

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

    console.log(`✅ Success! Updated ${target.name}`);
    console.log(`   - Manager: ${target.manager} (${target.manager_email})`);
    if (target.nominated_individual) {
        console.log(`   - Nominated Individual: ${target.nominated_individual} (${target.nominated_email})`);
    }
  }

  console.log('\n✨ Batch Complete. Your top-tier campaign leads are now enriched and ready.');
}

runBatch().catch(console.error);
