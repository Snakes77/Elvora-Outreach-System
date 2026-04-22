import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { findEmailForProvider } from '../lib/anymail';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function precisionEnrich(limit = 10) {
  console.log(`[precision-enrich] Starting sniper enrichment for ${limit} leads...`);

  // 1. Fetch target leads
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, name, website_domain, registered_manager, nominated_individual, overall_rating')
    .not('website_domain', 'is', null)
    .in('overall_rating', ['Inadequate', 'Requires improvement'])
    .is('anymail_checked_at', null)
    .limit(limit);

  if (error) {
    console.error('[precision-enrich] Error fetching leads:', error);
    return;
  }

  if (!leads || leads.length === 0) {
    console.log('[precision-enrich] No leads found matching criteria.');
    return;
  }

  console.log(`[precision-enrich] Found ${leads.length} leads to enrich.`);

  for (const lead of leads) {
    const contacts = [
      { name: lead.registered_manager, type: 'Registered Manager' },
      { name: lead.nominated_individual, type: 'Nominated Individual' }
    ].filter(c => c.name);

    if (contacts.length === 0) {
      console.log(`[precision-enrich] Skipping ${lead.name} (No contact names)`);
      continue;
    }

    console.log(`\n🏠 Home: ${lead.name} [${lead.overall_rating}]`);
    let foundEmail = null;
    let foundName = null;
    let confidence = 0;

    for (const contact of contacts) {
      console.log(`🎯 Targeting ${contact.type}: ${contact.name} @ ${lead.website_domain}`);

      const result = await findEmailForProvider(lead.name, lead.website_domain, contact.name!);

      if (result.status === 'found' && result.email) {
        console.log(`✅ Found: ${result.email} (Confidence: ${result.confidence})`);
        foundEmail = result.email;
        foundName = contact.name;
        confidence = result.confidence === 'verified' ? 100 : 70;
        break; // Stop after first success to save credits
      } else {
        console.log(`❌ Not found for ${contact.type}`);
      }
    }

    if (foundEmail) {
      await supabase.from('leads').update({
        email: foundEmail,
        email_enrichment_status: 'found',
        email_confidence: confidence,
        anymail_checked_at: new Date().toISOString(),
        note: `Enriched via AnyMail Finder sniper phase (${foundName})`
      }).eq('id', lead.id);
    } else {
      await supabase.from('leads').update({
        email_enrichment_status: 'not_found',
        anymail_checked_at: new Date().toISOString(),
        note: `AnyMail Finder sniper phase yielded no result for both RM and NI`
      }).eq('id', lead.id);
    }
  }
}

// Running
const batchLimit = parseInt(process.argv[2]) || 5;
precisionEnrich(batchLimit).catch(console.error);
