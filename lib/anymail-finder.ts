import { supabaseAdmin } from './supabase-admin';

const ANYMAIL_API_KEY = process.env.ANYMAIL_API_KEY || '';
const ANYMAIL_BUDGET_KEY = 'anymail_budget';
const MIN_CONFIDENCE = 70;

// ─────────────────────────────────────────────────────────────────────────────
// Budget enforcement
// ─────────────────────────────────────────────────────────────────────────────

interface AnyMailBudget {
  monthly_limit: number;
  weekly_limit: number;
  daily_limit: number;
  credits_remaining: number;
  credits_used_today: number;
  credits_used_this_week: number;
  reset_date: string;
}

async function readBudget(): Promise<AnyMailBudget | null> {
  const { data, error } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', ANYMAIL_BUDGET_KEY)
    .single();

  if (error || !data) {
    console.error('[anymail-finder] Failed to read budget from system_config:', error?.message);
    return null;
  }

  return data.value as AnyMailBudget;
}

async function decrementBudget(budget: AnyMailBudget): Promise<void> {
  const updated: AnyMailBudget = {
    ...budget,
    credits_remaining: budget.credits_remaining - 1,
    credits_used_today: budget.credits_used_today + 1,
    credits_used_this_week: budget.credits_used_this_week + 1,
  };

  const { error } = await supabaseAdmin
    .from('system_config')
    .update({ value: updated })
    .eq('key', ANYMAIL_BUDGET_KEY);

  if (error) {
    console.error('[anymail-finder] Failed to update budget:', error.message);
  }
}

export type BudgetCheckResult =
  | { allowed: true; budget: AnyMailBudget }
  | { allowed: false; reason: string };

export async function checkBudget(): Promise<BudgetCheckResult> {
  if (!ANYMAIL_API_KEY) {
    return { allowed: false, reason: 'ANYMAIL_API_KEY not set' };
  }

  const budget = await readBudget();
  if (!budget) {
    return { allowed: false, reason: 'Could not read anymail_budget from system_config' };
  }

  if (budget.credits_remaining <= 0) {
    return { allowed: false, reason: `No credits remaining (${budget.credits_remaining})` };
  }
  if (budget.credits_used_today >= budget.daily_limit) {
    return {
      allowed: false,
      reason: `Daily limit reached (${budget.credits_used_today}/${budget.daily_limit})`,
    };
  }
  if (budget.credits_used_this_week >= budget.weekly_limit) {
    return {
      allowed: false,
      reason: `Weekly limit reached (${budget.credits_used_this_week}/${budget.weekly_limit})`,
    };
  }

  return { allowed: true, budget };
}

// ─────────────────────────────────────────────────────────────────────────────
// AnyMail Finder API call
// ─────────────────────────────────────────────────────────────────────────────

interface AnyMailResponse {
  email: string | null;
  email_class?: string;
  alternatives?: Array<{ email: string; email_class: string }>;
  company_domain?: string;
  status?: string;
}

interface AnyMailLookupResult {
  email: string | null;
  confidence: number | null;
  status: 'found' | 'not_found' | 'error';
  source?: string;
}

async function callAnyMail(
  fullName: string,
  domain: string
): Promise<AnyMailLookupResult> {
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const payload: Record<string, string> = {
    domain,
    first_name: firstName,
    last_name: lastName,
  };

  try {
    const res = await fetch('https://api.anymailfinder.com/v5.0/search/person.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': ANYMAIL_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // AnyMail returns 404 with {"error":"no_result"} when no email found — that is not_found, not an error
      if (res.status === 404) {
        return { email: null, confidence: null, status: 'not_found' };
      }
      const body = await res.text();
      console.error('[anymail-finder] API error:', res.status, body);
      return { email: null, confidence: null, status: 'error' };
    }

    const data: AnyMailResponse = await res.json();

    if (data.email) {
      // Map email_class to a numeric confidence score
      const classMap: Record<string, number> = {
        verified: 95,
        high_confidence: 85,
        medium_confidence: 70,
        low_confidence: 50,
        pattern_matched: 75,
      };
      const confidence = classMap[data.email_class || ''] ?? 60;
      return { email: data.email, confidence, status: 'found', source: data.email_class };
    }

    // Try first alternative if primary not found
    if (data.alternatives && data.alternatives.length > 0) {
      const alt = data.alternatives[0];
      const classMap: Record<string, number> = {
        verified: 95,
        high_confidence: 85,
        medium_confidence: 70,
        low_confidence: 50,
        pattern_matched: 75,
      };
      const confidence = classMap[alt.email_class] ?? 55;
      if (confidence >= MIN_CONFIDENCE) {
        return { email: alt.email, confidence, status: 'found', source: `alternative:${alt.email_class}` };
      }
    }

    return { email: null, confidence: null, status: 'not_found' };

  } catch (err: any) {
    console.error('[anymail-finder] Fetch error:', err.message);
    return { email: null, confidence: null, status: 'error' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main: find email for a single lead
// ─────────────────────────────────────────────────────────────────────────────

export interface LeadEmailResult {
  leadId: string;
  email: string | null;
  confidence: number | null;
  enrichmentStatus: 'found' | 'not_found' | 'failed' | 'skipped' | 'budget_exceeded';
  triedNames: string[];
  error?: string;
}

export async function findEmailForLead(leadId: string): Promise<LeadEmailResult> {
  // 1. Read lead
  const { data: lead, error: leadError } = await supabaseAdmin
    .from('leads')
    .select(
      'id, website_domain, registered_manager, nominated_individual, companies_house_directors, email_enrichment_status, anymail_checked_at'
    )
    .eq('id', leadId)
    .single();

  if (leadError || !lead) {
    return { leadId, email: null, confidence: null, enrichmentStatus: 'failed', triedNames: [], error: 'Lead not found' };
  }

  // Skip if already checked
  if (lead.anymail_checked_at && lead.email_enrichment_status !== 'pending') {
    return { leadId, email: null, confidence: null, enrichmentStatus: 'skipped', triedNames: [] };
  }

  if (!lead.website_domain) {
    return { leadId, email: null, confidence: null, enrichmentStatus: 'skipped', triedNames: [], error: 'No website_domain' };
  }

  // 2. Check budget BEFORE any API call
  const budgetCheck = await checkBudget();
  if (!budgetCheck.allowed) {
    console.warn(`[anymail-finder] Budget exceeded: ${budgetCheck.reason}`);
    return { leadId, email: null, confidence: null, enrichmentStatus: 'budget_exceeded', triedNames: [] };
  }
  let { budget } = budgetCheck as { budget: AnyMailBudget };

  // 3. Build ordered list of names to try
  const directors: string[] = Array.isArray(lead.companies_house_directors)
    ? lead.companies_house_directors
    : [];

  const namesToTry: string[] = [
    lead.registered_manager,
    lead.nominated_individual,
    ...directors,
  ].filter((n): n is string => !!n && n.trim().length > 0);

  if (namesToTry.length === 0) {
    await supabaseAdmin
      .from('leads')
      .update({
        email_enrichment_status: 'not_found',
        anymail_checked_at: new Date().toISOString(),
      })
      .eq('id', leadId);
    return { leadId, email: null, confidence: null, enrichmentStatus: 'not_found', triedNames: [] };
  }

  const triedNames: string[] = [];
  let foundEmail: string | null = null;
  let foundConfidence: number | null = null;
  let finalStatus: 'found' | 'not_found' | 'failed' = 'not_found';

  // 4. Try each name against the domain
  for (const name of namesToTry) {
    // Check budget before each call
    const check = await checkBudget();
    if (!check.allowed) {
      console.warn(`[anymail-finder] Budget hit mid-batch: ${check.reason}`);
      break;
    }
    budget = (check as { budget: AnyMailBudget }).budget;

    triedNames.push(name);
    const result = await callAnyMail(name, lead.website_domain);

    // Decrement budget regardless of outcome (API call was made)
    await decrementBudget(budget);
    // Refresh budget reference
    const refreshed = await readBudget();
    if (refreshed) budget = refreshed;

    if (result.status === 'found' && result.confidence !== null && result.confidence >= MIN_CONFIDENCE) {
      foundEmail = result.email;
      foundConfidence = result.confidence;
      finalStatus = 'found';
      break;
    } else if (result.status === 'error') {
      // True API/network error — stop trying more names
      finalStatus = 'failed';
      break;
    }
    // status === 'not_found' → continue to next name

    // Brief pause between attempts
    await new Promise(r => setTimeout(r, 500));
  }

  // 5. Update lead
  const updates: Record<string, any> = {
    email_enrichment_status: finalStatus,
    anymail_checked_at: new Date().toISOString(),
  };
  if (foundEmail) {
    updates.email = foundEmail;
    updates.email_confidence = foundConfidence;
  }

  await supabaseAdmin.from('leads').update(updates).eq('id', leadId);

  return {
    leadId,
    email: foundEmail,
    confidence: foundConfidence,
    enrichmentStatus: finalStatus,
    triedNames,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch: process leads ready for AnyMail
// ─────────────────────────────────────────────────────────────────────────────

export interface AnyMailBatchResult {
  total: number;
  found: number;
  notFound: number;
  skipped: number;
  budgetExceeded: boolean;
  creditsUsed: number;
  results: LeadEmailResult[];
}

export async function runAnyMailBatch(limit?: number): Promise<AnyMailBatchResult> {
  // Determine how many we can process today
  const budgetCheck = await checkBudget();
  if (!budgetCheck.allowed) {
    console.warn(`[anymail-finder] Batch blocked: ${budgetCheck.reason}`);
    return {
      total: 0, found: 0, notFound: 0, skipped: 0, budgetExceeded: true, creditsUsed: 0, results: [],
    };
  }

  const { budget } = budgetCheck as { budget: AnyMailBudget };
  const remaining = Math.min(
    budget.daily_limit - budget.credits_used_today,
    budget.weekly_limit - budget.credits_used_this_week,
    budget.credits_remaining
  );
  const batchSize = Math.min(limit ?? remaining, remaining);

  if (batchSize <= 0) {
    return {
      total: 0, found: 0, notFound: 0, skipped: 0, budgetExceeded: true, creditsUsed: 0, results: [],
    };
  }

  // Leads ready for AnyMail: CQC-enriched, have a domain, email still pending
  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('id')
    .eq('email_enrichment_status', 'pending')
    .not('website_domain', 'is', null)
    .not('cqc_enriched_at', 'is', null)
    .limit(batchSize);

  if (error) throw new Error(`Failed to fetch AnyMail-pending leads: ${error.message}`);
  if (!leads || leads.length === 0) {
    console.log('[anymail-finder] No leads ready for email enrichment.');
    return {
      total: 0, found: 0, notFound: 0, skipped: 0, budgetExceeded: false, creditsUsed: 0, results: [],
    };
  }

  console.log(`[anymail-finder] Processing ${leads.length} lead(s) for email enrichment...`);

  const budgetBefore = await readBudget();
  const results: LeadEmailResult[] = [];

  for (const lead of leads) {
    const result = await findEmailForLead(lead.id);
    results.push(result);
    if (result.enrichmentStatus === 'budget_exceeded') break;
    await new Promise(r => setTimeout(r, 300));
  }

  const budgetAfter = await readBudget();
  const creditsUsed = budgetBefore && budgetAfter
    ? budgetBefore.credits_used_today - budgetAfter.credits_used_today < 0
      ? budgetAfter.credits_used_today - budgetBefore.credits_used_today
      : 0
    : 0;

  return {
    total: leads.length,
    found: results.filter(r => r.enrichmentStatus === 'found').length,
    notFound: results.filter(r => r.enrichmentStatus === 'not_found').length,
    skipped: results.filter(r => r.enrichmentStatus === 'skipped' || r.enrichmentStatus === 'failed').length,
    budgetExceeded: results.some(r => r.enrichmentStatus === 'budget_exceeded'),
    creditsUsed,
    results,
  };
}
