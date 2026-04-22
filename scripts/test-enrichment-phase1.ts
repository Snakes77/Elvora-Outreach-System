// Phase 1 test: CQC enrichment
// Uses Ashdale Care Home, Nottinghamshire (Inadequate) as test subject
// Run: npx tsx scripts/test-enrichment-phase1.ts

import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { createClient } from '@supabase/supabase-js';
import { enrichLeadFromCQC, enrichAllPendingLeads } from '../lib/cqc-enrichment';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TEST_LOCATION_ID = '1-1007050476'; // Ashdale Care Home, Nottinghamshire (Inadequate)

async function run() {
  console.log('═══════════════════════════════════════');
  console.log('PHASE 1 TEST — CQC Enrichment');
  console.log('═══════════════════════════════════════\n');

  // 1. Insert a test lead with the CQC location ID
  console.log(`Inserting test lead for CQC location: ${TEST_LOCATION_ID}`);

  // Clean up any existing test lead first
  await supabase.from('leads').delete().eq('cqc_location_id', TEST_LOCATION_ID);

  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert({
      cqc_location_id: TEST_LOCATION_ID,
      name: 'Test Lead',
      email: 'pending_test@enrichment.local',
      branch: 'CQC Automated',
      size: 'Unknown',
      tier: 'warm',
      campaign_type: 'cqc_prospect',
      status: 'active',
      email_enrichment_status: 'pending',
      contact_type: 'registered_manager',
    })
    .select('id')
    .single();

  if (insertError || !lead) {
    console.error('❌ Failed to insert test lead:', insertError?.message);
    process.exit(1);
  }

  console.log(`✓ Test lead created: ${lead.id}\n`);

  // 2. Run CQC enrichment on this lead
  console.log('Running enrichLeadFromCQC...');
  const result = await enrichLeadFromCQC(lead.id);

  console.log('\n=== RESULT ===');
  console.log('Status:', result.status);

  if (result.status === 'enriched' && result.fields) {
    console.log('\nFields populated:');
    const fields = result.fields;
    console.log('  provider:', fields.provider);
    console.log('  overall_rating:', fields.overall_rating);
    console.log('  rating_safe:', fields.rating_safe);
    console.log('  rating_effective:', fields.rating_effective);
    console.log('  rating_caring:', fields.rating_caring);
    console.log('  rating_responsive:', fields.rating_responsive);
    console.log('  rating_well_led:', fields.rating_well_led);
    console.log('  last_inspection_date:', fields.last_inspection_date);
    console.log('  cqc_service_type:', fields.cqc_service_type);
    console.log('  local_authority:', fields.local_authority);
    console.log('  region:', fields.region);
    console.log('  website_url:', fields.website_url);
    console.log('  companies_house_number:', fields.companies_house_number);
    console.log('  registered_manager:', fields.registered_manager);
    console.log('  nominated_individual:', fields.nominated_individual);
    console.log('  cqc_enriched_at:', fields.cqc_enriched_at);
  } else if (result.error) {
    console.log('Error:', result.error);
  }

  // 3. Verify from DB
  const { data: enriched } = await supabase
    .from('leads')
    .select('*')
    .eq('id', lead.id)
    .single();

  console.log('\n=== DB VERIFICATION ===');
  console.log('cqc_enriched_at set:', !!enriched?.cqc_enriched_at);
  console.log('overall_rating:', enriched?.overall_rating);
  console.log('website_url:', enriched?.website_url);
  console.log('companies_house_number:', enriched?.companies_house_number);

  if (result.status === 'enriched' && enriched?.cqc_enriched_at) {
    console.log('\n✅ PHASE 1 COMPLETE');
  } else {
    console.log('\n❌ Phase 1 failed — check errors above');
    process.exit(1);
  }
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
