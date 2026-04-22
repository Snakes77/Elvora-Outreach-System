import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCQCLocationDetails, getCQCProviderDetails, getCQCChanges, calculateTier } from '@/lib/cqc';
import { getActiveDirectors } from '@/lib/companies-house';
import { findEmailForProvider } from '@/lib/anymail';
import { extractDomain } from '@/lib/website-extractor';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('Running daily CQC changes sync (Nationwide Expansion)...');

        // 1. Determine timeframe (last 24 hours)
        const endTimestamp = new Date().toISOString().split('.')[0] + 'Z';
        const start = new Date();
        start.setDate(start.getDate() - 1);
        const startTimestamp = start.toISOString().split('.')[0] + 'Z';

        // 2. Fetch changes
        const changedLocationIds = await getCQCChanges(startTimestamp, endTimestamp);
        
        if (!changedLocationIds || changedLocationIds.length === 0) {
            return NextResponse.json({ message: 'No CQC updates in the last 24h' });
        }

        console.log(`Found ${changedLocationIds.length} location changes to investigate.`);
        const results = [];

        // 3. Process changes
        for (const locId of changedLocationIds) {
            try {
                // Fetch full location details
                const detail = await getCQCLocationDetails(locId);
                
                if (detail.type === 'Provider') {
                    console.log(`Skipping ${locId} because it is a provider`);
                    continue;
                }
                
                if (detail.careHome !== 'Y') {
                    console.log(`Skipping ${locId} (Not a Care Home)`);
                    continue;
                }
                
                // Strict Regional Targeting for organic updates
                const region = detail.region || detail.postalAddressRegion || 'Unknown';
                const targetRegions = ['East Midlands', 'West Midlands'];
                const isTargetRegion = targetRegions.some(tr => region.toLowerCase().includes(tr.toLowerCase()));
                
                if (!isTargetRegion) {
                    console.log(`Skipping Care Home ${locId} in ${region} (Not a targeted region)`);
                    continue;
                }

                console.log(`Processing Care Home ${locId} in ${region}`);

                const ratingInfo = detail.currentRatings?.overall || {};
                const reportDate = ratingInfo.reportDate;
                
                // Calculate Tier (only targeting struggling or overdue good/outstanding)
                const { tier, priorityScore } = calculateTier(ratingInfo.rating || 'Not rated', reportDate);
                if (tier === 0) continue; // Skip non-targets

                const keyQuestions = ratingInfo.keyQuestionRatings || [];
                const ratings = {
                    rating_safe: keyQuestions.find((kq: any) => kq.name === 'Safe')?.rating || 'Not rated',
                    rating_effective: keyQuestions.find((kq: any) => kq.name === 'Effective')?.rating || 'Not rated',
                    rating_caring: keyQuestions.find((kq: any) => kq.name === 'Caring')?.rating || 'Not rated',
                    rating_responsive: keyQuestions.find((kq: any) => kq.name === 'Responsive')?.rating || 'Not rated',
                    rating_well_led: keyQuestions.find((kq: any) => kq.name === 'Well-led')?.rating || 'Not rated',
                };

                // Collect contacts with roles — deduplicated by full name
                const targetMap = new Map<string, { name: string; role: string }>();

                for (const contact of detail.contacts || []) {
                    if (contact.personGivenName && contact.personFamilyName) {
                        const fullName = `${contact.personGivenName} ${contact.personFamilyName}`;
                        if (!targetMap.has(fullName)) {
                            targetMap.set(fullName, { name: fullName, role: contact.personRole || 'Registered Manager' });
                        }
                    }
                }

                let companyNumber = null;
                const domain = detail.website ? extractDomain(detail.website) : undefined;

                if (detail.providerId) {
                    const provider = await getCQCProviderDetails(detail.providerId);
                    companyNumber = provider.companiesHouseNumber;

                    for (const contact of provider.contacts || []) {
                        if (contact.personGivenName && contact.personFamilyName) {
                            const fullName = `${contact.personGivenName} ${contact.personFamilyName}`;
                            if (!targetMap.has(fullName)) {
                                targetMap.set(fullName, { name: fullName, role: contact.personRole || 'Manager' });
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
                }

                if (companyNumber) {
                    const directors = await getActiveDirectors(companyNumber);
                    for (const dirName of directors) {
                        if (!targetMap.has(dirName)) {
                            targetMap.set(dirName, { name: dirName, role: 'Director' });
                        }
                    }
                }

                if (targetMap.size === 0) {
                    targetMap.set('Registered Manager', { name: 'Registered Manager', role: 'Registered Manager' });
                }

                const providerName = detail.providerName || detail.brandName || detail.name;
                const address = `${detail.postalAddressLine1 || ''}, ${detail.postalAddressTownCity || ''}, ${detail.postalCode || ''}`;

                for (const target of targetMap.values()) {
                    const { data: existing } = await supabaseAdmin
                        .from('leads')
                        .select('id')
                        .eq('cqc_location_id', locId)
                        .eq('name', target.name)
                        .maybeSingle();

                    if (existing) {
                        continue;
                    }

                    let enrichedEmail = null;
                    if (target.name !== 'Registered Manager' && process.env.ANYMAIL_API_KEY) {
                        const emailRes = await findEmailForProvider(providerName, domain, target.name);
                        if (emailRes.status === 'found') {
                            enrichedEmail = emailRes.email;
                        }
                    }

                    const { error } = await supabaseAdmin.from('leads').insert({
                        cqc_location_id: locId,
                        name: target.name,
                        contact_role: target.role,
                        email: enrichedEmail,
                        provider: providerName,
                        address: address,
                        region: region,
                        branch: 'CQC Automated',
                        size: 0,
                        local_authority: detail.localAuthority,
                        last_inspection_date: reportDate,
                        overall_rating: ratingInfo.rating || 'Not rated',
                        ...ratings,
                        tier: tier,
                        campaign_type: 'daily_cqc_trigger',
                        current_phase: 0,
                        email_enrichment_status: enrichedEmail ? 'found' : 'pending',
                        status: 'active',
                        next_step_date: new Date().toISOString()
                    });

                    if (error) {
                        console.error(`Failed to insert lead ${target.name} for ${locId}:`, error);
                    } else {
                        results.push({ id: locId, name: target.name, role: target.role, email: enrichedEmail, tier });
                    }
                }
                
            } catch (err: any) {
                console.error(`Error processing location ${locId}:`, err.message);
            }
        }

        return NextResponse.json({
            message: 'Daily sync completed',
            processed: changedLocationIds.length,
            leads_added: results.length,
            results
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

