import * as cheerio from 'cheerio';

const CQC_API_BASE = process.env.CQC_API_BASE || 'https://api.service.cqc.org.uk/public/v1';

export type CQCRating = 'Outstanding' | 'Good' | 'Requires Improvement' | 'Inadequate' | 'Not Rated';

export interface CQCLocation {
  locationId: string;
  providerId: string;
  name: string;
  postalCode: string;
  onspdRegion?: string;
  onspdLocalAuthority?: string;
  region?: string;
  postalAddressRegion?: string;
  careHome?: string;
  contacts?: Array<{
    personGivenName?: string;
    personFamilyName?: string;
    personTitle?: string;
  }>;
  website?: string;
  providerName?: string;
  brandName?: string;
  postalAddressLine1?: string;
  postalAddressTownCity?: string;
  localAuthority?: string;
  type?: string;
  currentRatings?: {
    overall?: { rating?: string; reportDate?: string; keyQuestionRatings?: Array<any> };
    keyQuestions?: Array<{ name: string; rating: string }>;
  };
  relationships?: Array<{ relatedLocationId: string }>;
}

export interface EnrichmentData {
  tier: number;
  priorityScore: number;
  safe: string; // Rating string
  effective: string;
  caring: string;
  responsive: string;
  wellLed: string;
  daysSinceInspection?: number;
  isOverdue: boolean;
  notes?: string; // This holds the DEEP context scraped findings
  findings?: Record<string, string>; // Optional structured findings
}

/**
 * Fetch a list of matching locations from the CQC API.
 * The API has basic filters; we fetch and then we might need to filter further.
 */
export async function getCQCLocations(params: {
  careHome?: 'Y' | 'N';
  region?: string;
  rating?: string;
  limit?: number;
}) {
  const limit = params.limit || 50;
  // CQC API doesn't support complex querying by string rating or region natively in the simple GET /locations,
  // but we can search or paginate. We will use a fallback to just fetch IDs and then details,
  // or use the provider search. For now, let's implement a base fetch.
  // We'll pull a batch of locations.
  
  const searchParams = new URLSearchParams();
  if (params.careHome) {
    searchParams.set('careHome', params.careHome);
  }
  searchParams.set('perPage', Math.min(limit, 1000).toString());

  const response = await fetch(`${CQC_API_BASE}/locations?${searchParams.toString()}`, {
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.CQC_API_KEY || ''
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CQC locations: ${response.statusText}`);
  }

  const data = await response.json();
  const locationIds = (data.locations || []).map((l: any) => l.locationId);
  
  // We need to fetch details for each to get rating & region
  const detailedLocations: CQCLocation[] = [];
  
  // To avoid hitting rate limits, batch these or limit heavily for demo purposes.
  // Let's just do them sequentially or in small chunks.
  for (const id of locationIds) {
    if (detailedLocations.length >= limit) break;
    try {
      const detail = await getCQCLocationDetails(id);
      
      // Post-fetch filtering
      let include = true;
      if (params.region && detail.onspdRegion !== params.region) include = false;
      
      const overallRating = detail.currentRatings?.overall?.rating || 'Not Rated';
      if (params.rating) {
        if (overallRating.toLowerCase() !== params.rating.toLowerCase()) include = false;
      }

      if (include) {
        detailedLocations.push(detail);
      }
    } catch (error) {
      console.error(`Failed to fetch details for ${id}`, error);
    }
  }

  return detailedLocations;
}

/**
 * Fetch details of a specific location by ID.
 */
export async function getCQCLocationDetails(locationId: string): Promise<CQCLocation> {
  const response = await fetch(`${CQC_API_BASE}/locations/${locationId}`, {
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.CQC_API_KEY || ''
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CQC location ${locationId}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Helper to calculate the Tier from a rating and date.
 */
export function calculateTier(overallRating: string, reportDateStr?: string): { tier: number, isOverdue: boolean, days: number | undefined, priorityScore: number } {
  const overall = overallRating.toLowerCase();
  let days: number | undefined;
  
  if (reportDateStr) {
    const reportDate = new Date(reportDateStr);
    const today = new Date();
    days = Math.floor((today.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  const thresholds: Record<string, number> = {
    'outstanding': 548,
    'good': 730,
    'requires improvement': 365,
    'inadequate': 180
  };

  const overdueThreshold = thresholds[overall];
  const isOverdue = !!(overdueThreshold && days !== undefined && days > overdueThreshold && ['good', 'outstanding'].includes(overall));
  
  let tier = 0; // 0 = discard
  let priorityScore = 0;
  if (isOverdue) tier = 1;
  else if (overall === 'requires improvement') tier = 3;
  else if (overall === 'inadequate') tier = 4;

  if (tier !== 0) {
      priorityScore = tier * 10;
  }

  return { tier, isOverdue, days, priorityScore };
}

/**
 * Fetch a list of changes from the Syndication API within a timeframe
 */
export async function getCQCChanges(startTimestamp: string, endTimestamp: string): Promise<string[]> {
  const params = new URLSearchParams({
    startTimestamp,
    endTimestamp
  });
  const response = await fetch(`${CQC_API_BASE}/changes/location?${params.toString()}`, {
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.CQC_API_KEY || ''
    }
  });

  if (!response.ok) {
    if (response.status === 404) return []; // No changes
    throw new Error(`Failed to fetch CQC changes: ${response.statusText}`);
  }

  const data = await response.json();
  return data.changes || [];
}

/**
 * Fetch provider details from the API
 */
export async function getCQCProviderDetails(providerId: string): Promise<any> {
    const response = await fetch(`${CQC_API_BASE}/providers/${providerId}`, {
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.CQC_API_KEY || ''
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CQC provider ${providerId}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Scrape the CQC webpage to get deeper contextual information,
 * such as the exact text about "Well led" or "Safe".
 */
export async function scrapeCQCDetailedInspection(locationId: string): Promise<Record<string, string>> {
  const findings: Record<string, string> = {};

  try {
    // 1. Try the modern inspection summary layout
    const summaryUrl = `${CQC_API_BASE.replace('/api.cqc.org.uk/public/v1', 'https://www.cqc.org.uk')}/location/${locationId}/inspection-summary`.replace('https://api.cqc.org.uk/public/v1', 'https://www.cqc.org.uk');
    // Using simple replace just in case, but let's be explicit:
    const url = `https://www.cqc.org.uk/location/${locationId}/inspection-summary`;
    
    let response = await fetch(url);
    if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);

        let currentSection = '';
        $('*').each((i, elOrig) => {
            const el = elOrig as any;
            const tag = el.tagName;
            const text = $(el).text().trim();
            if (!text) return;

            if (tag === 'h2') {
                currentSection = ''; // Stop when we hit a new major section
            } else if (tag === 'h3' && $(el).hasClass('rating__title')) {
                const lowerTitles = text.toLowerCase();
                if (lowerTitles.includes('our current view')) currentSection = 'current_view';
                else if (lowerTitles.includes("people's experience")) currentSection = 'peoples_experience';
                else currentSection = '';
            } else if (tag === 'p' && currentSection && !$(el).hasClass('rating__value')) {
                if (!text.startsWith('Updated') && !text.startsWith('Date of assessment') && !text.startsWith('Read the latest assessment') && text.length > 50) {
                    findings[currentSection] = (findings[currentSection] || '') + ' ' + text;
                }
            }
        });

        // Trim up the values
        for (const key of Object.keys(findings)) {
            findings[key] = findings[key].trim().replace(/\s+/g, ' ');
        }
    }

    // 2. Fallback / supplement with the old layout if the modern one didn't yield much
    if (Object.keys(findings).length === 0) {
        const fallbackUrl = `https://www.cqc.org.uk/location/${locationId}`;
        const fallbackRes = await fetch(fallbackUrl);
        if (fallbackRes.ok) {
            const html = await fallbackRes.text();
            const $ = cheerio.load(html);

            $('.key-question-summary').each((_, el) => {
              const title = $(el).find('h3').text().trim().toLowerCase();
              const text = $(el).find('.summary-text').text().trim();
              if (title.includes('safe')) findings['safe'] = text;
              if (title.includes('effective')) findings['effective'] = text;
              if (title.includes('caring')) findings['caring'] = text;
              if (title.includes('responsive')) findings['responsive'] = text;
              if (title.includes('well')) findings['well_led'] = text;
            });
        }
    }
  } catch (error) {
    console.warn(`[WARN] Scraper failed for location ${locationId}:`, error);
  }

  return findings;
}
