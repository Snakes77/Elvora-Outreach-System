import { CQCLocation, getCQCLocationDetails, scrapeCQCDetailedInspection } from './cqc';

const CQC_API_BASE = process.env.CQC_API_BASE || 'https://api.service.cqc.org.uk/public/v1';

/**
 * Iterates over the entire CQC directory looking for locations in specific regions.
 * Because the CQC API doesn't support 'region' exactly in the primary search query,
 * we paginate through all Care Homes and meticulously filter them based on their exact profile.
 */
export async function getCQCLocationsByRegion(
  targetRegions: string[],
  page: number = 1,
  perPage: number = 100
): Promise<{ locations: CQCLocation[], hasMore: boolean }> {
  
  const searchParams = new URLSearchParams();
  searchParams.set('careHome', 'Y');
  searchParams.set('page', page.toString());
  searchParams.set('perPage', perPage.toString());

  const response = await fetch(`${CQC_API_BASE}/locations?${searchParams.toString()}`, {
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.CQC_API_KEY || ''
    }
  });

  if (!response.ok) {
    if (response.status === 404) return { locations: [], hasMore: false };
    throw new Error(`Failed to fetch CQC locations page ${page}: ${response.statusText}`);
  }

  const data = await response.json();
  const locationIds = (data.locations || []).map((l: any) => l.locationId);
  
  const matchedLocations: CQCLocation[] = [];

  for (const id of locationIds) {
    try {
      const detail = await getCQCLocationDetails(id);
      
      const region = detail.region || detail.postalAddressRegion || detail.onspdRegion || 'Unknown';
      
      // Strict region gating
      if (targetRegions.some(tr => region.toLowerCase().includes(tr.toLowerCase()))) {
        matchedLocations.push(detail);
      }
    } catch (error: any) {
      console.warn(`Failed to process location ${id} for regional filtering:`, error.message);
    }
  }

  return {
    locations: matchedLocations,
    hasMore: !!data.nextPageUri
  };
}

/**
 * Automatically fetches the profile and tries to scrape contextual findings
 * (e.g. why they failed exactly) for bespoke outreach.
 */
export async function deepProfileLocation(locationId: string) {
  try {
    const findings = await scrapeCQCDetailedInspection(locationId);
    return findings;
  } catch (error) {
    console.warn(`Failed to deep profile location ${locationId}:`, error);
    return {};
  }
}
