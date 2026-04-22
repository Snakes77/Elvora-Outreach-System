// Phase 2 test: Website domain extraction
// Run: set -a && source .env.local && set +a && npx tsx scripts/test-enrichment-phase2.ts

import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { extractDomain, enrichWebsiteDomains } from '../lib/website-extractor';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TEST_URLS = [
  { input: 'https://www.sunnydalecare.co.uk/about', expected: 'sunnydalecare.co.uk' },
  { input: 'http://www.ashdalecarehome.com', expected: 'ashdalecarehome.com' },
  { input: 'www.greensleeves.org.uk/care-homes/henley-house', expected: 'greensleeves.org.uk' },
  { input: 'https://myhomecare.co.uk', expected: 'myhomecare.co.uk' },
  { input: 'elvoraconsulting.co.uk/services', expected: 'elvoraconsulting.co.uk' },
];

async function run() {
  console.log('═══════════════════════════════════════');
  console.log('PHASE 2 TEST — Website Domain Extraction');
  console.log('═══════════════════════════════════════\n');

  // 1. Unit test extractDomain
  console.log('--- Unit tests ---');
  let unitPassed = 0;
  for (const { input, expected } of TEST_URLS) {
    const result = extractDomain(input);
    const pass = result === expected;
    console.log(`  ${pass ? '✓' : '✗'} ${input}`);
    console.log(`    → "${result}" ${pass ? '' : `(expected "${expected}")`}`);
    if (pass) unitPassed++;
  }
  console.log(`\n${unitPassed}/${TEST_URLS.length} unit tests passed.\n`);

  // 2. Run enrichWebsiteDomains against the DB (test lead from Phase 1)
  console.log('--- DB enrichment ---');
  const result = await enrichWebsiteDomains();
  console.log(`Total processed: ${result.total}`);
  console.log(`Extracted: ${result.extracted}`);
  console.log(`Skipped: ${result.skipped}`);

  for (const r of result.results) {
    console.log(`  ${r.status === 'extracted' ? '✓' : '○'} Lead ${r.leadId.slice(0, 8)} → ${r.domain || '(skipped)'}`);
  }

  // 3. Verify the test lead from Phase 1 has website_domain set
  const { data: leads } = await supabase
    .from('leads')
    .select('id, website_url, website_domain')
    .not('website_url', 'is', null)
    .limit(5);

  console.log('\n--- DB verification ---');
  for (const l of leads || []) {
    console.log(`  ${l.website_domain ? '✓' : '✗'} ${l.website_url} → ${l.website_domain || 'NULL'}`);
  }

  if (unitPassed === TEST_URLS.length) {
    console.log('\n✅ PHASE 2 COMPLETE');
  } else {
    console.log('\n❌ Phase 2: some unit tests failed');
    process.exit(1);
  }
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
