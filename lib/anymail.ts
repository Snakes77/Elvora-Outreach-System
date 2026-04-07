const ANYMAIL_API_KEY = process.env.ANYMAIL_API_KEY || '';

export interface EmailEnrichmentResult {
  email: string | null;
  status: 'found' | 'not_found' | 'error';
  confidence?: string;
  source?: string;
}

/**
 * findEmailForProvider uses AnyMail Finder to locate a registered manager or 
 * primary contact email for a specific care provider.
 * 
 * @param providerName The name of the care provider (e.g., from CQC)
 * @param domain Optionally, the known website domain of the provider
 * @param managerName Optionally, the registered manager's full name if scraped
 */
export async function findEmailForProvider(
  providerName: string,
  domain?: string,
  managerName?: string
): Promise<EmailEnrichmentResult> {
  if (!ANYMAIL_API_KEY) {
    console.warn("ANYMAIL_API_KEY is not set. Skipping enrichment.");
    return { email: null, status: 'error' };
  }

  try {
    const payload: any = {};
    if (domain) payload.domain = domain;
    if (providerName && !domain) payload.company_name = providerName;
    if (managerName) payload.full_name = managerName;

    // Using the typical V5 search endpoint for AnyMail Finder
    const response = await fetch('https://api.anymailfinder.com/v5.0/search.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': ANYMAIL_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('AnyMail API returned an error:', await response.text());
      return { email: null, status: 'error' };
    }

    const data = await response.json();

    // Check if a direct match or pattern match was found
    if (data.email) {
      return {
        email: data.email,
        status: 'found',
        confidence: data.email_class, // usually 'verified', 'pattern_matched', etc.
      };
    } else if (data.alternatives && data.alternatives.length > 0) {
      // Fallback to alternatives if primary not found
      return {
        email: data.alternatives[0].email,
        status: 'found',
        confidence: 'alternative',
      };
    }

    return { email: null, status: 'not_found' };

  } catch (error) {
    console.error("Error during email enrichment with AnyMail:", error);
    return { email: null, status: 'error' };
  }
}
