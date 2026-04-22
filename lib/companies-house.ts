import { supabaseAdmin } from './supabase-admin';
import { extractDomain } from './website-extractor';

const CH_API_KEY = process.env.COMPANIES_HOUSE_API_KEY || '';
const CH_AUTH = `Basic ${Buffer.from(`${CH_API_KEY}:`).toString('base64')}`;
const CH_BASE = 'https://api.company-information.service.gov.uk';

export interface CompanyOfficer {
  name: string;
  officer_role: string;
  appointed_on: string;
  resigned_on?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Existing helper — kept for backwards compatibility
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch active directors from Companies House by company number.
 * Returns an array of formatted names (Firstname Lastname order).
 */
export async function getActiveDirectors(companyNumber: string): Promise<string[]> {
  if (!CH_API_KEY) {
    console.warn('[companies-house] COMPANIES_HOUSE_API_KEY not set.');
    return [];
  }

  try {
    const res = await fetch(
      `${CH_BASE}/company/${companyNumber}/officers?items_per_page=100`,
      { headers: { Authorization: CH_AUTH } }
    );

    if (!res.ok) {
      if (res.status === 404) return [];
      console.warn(`[companies-house] CH API returned ${res.status} for ${companyNumber}`);
      return [];
    }

    const data = await res.json();
    const items: CompanyOfficer[] = data.items || [];

    return items
      .filter(o => {
        const isDirector =
          o.officer_role === 'director' || o.officer_role === 'corporate-director';
        return isDirector && !o.resigned_on;
      })
      .map(o => {
        // CH stores as "LASTNAME, Firstname" → convert to "Firstname Lastname"
        const parts = o.name.split(',');
        return parts.length === 2
          ? `${parts[1].trim()} ${parts[0].trim()}`
          : o.name;
      });
  } catch (err: any) {
    console.error(`[companies-house] Error fetching directors for ${companyNumber}:`, err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// New: search CH by company name and return best match
// ─────────────────────────────────────────────────────────────────────────────

interface CHSearchResult {
  company_number: string;
  title: string;
  company_status: string;
  registered_office_address?: Record<string, string>;
  links?: { self: string };
}

async function searchCompanyByName(name: string): Promise<CHSearchResult | null> {
  if (!CH_API_KEY) return null;

  const res = await fetch(
    `${CH_BASE}/search/companies?q=${encodeURIComponent(name)}&items_per_page=5`,
    { headers: { Authorization: CH_AUTH } }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const items: CHSearchResult[] = data.items || [];

  if (items.length === 0) return null;

  // Prefer active companies; pick the one whose title most closely matches
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const targetNorm = normalise(name);

  const active = items.filter(i => i.company_status === 'active');
  const pool = active.length > 0 ? active : items;

  // Score by character-level overlap
  let best: CHSearchResult | null = null;
  let bestScore = -1;
  for (const item of pool) {
    const titleNorm = normalise(item.title);
    const shorter = Math.min(targetNorm.length, titleNorm.length);
    let matches = 0;
    for (let i = 0; i < shorter; i++) {
      if (targetNorm[i] === titleNorm[i]) matches++;
    }
    const score = matches / Math.max(targetNorm.length, titleNorm.length);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return best;
}

async function fetchCompanyProfile(companyNumber: string): Promise<any | null> {
  if (!CH_API_KEY) return null;
  const res = await fetch(`${CH_BASE}/company/${companyNumber}`, {
    headers: { Authorization: CH_AUTH },
  });
  if (!res.ok) return null;
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Main enrichment function
// ─────────────────────────────────────────────────────────────────────────────

export interface CHEnrichmentResult {
  leadId: string;
  status: 'enriched' | 'not_found' | 'skipped' | 'error';
  companyNumber?: string;
  directors?: string[];
  websiteDomain?: string;
  error?: string;
}

/**
 * Enriches a lead with Companies House data.
 * - If companies_house_number is already set (from CQC enrichment), uses it directly.
 * - Otherwise searches CH by provider name.
 * - Extracts directors and (if no domain yet) website domain.
 * - Sets ch_enriched_at.
 */
export async function enrichFromCompaniesHouse(leadId: string): Promise<CHEnrichmentResult> {
  if (!CH_API_KEY) {
    return { leadId, status: 'error', error: 'COMPANIES_HOUSE_API_KEY not set' };
  }

  // Read lead
  const { data: lead, error: leadError } = await supabaseAdmin
    .from('leads')
    .select('id, provider, companies_house_number, website_domain, ch_enriched_at')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) {
    return { leadId, status: 'error', error: 'Lead not found' };
  }

  if (lead.ch_enriched_at) {
    return { leadId, status: 'skipped' };
  }

  try {
    let companyNumber: string | null = lead.companies_house_number || null;
    let profile: any = null;

    // 1. If no company number, search by provider name
    if (!companyNumber && lead.provider) {
      const match = await searchCompanyByName(lead.provider);
      if (match) {
        companyNumber = match.company_number;
        console.log(`[companies-house] Found ${match.title} (${companyNumber}) for "${lead.provider}"`);
      }
    }

    if (!companyNumber) {
      await supabaseAdmin
        .from('leads')
        .update({ ch_enriched_at: new Date().toISOString() })
        .eq('id', leadId);
      return { leadId, status: 'not_found' };
    }

    // 2. Fetch company profile for website
    profile = await fetchCompanyProfile(companyNumber);

    // 3. Fetch active directors
    const directors = await getActiveDirectors(companyNumber);

    // 4. Attempt website domain from CH profile (CH rarely populates this, but try)
    let websiteDomain: string | undefined;
    const profileWebsite: string | null = (profile as any)?.website || null;
    if (!lead.website_domain && profileWebsite) {
      websiteDomain = extractDomain(profileWebsite);
    }

    // 5. Update lead
    const updates: Record<string, any> = {
      companies_house_number: companyNumber,
      companies_house_directors: directors.length > 0 ? directors : null,
      ch_enriched_at: new Date().toISOString(),
    };
    if (websiteDomain) updates.website_domain = websiteDomain;

    const { error: updateError } = await supabaseAdmin
      .from('leads')
      .update(updates)
      .eq('id', leadId);

    if (updateError) {
      return { leadId, status: 'error', error: updateError.message };
    }

    return {
      leadId,
      status: 'enriched',
      companyNumber,
      directors,
      websiteDomain,
    };

  } catch (err: any) {
    console.error(`[companies-house] Error enriching lead ${leadId}:`, err.message);
    return { leadId, status: 'error', error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch: enrich all leads where website_domain is still null after Phase 2
// ─────────────────────────────────────────────────────────────────────────────

export async function enrichAllWithCompaniesHouse(limit = 50): Promise<{
  total: number;
  enriched: number;
  notFound: number;
  skipped: number;
  errors: number;
  results: CHEnrichmentResult[];
}> {
  // Target: CQC-enriched leads that still have no website domain
  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('id')
    .not('cqc_enriched_at', 'is', null)
    .is('website_domain', null)
    .is('ch_enriched_at', null)
    .limit(limit);

  if (error) throw new Error(`Failed to fetch CH-pending leads: ${error.message}`);
  if (!leads || leads.length === 0) {
    console.log('[companies-house] No leads need CH enrichment.');
    return { total: 0, enriched: 0, notFound: 0, skipped: 0, errors: 0, results: [] };
  }

  console.log(`[companies-house] Running CH enrichment on ${leads.length} lead(s)...`);

  const results: CHEnrichmentResult[] = [];
  for (const lead of leads) {
    const result = await enrichFromCompaniesHouse(lead.id);
    results.push(result);
    await new Promise(r => setTimeout(r, 300));
  }

  return {
    total: leads.length,
    enriched: results.filter(r => r.status === 'enriched').length,
    notFound: results.filter(r => r.status === 'not_found').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    errors: results.filter(r => r.status === 'error').length,
    results,
  };
}
