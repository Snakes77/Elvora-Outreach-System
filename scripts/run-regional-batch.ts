import { loadEnvConfig } from '@next/env';
const projectDir = process.cwd();
loadEnvConfig(projectDir);

import { getCQCLocationsByRegion } from '../lib/cqc-regional';
import { getCQCProviderDetails, calculateTier } from '../lib/cqc';
import { getActiveDirectors } from '../lib/companies-house';
import { findEmailForProvider } from '../lib/anymail';
import { extractDomain } from '../lib/website-extractor';
import { supabaseAdmin } from '../lib/supabase-admin';

// ─────────────────────────────────────────────────────────────────────────────
// Usage:
//   npx tsx scripts/run-regional-batch.ts "East Midlands"
//   npx tsx scripts/run-regional-batch.ts "East Midlands" "Nottingham,Derby,Leicester"
//
// The second argument narrows to specific towns/cities within the region.
// Matching is against CQC postalAddressTownCity — case insensitive.
// ─────────────────────────────────────────────────────────────────────────────

interface Target {
  name: string;
  role: string; // 'Registered Manager' | 'Nominated Individual' | 'Director'
}

function normaliseRole(raw: string | undefined): string {
  if (!raw) return 'Registered Manager';
  const r = raw.toLowerCase();
  if (r.includes('nominated individual')) return 'Nominated Individual';
  if (r.includes('director')) return 'Director';
  if (r.includes('registered manager')) return 'Registered Manager';
  return raw;
}

async function run() {
  const args = process.argv.slice(2);
  const targetRegion = args[0];
  const cityArg = args[1];
  const targetCities = cityArg
    ? cityArg.split(',').map(c => c.trim().toLowerCase()).filter(Boolean)
    : [];

  if (!targetRegion) {
    console.error('Usage: npx tsx scripts/run-regional-batch.ts "East Midlands" ["Nottingham,Derby,Leicester"]');
    process.exit(1);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[BATCH] CQC Regional Ingestion`);
  console.log(`[REGION] ${targetRegion}`);
  if (targetCities.length > 0) console.log(`[CITIES] ${targetCities.join(', ')}`);
  console.log(`${'='.repeat(60)}\n`);

  const TARGET_LOCATIONS_PER_RUN = 50;
  let currentPage = 1;
  let hasMore = true;
  let processedCount = 0;
  let leadsAdded = 0;

  while (hasMore && processedCount < TARGET_LOCATIONS_PER_RUN) {
    console.log(`=> Fetching page ${currentPage} of ${targetRegion}...`);

    const { locations, hasMore: morePages } = await getCQCLocationsByRegion(
      [targetRegion],
      currentPage,
      100
    );
    hasMore = morePages;

    if (locations.length === 0) {
      console.log(`   No matches on page ${currentPage}.`);
      currentPage++;
      continue;
    }

    // City filter (optional)
    const filtered = targetCities.length === 0
      ? locations
      : locations.filter(loc => {
          const town = (loc.postalAddressTownCity || '').toLowerCase();
          const la = (loc.localAuthority || '').toLowerCase();
          return targetCities.some(c => town.includes(c) || la.includes(c));
        });

    console.log(`   ${filtered.length} of ${locations.length} locations match city filter.`);

    for (const detail of filtered) {
      if (processedCount >= TARGET_LOCATIONS_PER_RUN) break;

      const locId = detail.locationId;

      try {
        const ratingInfo = detail.currentRatings?.overall || {};
        const reportDate = ratingInfo.reportDate;
        const overallRating = ratingInfo.rating || 'Not rated';

        const { tier } = calculateTier(overallRating, reportDate);
        if (tier === 0) {
          console.log(`[SKIP] ${locId} — Tier 0 (recently rated ${overallRating})`);
          continue;
        }

        const keyQuestions = (ratingInfo as any).keyQuestionRatings || [];
        const ratings = {
          rating_safe: keyQuestions.find((kq: any) => kq.name === 'Safe')?.rating || 'Not rated',
          rating_effective: keyQuestions.find((kq: any) => kq.name === 'Effective')?.rating || 'Not rated',
          rating_caring: keyQuestions.find((kq: any) => kq.name === 'Caring')?.rating || 'Not rated',
          rating_responsive: keyQuestions.find((kq: any) => kq.name === 'Responsive')?.rating || 'Not rated',
          rating_well_led: keyQuestions.find((kq: any) => kq.name === 'Well-led')?.rating || 'Not rated',
        };

        // Collect contacts with their roles (de-duplicated by name)
        const targetMap = new Map<string, Target>();

        // Location-level contacts (usually Registered Managers)
        for (const contact of detail.contacts || []) {
          if (contact.personGivenName && contact.personFamilyName) {
            const fullName = `${contact.personGivenName} ${contact.personFamilyName}`;
            if (!targetMap.has(fullName)) {
              targetMap.set(fullName, { name: fullName, role: normaliseRole(contact.personRole) });
            }
          }
        }

        const providerName = detail.providerName || detail.brandName || detail.name || 'Unknown Provider';
        const rawWebsite = detail.website;
        const domain = rawWebsite ? extractDomain(rawWebsite) : undefined;
        let companyNumber: string | null = null;

        // Provider-level contacts and Nominated Individuals
        if (detail.providerId) {
          try {
            const provider = await getCQCProviderDetails(detail.providerId);
            companyNumber = provider.companiesHouseNumber || null;

            for (const contact of provider.contacts || []) {
              if (contact.personGivenName && contact.personFamilyName) {
                const fullName = `${contact.personGivenName} ${contact.personFamilyName}`;
                if (!targetMap.has(fullName)) {
                  targetMap.set(fullName, { name: fullName, role: normaliseRole(contact.personRole) });
                }
              }
            }

            for (const activity of provider.regulatedActivities || []) {
              const ni = activity.nominatedIndividual;
              if (ni?.personGivenName && ni?.personFamilyName) {
                const fullName = `${ni.personGivenName} ${ni.personFamilyName}`;
                if (!targetMap.has(fullName)) {
                  targetMap.set(fullName, { name: fullName, role: 'Nominated Individual' });
                }
              }
            }
          } catch {
            console.warn(`   [WARN] Could not fetch provider for ${locId}`);
          }
        }

        // Directors from Companies House
        if (companyNumber) {
          try {
            const directors = await getActiveDirectors(companyNumber);
            for (const dirName of directors) {
              if (!targetMap.has(dirName)) {
                targetMap.set(dirName, { name: dirName, role: 'Director' });
              }
            }
          } catch {
            console.warn(`   [WARN] Could not fetch CH directors for ${companyNumber}`);
          }
        }

        // Fallback if no contacts at all
        if (targetMap.size === 0) {
          targetMap.set('Registered Manager', { name: 'Registered Manager', role: 'Registered Manager' });
        }

        const address = [
          detail.postalAddressLine1,
          detail.postalAddressTownCity,
          detail.postalCode,
        ].filter(Boolean).join(', ');

        const region = detail.region || detail.postalAddressRegion || targetRegion;

        console.log(`\n[${locId}] ${providerName} — Tier ${tier} — ${overallRating}`);
        console.log(`   Contacts: ${Array.from(targetMap.values()).map(t => `${t.name} (${t.role})`).join(', ')}`);

        // Insert one lead row per target
        for (const target of targetMap.values()) {
          // Skip if already in DB for this location + name combination
          const { data: existing } = await supabaseAdmin
            .from('leads')
            .select('id')
            .eq('cqc_location_id', locId)
            .eq('name', target.name)
            .maybeSingle();

          if (existing) {
            console.log(`   [SKIP] ${target.name} already in DB`);
            continue;
          }

          // Attempt email lookup (only when we have a real name and domain)
          let enrichedEmail: string | null = null;
          const hasRealName = target.name !== 'Registered Manager';

          if (hasRealName && process.env.ANYMAIL_API_KEY && (domain || providerName)) {
            console.log(`   [ANYMAIL] Looking up ${target.name} @ ${domain || providerName}...`);
            const emailRes = await findEmailForProvider(providerName, domain, target.name);
            if (emailRes.status === 'found') {
              enrichedEmail = emailRes.email;
              console.log(`            Found: ${enrichedEmail}`);
            } else {
              console.log(`            Not found — will be picked up by enrichment pipeline`);
            }
          }

          const { error } = await supabaseAdmin.from('leads').insert({
            cqc_location_id: locId,
            name: target.name,
            contact_role: target.role,
            email: enrichedEmail,
            provider: providerName,
            address,
            region,
            branch: 'Systematic Batch',
            size: 0,
            local_authority: detail.localAuthority,
            last_inspection_date: reportDate,
            overall_rating: overallRating,
            ...ratings,
            tier,
            website_url: rawWebsite || null,
            website_domain: domain || null,
            campaign_type: 'backlog_regional_trigger',
            current_phase: 0,
            email_enrichment_status: enrichedEmail ? 'found' : 'pending',
            status: 'active',
            next_step_date: new Date().toISOString(),
          });

          if (error) {
            console.error(`   [ERROR] Insert failed for ${target.name}:`, error.message);
          } else {
            console.log(`   [OK] ${target.name} (${target.role}) → ${enrichedEmail ?? 'pending enrichment'}`);
            leadsAdded++;
          }
        }

        processedCount++;

      } catch (err: any) {
        console.error(`[ERROR] ${locId}:`, err.message);
      }

      // Throttle to respect CQC and Companies House rate limits
      await new Promise(r => setTimeout(r, 2000));
    }

    currentPage++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[DONE] Locations processed: ${processedCount}`);
  console.log(`[DONE] Leads added: ${leadsAdded}`);
  console.log(`${'='.repeat(60)}\n`);
  console.log('Next steps:');
  console.log('  1. Run enrichment:  curl -H "Authorization: Bearer $CRON_SECRET" https://<your-app>/api/cron/enrichment');
  console.log('  2. Run sequence:    curl -H "Authorization: Bearer $CRON_SECRET" https://<your-app>/api/cron/sequence');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
