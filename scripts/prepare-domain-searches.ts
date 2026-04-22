import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase-admin';
import { extractDomain } from '../lib/website-extractor';

// We'll use a simple search term and pick the first result that looks like a business website.
async function searchDomain(query: string): Promise<string | null> {
  // This is a placeholder for the agent to call search_web.
  // In a real automated script, we'd need an API. 
  // Since I am the agent, I will run this script, see the search terms, 
  // and then I will perform the searches and updates.
  return null;
}

function extractPostcode(address: string | null): string | null {
  if (!address) return null;
  const regex = /([A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2})/i;
  const match = address.match(regex);
  return match ? match[0] : null;
}

async function prepareSearchTerms(limit = 50) {
  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('id, name, provider, address, overall_rating')
    .in('overall_rating', ['Inadequate', 'Requires improvement'])
    .is('website_domain', null)
    .limit(limit);

  if (error || !leads) {
    console.error('Error fetching leads:', error);
    return;
  }

  const tasks = leads.map(lead => {
    const postcode = extractPostcode(lead.address);
    const searchTerm = `${lead.provider || lead.name} ${postcode || ''} official website`;
    return {
      id: lead.id,
      name: lead.name,
      searchTerm
    };
  });

  console.log(JSON.stringify(tasks, null, 2));
}

if (require.main === module) {
  const limit = parseInt(process.argv[2]) || 10;
  prepareSearchTerms(limit);
}
