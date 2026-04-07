import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCQCLocationDetails, getCQCProviderDetails, getCQCChanges, calculateTier } from '@/lib/cqc';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('Running daily CQC changes sync...');

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
                
                // We only care about care homes in our target regions (optional filtering here)
                if (detail.careHome !== 'Y') {
                    console.log(`Skipping ${locId} (Not a Care Home, code: ${detail.careHome})`);
                    continue;
                }
                
                // Check if they are Midlands - adjust matching logic as needed
                const isMidlands = ['East Midlands', 'West Midlands'].includes(detail.region || detail.postalAddressRegion || '');
                if (!isMidlands) {
                    console.log(`Skipping ${locId} (Region: ${detail.region || detail.postalAddressRegion})`);
                    continue;
                }

                const ratingInfo = detail.currentRatings?.overall || {};
                const reportDate = ratingInfo.reportDate;
                
                // If the report date is NOT strictly within our 24h window, you might want to skip, 
                // but the /changes API already gave us this location, meaning it changed recently.
                
                // Let's get their provider details for the Nominated Individual
                let leadName = 'Registered Manager'; // fallback
                if (detail.providerId) {
                    const provider = await getCQCProviderDetails(detail.providerId);
                    
                    // Look for Nominated Individual in social care regulated activities
                    for (const activity of provider.regulatedActivities || []) {
                        const ni = activity.nominatedIndividual;
                        if (ni?.personGivenName && ni?.personFamilyName) {
                            leadName = `${ni.personGivenName} ${ni.personFamilyName}`;
                            break;
                        }
                    }
                }

                // Get discrete ratings
                const keyQuestions = ratingInfo.keyQuestionRatings || [];
                const ratings = {
                    rating_safe: keyQuestions.find((kq: any) => kq.name === 'Safe')?.rating || 'Not rated',
                    rating_effective: keyQuestions.find((kq: any) => kq.name === 'Effective')?.rating || 'Not rated',
                    rating_caring: keyQuestions.find((kq: any) => kq.name === 'Caring')?.rating || 'Not rated',
                    rating_responsive: keyQuestions.find((kq: any) => kq.name === 'Responsive')?.rating || 'Not rated',
                    rating_well_led: keyQuestions.find((kq: any) => kq.name === 'Well-led')?.rating || 'Not rated',
                };

                // Calculate Tier (only targeting struggling or overdue good/outstanding)
                const { tier, priorityScore } = calculateTier(ratingInfo.rating || 'Not rated', reportDate);
                
                // If Tier 0, they are not a target (e.g. recently rated Good)
                if (tier === 0) continue;

                // 4. Save to leads database!
                const { error } = await supabaseAdmin.from('leads').upsert({
                    cqc_location_id: locId,
                    name: leadName, // Nominated Individual Name!
                    provider: detail.providerName || detail.brandName || detail.name,
                    address: `${detail.postalAddressLine1 || ''}, ${detail.postalAddressTownCity || ''}, ${detail.postalCode || ''}`,
                    region: detail.region || detail.postalAddressRegion,
                    local_authority: detail.localAuthority,
                    last_inspection_date: reportDate,
                    ...ratings,
                    tier: tier,
                    campaign_type: 'daily_cqc_trigger',
                    current_phase: 0, // ready for sequence
                    status: 'active',
                    next_step_date: new Date().toISOString() // immediate send
                }, { onConflict: 'cqc_location_id' });

                if (error) throw error;

                results.push({ id: locId, name: leadName, tier: tier, status: 'added' });
                
            } catch (err: any) {
                console.error(`Error processing location ${locId}:`, err.message);
            }
        }

        return NextResponse.json({
            message: 'Daily sync completed',
            processed: results.length,
            results
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
