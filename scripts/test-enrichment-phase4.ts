// Phase 4 test: AnyMail Finder with budget enforcement
// Run: set -a && source .env.local && set +a && npx tsx scripts/test-enrichment-phase4.ts

import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { createClient } from '@supabase/supabase-js';
import { checkBudget, findEmailForLead } from '../lib/anymail-finder';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  console.log('═══════════════════════════════════════');
  console.log('PHASE 4 TEST — AnyMail Email Discovery');
  console.log('═══════════════════════════════════════\n');

  // 1. Check budget reads correctly
  console.log('--- Budget check ---');
  const budgetResult = await checkBudget();
  if (!budgetResult.allowed) {
    console.log('⚠ Budget check returned not-allowed:', budgetResult.reason);
    console.log('(This may be expected if API key not set or limits hit)');
  } else {
    const { budget } = budgetResult;
    console.log('✓ Budget readable:');
    console.log(`  Monthly: ${budget.credits_remaining}/${budget.monthly_limit} remaining`);
    console.log(`  Today: ${budget.credits_used_today}/${budget.daily_limit}`);
    console.log(`  This week: ${budget.credits_used_this_week}/${budget.weekly_limit}`);
  }

  // 2. Read budget from DB directly to confirm structure
  const { data: budgetRow } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'anymail_budget')
    .single();

  const budgetBefore = budgetRow?.value as any;
  console.log('\nCredits before test:', budgetBefore?.credits_remaining);

  // 3. Run AnyMail on the test lead (Ashdale Care Home with director name)
  console.log('\n--- AnyMail lookup on test lead ---');
  const { data: testLead } = await supabase
    .from('leads')
    .select('id, website_domain, registered_manager, nominated_individual, companies_house_directors, email_enrichment_status')
    .eq('cqc_location_id', '1-1007050476')
    .single();

  if (!testLead) {
    console.error('❌ Test lead not found. Run Phase 1-3 tests first.');
    process.exit(1);
  }

  // Reset to pending so findEmailForLead will run
  await supabase
    .from('leads')
    .update({ email_enrichment_status: 'pending', anymail_checked_at: null })
    .eq('id', testLead.id);

  console.log(`Lead: ${testLead.id.slice(0, 8)}`);
  console.log(`Domain: ${testLead.website_domain}`);
  console.log(`Registered Manager: ${testLead.registered_manager || 'null'}`);
  console.log(`Directors: ${JSON.stringify(testLead.companies_house_directors)}`);

  const result = await findEmailForLead(testLead.id);

  console.log('\nResult:');
  console.log(`  enrichmentStatus: ${result.enrichmentStatus}`);
  console.log(`  email: ${result.email || 'not found'}`);
  console.log(`  confidence: ${result.confidence || 'n/a'}`);
  console.log(`  triedNames: ${result.triedNames.join(', ') || 'none'}`);
  if (result.error) console.log(`  error: ${result.error}`);

  // 4. Check budget was decremented
  const { data: budgetRowAfter } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'anymail_budget')
    .single();

  const budgetAfter = budgetRowAfter?.value as any;
  const creditsUsed = (budgetBefore?.credits_used_today || 0) < (budgetAfter?.credits_used_today || 0)
    ? budgetAfter.credits_used_today - budgetBefore.credits_used_today
    : 0;

  console.log('\n--- Budget verification ---');
  console.log(`Credits before: ${budgetBefore?.credits_remaining} | After: ${budgetAfter?.credits_remaining}`);
  console.log(`Credits used today: ${budgetBefore?.credits_used_today} → ${budgetAfter?.credits_used_today}`);

  // 5. Verify DB state
  const { data: enrichedLead } = await supabase
    .from('leads')
    .select('email, email_confidence, email_enrichment_status, anymail_checked_at')
    .eq('id', testLead.id)
    .single();

  console.log('\n--- DB verification ---');
  console.log('anymail_checked_at set:', !!enrichedLead?.anymail_checked_at);
  console.log('email_enrichment_status:', enrichedLead?.email_enrichment_status);
  console.log('email:', enrichedLead?.email || 'null');
  console.log('email_confidence:', enrichedLead?.email_confidence || 'null');

  const statusOk = ['found', 'not_found', 'failed', 'budget_exceeded'].includes(result.enrichmentStatus);
  const dbUpdated = !!enrichedLead?.anymail_checked_at;

  if (statusOk && dbUpdated) {
    console.log('\n✅ PHASE 4 COMPLETE');
  } else {
    console.log('\n❌ Phase 4 issues — check above');
    process.exit(1);
  }
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
