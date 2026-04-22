import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { findEmailForProvider } from '../lib/anymail';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CQC_API_BASE = 'https://api.service.cqc.org.uk/public/v1';
const CQC_API_KEY = process.env.CQC_API_KEY;

type AnymailBudget = {
    reset_date: string;
    daily_limit: number;
    weekly_limit: number;
    monthly_limit: number;
    credits_remaining: number;
    credits_used_today: number;
    credits_used_this_week: number;
};

// Cache for Provider details (Nominated Individuals) to avoid redundant API calls
const providerCache: Record<string, { name: string; email?: string }> = {};

async function getBudget(): Promise<AnymailBudget | null> {
    const { data: config } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'anymail_budget')
        .single();
    return config?.value as AnymailBudget || null;
}

async function updateBudget(used: number) {
    const budget = await getBudget();
    if (!budget) return;

    const updated = {
        ...budget,
        credits_remaining: budget.credits_remaining - used,
        credits_used_today: budget.credits_used_today + used,
        credits_used_this_week: budget.credits_used_this_week + used
    };

    await supabase
        .from('system_config')
        .update({ value: updated })
        .eq('key', 'anymail_budget');
}

async function fetchProviderNI(providerId: string): Promise<string | null> {
    if (providerCache[providerId]) return providerCache[providerId].name;

    try {
        const res = await fetch(`${CQC_API_BASE}/providers/${providerId}`, {
            headers: { 'Ocp-Apim-Subscription-Key': CQC_API_KEY!, 'Accept': 'application/json' }
        });
        const detail = await res.json();
        
        // Find NI in regulated activities
        const activity = detail.regulatedActivities?.[0];
        const ni = activity?.nominatedIndividual;
        
        if (ni) {
            const fullName = `${ni.personGivenName} ${ni.personFamilyName}`;
            providerCache[providerId] = { name: fullName };
            return fullName;
        }
    } catch (e) {
        console.error(`Failed to fetch provider ${providerId}:`, e);
    }
    return null;
}

async function syncLeadsBatch() {
    console.log('🚀 Starting Midlands Enrichment Pipeline...');

    const budget = await getBudget();
    console.log(`📊 Current Budget: ${budget?.credits_used_today}/${budget?.daily_limit} used today.`);

    // PHASE 1: CQC Metadata Enrichment (FREE)
    // We do this for a large batch to find the Poor/RI ratings
    console.log('\n--- PHASE 1: CQC Metadata Sync (Manager, NI, Ratings) ---');
    const { data: pendingMetadata, error: metaError } = await supabase
        .from('leads')
        .select('id, cqc_location_id, name')
        .is('cqc_enriched_at', null)
        .eq('campaign_type', 'midlands_export_import')
        .limit(500); // Process 500 metadata entries per run to find priority leads faster

    if (metaError) {
        console.error('Error fetching leads for metadata:', metaError.message);
    } else if (pendingMetadata && pendingMetadata.length > 0) {
        console.log(`🔍 Enriching metadata for ${pendingMetadata.length} leads...`);
        for (const lead of pendingMetadata) {
            try {
                process.stdout.write(`⏳ CQC: ${lead.name}... `);
                const detailRes = await fetch(`${CQC_API_BASE}/locations/${lead.cqc_location_id}`, {
                    headers: { 'Ocp-Apim-Subscription-Key': CQC_API_KEY!, 'Accept': 'application/json' }
                });
                const detail = await detailRes.json();

                const ratingInfo = detail.currentRatings?.overall || {};
                const keyQuestions = ratingInfo.keyQuestionRatings || [];
                const ratings = {
                    overall_rating: ratingInfo.rating || 'Not rated',
                    rating_safe: keyQuestions.find((kq: any) => kq.name === 'Safe')?.rating || 'Not rated',
                    rating_effective: keyQuestions.find((kq: any) => kq.name === 'Effective')?.rating || 'Not rated',
                    rating_caring: keyQuestions.find((kq: any) => kq.name === 'Caring')?.rating || 'Not rated',
                    rating_responsive: keyQuestions.find((kq: any) => kq.name === 'Responsive')?.rating || 'Not rated',
                    rating_well_led: keyQuestions.find((kq: any) => kq.name === 'Well-led')?.rating || 'Not rated',
                };

                const managerContact = detail.contacts?.find((c: any) => c.contactType === 'Manager' || c.personGivenName);
                const managerName = managerContact ? `${managerContact.personGivenName} ${managerContact.personFamilyName}` : null;
                const providerId = detail.providerId;
                const nominatedIndividual = providerId ? await fetchProviderNI(providerId) : null;

                await supabase.from('leads').update({
                    ...ratings,
                    registered_manager: managerName,
                    nominated_individual: nominatedIndividual,
                    last_inspection_date: ratingInfo.reportDate,
                    website_url: detail.website,
                    cqc_enriched_at: new Date().toISOString()
                }).eq('id', lead.id);

                console.log(`✅ (${ratings.overall_rating})`);
            } catch (e: any) {
                console.log(`❌ Error: ${e.message}`);
            }
        }
    } else {
        console.log('✅ All leads have CQC metadata enriched.');
    }

    // PHASE 2: AnyMailFinder Discovery (PAID)
    console.log('\n--- PHASE 2: AnyMailFinder Email Discovery ---');
    if (budget && budget.credits_used_today >= budget.daily_limit) {
        console.warn('⚠️ Daily AnyMail budget reached. Skipping discovery today.');
        return;
    }

    const { data: priorityLeads } = await supabase
        .from('leads')
        .select('*')
        .in('overall_rating', ['Inadequate', 'Requires improvement'])
        .ilike('email', 'pending-%')
        .limit(budget ? budget.daily_limit - budget.credits_used_today : 50);

    console.log(`🎯 Priority Leads Found (Poor/RI): ${priorityLeads?.length || 0}`);

    const discoveryQueue = priorityLeads || [];
    
    // If no priority leads, fill with others? (User said "focus on poor and RI for first round")
    // I will stick to JUST poor/RI for now as requested.

    let emailFoundCount = 0;
    let creditsUsedToday = budget?.credits_used_today || 0;

    for (const lead of discoveryQueue) {
        if (creditsUsedToday >= (budget?.daily_limit || 50)) break;

        try {
            process.stdout.write(`📧 Discovery: ${lead.name}... `);
            const targetName = lead.registered_manager || lead.nominated_individual;
            let domain = undefined;
            if (lead.website_url) {
                try {
                    const urlStr = lead.website_url.startsWith('http') ? lead.website_url : `https://${lead.website_url}`;
                    domain = new URL(urlStr).hostname.replace('www.', '');
                } catch (e) {
                    // Just use the name if URL is garbage
                }
            }

            if (targetName) {
                const enrichment = await findEmailForProvider(lead.name, domain, targetName);
                if (enrichment.status === 'found' && enrichment.email) {
                    await supabase.from('leads').update({
                        email: enrichment.email,
                        email_enrichment_status: 'found'
                    }).eq('id', lead.id);
                    
                    emailFoundCount++;
                    creditsUsedToday++;
                    await updateBudget(1);
                    console.log(`✅ ${enrichment.email}`);
                } else {
                    await supabase.from('leads').update({
                        email_enrichment_status: 'not_found'
                    }).eq('id', lead.id);
                    console.log(`❌ Not found`);
                }
            } else {
                console.log(`⏩ No contact name`);
            }
        } catch (e: any) {
            console.log(`❌ Error: ${e.message}`);
        }
    }

    console.log(`\n🎉 Round Complete!`);
    console.log(`- Emails Found This Round: ${emailFoundCount}`);
    console.log(`- Credits Remaining Today: ${(budget?.daily_limit || 50) - creditsUsedToday}`);
}

// Support command line arguments
const targetId = process.argv.find(arg => arg.startsWith('--location='))?.split('=')[1];
const isBatch = process.argv.includes('--batch');

if (targetId) {
    // Need to implement single sync logic if still used, but focus is --batch
    console.log('Single sync not updated yet. Use --batch.');
} else if (isBatch) {
    syncLeadsBatch().catch(err => { console.error('💥 Batch Sync Failed:', err); process.exit(1); });
} else {
    // Default to scanning for new leads (original behavior)
    console.log('No mode selected. Use --batch to enrich existing leads.');
}
