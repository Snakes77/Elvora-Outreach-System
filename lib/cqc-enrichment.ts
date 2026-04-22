import { supabaseAdmin } from './supabase-admin';

const CQC_API_BASE = process.env.CQC_API_BASE || 'https://api.service.cqc.org.uk/public/v1';
const CQC_API_KEY = process.env.CQC_API_KEY || '';

const cqcHeaders = {
  'Ocp-Apim-Subscription-Key': CQC_API_KEY,
};

// ─────────────────────────────────────────────────────────────────────────────
// CQC API helpers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchCQCLocation(locationId: string): Promise<any | null> {
  const res = await fetch(`${CQC_API_BASE}/locations/${locationId}`, { headers: cqcHeaders });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`CQC location ${locationId}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchCQCProvider(providerId: string): Promise<any | null> {
  const res = await fetch(`${CQC_API_BASE}/providers/${providerId}`, { headers: cqcHeaders });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`CQC provider ${providerId}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Field extraction helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractRating(keyQuestionRatings: any[], name: string): string {
  const kq = (keyQuestionRatings || []).find(
    (q: any) => q.name?.toLowerCase() === name.toLowerCase()
  );
  return kq?.rating || 'Not rated';
}

function extractContactByRole(contacts: any[], role: string): string | null {
  if (!contacts || contacts.length === 0) return null;
  const contact = contacts.find(
    (c: any) => c.personRole?.toLowerCase().includes(role.toLowerCase())
  );
  if (!contact) return null;
  const parts = [contact.personTitle, contact.personGivenName, contact.personFamilyName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return parts || null;
}

function extractNominatedIndividual(regulatedActivities: any[]): string | null {
  for (const activity of regulatedActivities || []) {
    const ni = activity.nominatedIndividual;
    if (ni?.personGivenName && ni?.personFamilyName) {
      const parts = [ni.personTitle, ni.personGivenName, ni.personFamilyName]
        .filter(Boolean)
        .join(' ')
        .trim();
      return parts || null;
    }
  }
  return null;
}

function normaliseWebsiteUrl(website: string | undefined | null): string | null {
  if (!website) return null;
  let url = website.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main enrichment function
// ─────────────────────────────────────────────────────────────────────────────

export interface CQCEnrichmentResult {
  leadId: string;
  cqcLocationId: string;
  status: 'enriched' | 'not_found' | 'error';
  fields?: Record<string, any>;
  error?: string;
}

export async function enrichLeadFromCQC(leadId: string): Promise<CQCEnrichmentResult> {
  // 1. Read lead to get location ID
  const { data: lead, error: leadError } = await supabaseAdmin
    .from('leads')
    .select('id, cqc_location_id, provider')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) {
    return { leadId, cqcLocationId: '', status: 'error', error: 'Lead not found' };
  }

  const locationId = lead.cqc_location_id;
  if (!locationId) {
    return { leadId, cqcLocationId: '', status: 'error', error: 'No cqc_location_id on lead' };
  }

  try {
    // 2. Fetch CQC location details
    const location = await fetchCQCLocation(locationId);
    if (!location) {
      await supabaseAdmin.from('leads').update({ cqc_enriched_at: new Date().toISOString() }).eq('id', leadId);
      return { leadId, cqcLocationId: locationId, status: 'not_found' };
    }

    // 3. Fetch CQC provider (for Companies House number, NI, and provider website)
    let provider: any = null;
    if (location.providerId) {
      provider = await fetchCQCProvider(location.providerId);
    }

    // 4. Extract ratings
    const overall = location.currentRatings?.overall || {};
    const keyQuestionRatings = overall.keyQuestionRatings || [];
    const overallRating = overall.rating || 'Not rated';
    const reportDate = overall.reportDate || location.lastInspection?.date || null;

    // 5. Extract contact names (CQC public API rarely populates these but handle if present)
    const locationContacts = location.contacts || [];
    const providerContacts = provider?.contacts || [];
    const allContacts = [...locationContacts, ...providerContacts];

    const registeredManager =
      extractContactByRole(allContacts, 'Registered Manager') || null;

    const nominatedIndividual =
      extractContactByRole(allContacts, 'Nominated Individual') ||
      extractNominatedIndividual(provider?.regulatedActivities || []) ||
      null;

    // 6. Extract website (location first, then provider)
    const rawWebsite = location.website || provider?.website || null;
    const websiteUrl = normaliseWebsiteUrl(rawWebsite);

    // 7. Extract service type
    const serviceTypes: string[] = (location.gacServiceTypes || []).map((g: any) => g.name).filter(Boolean);
    const cqcServiceType = serviceTypes.join(', ') || null;

    // 8. Build update payload
    const fields: Record<string, any> = {
      provider: location.name,
      registered_manager: registeredManager,
      nominated_individual: nominatedIndividual,
      website_url: websiteUrl,
      overall_rating: overallRating,
      rating_safe: extractRating(keyQuestionRatings, 'Safe'),
      rating_effective: extractRating(keyQuestionRatings, 'Effective'),
      rating_caring: extractRating(keyQuestionRatings, 'Caring'),
      rating_responsive: extractRating(keyQuestionRatings, 'Responsive'),
      rating_well_led: extractRating(keyQuestionRatings, 'Well-led'),
      last_inspection_date: reportDate,
      cqc_service_type: cqcServiceType,
      local_authority: location.localAuthority || null,
      region: location.region || location.onspdRegion || null,
      address: [
        location.postalAddressLine1,
        location.postalAddressLine2,
        location.postalAddressTownCity,
        location.postalCode,
      ]
        .filter(Boolean)
        .join(', ') || null,
      companies_house_number: provider?.companiesHouseNumber || null,
      cqc_enriched_at: new Date().toISOString(),
    };

    // 9. Write to Supabase
    const { error: updateError } = await supabaseAdmin
      .from('leads')
      .update(fields)
      .eq('id', leadId);

    if (updateError) {
      return { leadId, cqcLocationId: locationId, status: 'error', error: updateError.message };
    }

    return { leadId, cqcLocationId: locationId, status: 'enriched', fields };

  } catch (err: any) {
    console.error(`[cqc-enrichment] Error enriching lead ${leadId}:`, err.message);
    return { leadId, cqcLocationId: locationId, status: 'error', error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch: enrich all leads that have a location ID but haven't been CQC-enriched
// ─────────────────────────────────────────────────────────────────────────────

export interface EnrichAllResult {
  total: number;
  enriched: number;
  notFound: number;
  errors: number;
  results: CQCEnrichmentResult[];
}

export async function enrichAllPendingLeads(limit = 50): Promise<EnrichAllResult> {
  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('id, cqc_location_id')
    .not('cqc_location_id', 'is', null)
    .is('cqc_enriched_at', null)
    .limit(limit);

  if (error) throw new Error(`Failed to fetch pending leads: ${error.message}`);
  if (!leads || leads.length === 0) {
    console.log('[cqc-enrichment] No pending leads to enrich.');
    return { total: 0, enriched: 0, notFound: 0, errors: 0, results: [] };
  }

  console.log(`[cqc-enrichment] Enriching ${leads.length} lead(s) from CQC...`);

  const results: CQCEnrichmentResult[] = [];
  for (const lead of leads) {
    const result = await enrichLeadFromCQC(lead.id);
    results.push(result);
    // Brief pause to respect CQC API rate limits
    await new Promise(r => setTimeout(r, 300));
  }

  return {
    total: leads.length,
    enriched: results.filter(r => r.status === 'enriched').length,
    notFound: results.filter(r => r.status === 'not_found').length,
    errors: results.filter(r => r.status === 'error').length,
    results,
  };
}
