// Phase 5 test: Full enrichment pipeline on all 24 leads
// Run: set -a && source .env.local && set +a && npx tsx scripts/test-enrichment-phase5.ts

import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { createClient } from '@supabase/supabase-js';
import { runFullEnrichmentPipeline } from '../lib/enrichment-orchestrator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  console.log('═══════════════════════════════════════');
  console.log('PHASE 5 TEST — Full Enrichment Pipeline');
  console.log('═══════════════════════════════════════\n');

  // Snapshot before
  const { data: before } = await supabase
    .from('leads')
    .select('id, email, email_enrichment_status, cqc_location_id, status');

  console.log(`Leads before pipeline: ${before?.length || 0}`);
  console.log(`  With cqc_location_id: ${before?.filter(l => l.cqc_location_id).length || 0}`);
  console.log(`  With email: ${before?.filter(l => l.email && !l.email.startsWith('pending_')).length || 0}`);
  console.log(`  Status pending: ${before?.filter(l => l.email_enrichment_status === 'pending').length || 0}\n`);

  // Run the pipeline
  const report = await runFullEnrichmentPipeline();

  console.log('\n═══════════════════════════════════════');
  console.log('PIPELINE REPORT');
  console.log('═══════════════════════════════════════');
  console.log(`Started: ${report.startedAt}`);
  console.log(`Completed: ${report.completedAt}`);
  console.log();
  console.log('Pre-enriched (existing emails marked):    ', report.preEnriched);
  console.log('CQC enrichment:');
  console.log(`  Total:    ${report.cqc.total}`);
  console.log(`  Enriched: ${report.cqc.enriched}`);
  console.log(`  Not found: ${report.cqc.notFound}`);
  console.log(`  Errors:   ${report.cqc.errors}`);
  console.log('Website domains extracted:                ', report.websiteDomains.extracted);
  console.log('Companies House enriched:                 ', report.companiesHouse.enriched);
  console.log('AnyMail:');
  console.log(`  Found: ${report.anymail.found}`);
  console.log(`  Not found: ${report.anymail.notFound}`);
  console.log(`  Credits used: ${report.anymail.creditsUsed}`);
  console.log(`  Budget exceeded: ${report.anymail.budgetExceeded}`);
  console.log();
  console.log('FINAL SUMMARY:');
  console.log(`  Total leads:     ${report.summary.totalLeads}`);
  console.log(`  With email:      ${report.summary.withEmail}`);
  console.log(`  Ready to send:   ${report.summary.readyToSend}`);
  console.log(`  Missing email:   ${report.summary.missingEmail}`);
  if (report.summary.needsManualAttention.length > 0) {
    console.log(`  Manual attention needed: ${report.summary.needsManualAttention.length} lead(s)`);
    for (const id of report.summary.needsManualAttention) {
      const { data: l } = await supabase
        .from('leads')
        .select('id, cqc_location_id, provider')
        .eq('id', id)
        .single();
      if (l) console.log(`    - ${l.id.slice(0,8)} | ${l.provider || l.cqc_location_id}`);
    }
  }

  // Check budget after
  const { data: budgetRow } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'anymail_budget')
    .single();

  const budget = budgetRow?.value as any;
  console.log('\nAnyMail budget remaining:', budget?.credits_remaining);

  console.log('\n✅ PHASE 5 COMPLETE');
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
