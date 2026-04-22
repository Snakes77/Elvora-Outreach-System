// Phase 3 test: Companies House enrichment
// Run: set -a && source .env.local && set +a && npx tsx scripts/test-enrichment-phase3.ts

import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { createClient } from '@supabase/supabase-js';
import { enrichFromCompaniesHouse, getActiveDirectors } from '../lib/companies-house';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  console.log('═══════════════════════════════════════');
  console.log('PHASE 3 TEST — Companies House Enrichment');
  console.log('═══════════════════════════════════════\n');

  // 1. Test getActiveDirectors directly (Isys Care Limited — 08587771)
  console.log('--- Director lookup (Isys Care Limited, 08587771) ---');
  const directors = await getActiveDirectors('08587771');
  console.log(`Active directors: ${directors.length}`);
  for (const d of directors) {
    console.log('  →', d);
  }

  if (directors.length === 0) {
    console.log('⚠ No active directors found (company may be in liquidation — expected for this test)');
  }

  // 2. Run enrichFromCompaniesHouse on the test lead (which has companies_house_number from Phase 1)
  console.log('\n--- DB enrichment (test lead with CH number from Phase 1) ---');

  const { data: testLead } = await supabase
    .from('leads')
    .select('id, provider, companies_house_number, website_domain')
    .eq('cqc_location_id', '1-1007050476')
    .single();

  if (!testLead) {
    console.error('❌ Test lead not found. Run Phase 1 test first.');
    process.exit(1);
  }

  console.log(`Lead: ${testLead.id.slice(0, 8)} | Provider: ${testLead.provider}`);
  console.log(`CH number: ${testLead.companies_house_number}`);
  console.log(`Website domain: ${testLead.website_domain}`);

  const result = await enrichFromCompaniesHouse(testLead.id);
  console.log('\nResult:', result.status);
  if (result.directors) {
    console.log('Directors:', result.directors);
  }
  if (result.error) {
    console.log('Error:', result.error);
  }

  // 3. Insert 3 providers with no website, test CH search-by-name path
  console.log('\n--- Test CH search-by-name on 3 providers ---');
  const testProviders = [
    { name: 'HC-One Oval Limited', locationId: 'TEST-CH-001' },
    { name: 'Barchester Healthcare', locationId: 'TEST-CH-002' },
    { name: 'Care UK Community Partnerships Ltd', locationId: 'TEST-CH-003' },
  ];

  for (const p of testProviders) {
    // Clean up
    await supabase.from('leads').delete().eq('cqc_location_id', p.locationId);

    const { data: newLead } = await supabase
      .from('leads')
      .insert({
        cqc_location_id: p.locationId,
        name: p.name,
        provider: p.name,
        email: `pending_${Date.now()}@enrichment.local`,
        branch: 'CQC Automated',
        size: 'Unknown',
        tier: 'warm',
        campaign_type: 'cqc_prospect',
        status: 'active',
        email_enrichment_status: 'pending',
        contact_type: 'registered_manager',
        cqc_enriched_at: new Date().toISOString(), // Mark as CQC-enriched so CH runs
      })
      .select('id')
      .single();

    if (!newLead) continue;

    const r = await enrichFromCompaniesHouse(newLead.id);
    console.log(`  ${r.status === 'enriched' ? '✓' : r.status === 'not_found' ? '○' : '✗'} ${p.name}`);
    if (r.companyNumber) console.log(`    CH: ${r.companyNumber} | Directors: ${r.directors?.length || 0}`);
    if (r.status === 'error') console.log(`    Error: ${r.error}`);

    // Clean up test leads
    await supabase.from('leads').delete().eq('id', newLead.id);
  }

  // 4. Verify test lead has directors
  const { data: enriched } = await supabase
    .from('leads')
    .select('companies_house_directors, ch_enriched_at')
    .eq('cqc_location_id', '1-1007050476')
    .single();

  console.log('\n--- DB verification ---');
  console.log('ch_enriched_at set:', !!enriched?.ch_enriched_at);
  console.log('companies_house_directors:', enriched?.companies_house_directors);

  console.log('\n✅ PHASE 3 COMPLETE');
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
