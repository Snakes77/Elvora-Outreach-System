import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase-admin';
import { extractDomain } from '../lib/website-extractor';

/**
 * resolve-domains.ts
 * 
 * Phase 1 of the Precision Enrichment Pipeline.
 * Resolves company websites for priority leads using their provider/name and extracted postcode.
 */

function extractPostcode(address: string | null): string | null {
  if (!address) return null;
  // UK Postcode regex
  const regex = /([A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2})/i;
  const match = address.match(regex);
  return match ? match[0] : null;
}

async function resolveDomainsBatch(limit = 10) {
  console.log(`[resolve-domains] Starting batch of ${limit}...`);

  // 1. Fetch leads
  // Note: the schema uses 'overall_rating' and the value is 'Requires improvement' (lowercase i)
  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('id, name, provider, address, overall_rating')
    .in('overall_rating', ['Inadequate', 'Requires improvement'])
    .is('website_domain', null)
    .limit(limit);

  if (error) {
    console.error('[resolve-domains] Error fetching leads:', error);
    return;
  }

  if (!leads || leads.length === 0) {
    console.log('[resolve-domains] No leads found matching criteria.');
    return;
  }

  console.log(`[resolve-domains] Found ${leads.length} leads to process.`);

  for (const lead of leads) {
    const postcode = extractPostcode(lead.address);
    const searchTerm = `${lead.provider || lead.name} ${postcode || ''} official website`;
    console.log(`\n🔍 Search Target: ${lead.provider || lead.name} [Rating: ${lead.overall_rating}]`);
    console.log(`📍 Address: ${lead.address}`);
    console.log(`🔎 Postcode Extracted: ${postcode || 'None'}`);
    console.log(`📝 Recommended Search: ${searchTerm}`);
    
    // To the agent: Please resolve this lead using search_web and then run an update script.
  }
}

// If running directly
if (require.main === module) {
  const limit = parseInt(process.argv[2]) || 10;
  resolveDomainsBatch(limit);
}
