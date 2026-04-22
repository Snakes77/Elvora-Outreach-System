import { supabaseAdmin } from './supabase-admin';

// ─────────────────────────────────────────────────────────────────────────────
// Domain extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the root domain from a URL, stripping protocol, www, paths, and query strings.
 * e.g. https://www.sunnydalecare.co.uk/about → sunnydalecare.co.uk
 */
export function extractDomain(websiteUrl: string): string {
  if (!websiteUrl || !websiteUrl.trim()) return '';

  let url = websiteUrl.trim();

  // Ensure the URL has a protocol so URL() can parse it
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    const parsed = new URL(url);
    let hostname = parsed.hostname.toLowerCase();
    // Strip leading www.
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    return hostname;
  } catch {
    // Fallback: strip protocol, www, and path manually
    return url
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .split('?')[0]
      .toLowerCase()
      .trim();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch: extract domains for all leads that have a website_url but no domain
// ─────────────────────────────────────────────────────────────────────────────

export interface DomainExtractionResult {
  leadId: string;
  websiteUrl: string;
  domain: string;
  status: 'extracted' | 'empty_url' | 'error';
}

export async function enrichWebsiteDomains(limit = 200): Promise<{
  total: number;
  extracted: number;
  skipped: number;
  results: DomainExtractionResult[];
}> {
  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('id, website_url')
    .not('website_url', 'is', null)
    .is('website_domain', null)
    .limit(limit);

  if (error) throw new Error(`Failed to fetch leads for domain extraction: ${error.message}`);
  if (!leads || leads.length === 0) {
    console.log('[website-extractor] No leads need domain extraction.');
    return { total: 0, extracted: 0, skipped: 0, results: [] };
  }

  console.log(`[website-extractor] Extracting domains for ${leads.length} lead(s)...`);

  const results: DomainExtractionResult[] = [];

  for (const lead of leads) {
    const url = lead.website_url?.trim();
    if (!url) {
      results.push({ leadId: lead.id, websiteUrl: '', domain: '', status: 'empty_url' });
      continue;
    }

    try {
      const domain = extractDomain(url);
      if (!domain) {
        results.push({ leadId: lead.id, websiteUrl: url, domain: '', status: 'empty_url' });
        continue;
      }

      const { error: updateError } = await supabaseAdmin
        .from('leads')
        .update({ website_domain: domain })
        .eq('id', lead.id);

      if (updateError) throw new Error(updateError.message);

      results.push({ leadId: lead.id, websiteUrl: url, domain, status: 'extracted' });
    } catch (err: any) {
      console.error(`[website-extractor] Error processing lead ${lead.id}:`, err.message);
      results.push({ leadId: lead.id, websiteUrl: url, domain: '', status: 'error' });
    }
  }

  return {
    total: leads.length,
    extracted: results.filter(r => r.status === 'extracted').length,
    skipped: results.filter(r => r.status === 'empty_url').length,
    results,
  };
}
