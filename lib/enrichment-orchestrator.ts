import { enrichAllPendingLeads, type EnrichAllResult } from './cqc-enrichment';
import { enrichWebsiteDomains, type DomainExtractionResult } from './website-extractor';
import { enrichAllWithCompaniesHouse, type CHEnrichmentResult } from './companies-house';
import { runAnyMailBatch, checkBudget, type AnyMailBatchResult } from './anymail-finder';
import { supabaseAdmin } from './supabase-admin';

// ─────────────────────────────────────────────────────────────────────────────
// Handle pre-existing emails (warm leads loaded before CQC pipeline)
// ─────────────────────────────────────────────────────────────────────────────

async function markPreEnrichedLeads(): Promise<number> {
  // Leads that have a real email already but are still 'pending' enrichment
  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('id, email')
    .eq('email_enrichment_status', 'pending')
    .not('email', 'is', null);

  if (error || !leads) return 0;

  // Filter to leads where email is a real address (not a pending placeholder)
  const realEmails = leads.filter(l => {
    const email = (l.email || '').trim();
    return email.length > 0 && !email.startsWith('pending_') && email.includes('@');
  });

  if (realEmails.length === 0) return 0;

  const ids = realEmails.map(l => l.id);
  await supabaseAdmin
    .from('leads')
    .update({
      email_enrichment_status: 'found',
      email_confidence: 100,
      anymail_checked_at: new Date().toISOString(),
    })
    .in('id', ids);

  console.log(`[orchestrator] Marked ${ids.length} pre-enriched lead(s) as 'found'.`);
  return ids.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full pipeline
// ─────────────────────────────────────────────────────────────────────────────

export interface PipelineReport {
  startedAt: string;
  completedAt: string;
  preEnriched: number;
  cqc: EnrichAllResult;
  websiteDomains: {
    total: number;
    extracted: number;
    skipped: number;
    results: DomainExtractionResult[];
  };
  companiesHouse: {
    total: number;
    enriched: number;
    notFound: number;
    skipped: number;
    errors: number;
    results: CHEnrichmentResult[];
  };
  anymail: AnyMailBatchResult;
  summary: {
    totalLeads: number;
    withEmail: number;
    readyToSend: number;
    missingEmail: number;
    needsManualAttention: string[];
  };
}

export async function runFullEnrichmentPipeline(): Promise<PipelineReport> {
  const startedAt = new Date().toISOString();
  console.log('[orchestrator] ━━━ Starting full enrichment pipeline ━━━');

  // 0. Mark leads that already have emails from manual import
  const preEnriched = await markPreEnrichedLeads();

  // 1. CQC enrichment (phases with cqc_location_id)
  console.log('\n[orchestrator] Phase 1: CQC enrichment...');
  const cqcResult = await enrichAllPendingLeads();
  console.log(`  → Enriched: ${cqcResult.enriched} | Not found: ${cqcResult.notFound} | Errors: ${cqcResult.errors}`);

  // 2. Website domain extraction
  console.log('\n[orchestrator] Phase 2: Website domain extraction...');
  const websiteResult = await enrichWebsiteDomains();
  console.log(`  → Extracted: ${websiteResult.extracted} | Skipped: ${websiteResult.skipped}`);

  // 3. Companies House (for leads still missing website domain)
  console.log('\n[orchestrator] Phase 3: Companies House fallback...');
  const chResult = await enrichAllWithCompaniesHouse();
  console.log(`  → Enriched: ${chResult.enriched} | Not found: ${chResult.notFound} | Skipped: ${chResult.skipped}`);

  // 4. AnyMail Finder (budget-enforced)
  console.log('\n[orchestrator] Phase 4: AnyMail email discovery...');
  const budgetCheck = await checkBudget();
  if (!budgetCheck.allowed) {
    console.warn(`  → Skipped: ${budgetCheck.reason}`);
  }
  const anymailResult = budgetCheck.allowed
    ? await runAnyMailBatch()
    : {
        total: 0, found: 0, notFound: 0, skipped: 0,
        budgetExceeded: true, creditsUsed: 0, results: [],
      };
  console.log(
    `  → Found: ${anymailResult.found} | Not found: ${anymailResult.notFound} | Credits used: ${anymailResult.creditsUsed}`
  );

  // 5. Final state summary
  const { data: allLeads } = await supabaseAdmin
    .from('leads')
    .select('id, email, email_enrichment_status, cqc_location_id, status');

  const totalLeads = allLeads?.length || 0;
  const withEmail = allLeads?.filter(l => l.email && !l.email.startsWith('pending_')).length || 0;
  const readyToSend = allLeads?.filter(
    l => l.email && !l.email.startsWith('pending_') && l.status?.toLowerCase() === 'active'
  ).length || 0;
  const missingEmail = allLeads?.filter(
    l => !l.email || l.email.startsWith('pending_')
  ).length || 0;

  // Flag any leads that couldn't be enriched and need attention
  const needsManualAttention: string[] = (allLeads || [])
    .filter(
      l =>
        l.cqc_location_id &&
        (!l.email || l.email.startsWith('pending_'))
    )
    .map(l => l.id);

  const completedAt = new Date().toISOString();
  console.log('\n[orchestrator] ━━━ Pipeline complete ━━━');
  console.log(`  Total leads: ${totalLeads}`);
  console.log(`  With email: ${withEmail}`);
  console.log(`  Ready to send: ${readyToSend}`);
  console.log(`  Missing email: ${missingEmail}`);
  if (needsManualAttention.length > 0) {
    console.log(`  Need manual attention: ${needsManualAttention.length} lead(s)`);
  }

  return {
    startedAt,
    completedAt,
    preEnriched,
    cqc: cqcResult,
    websiteDomains: websiteResult,
    companiesHouse: chResult,
    anymail: anymailResult,
    summary: {
      totalLeads,
      withEmail,
      readyToSend,
      missingEmail,
      needsManualAttention,
    },
  };
}
