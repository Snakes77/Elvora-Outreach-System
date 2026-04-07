import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CQC_API_BASE = 'https://api.service.cqc.org.uk/public/v1';
const CQC_API_KEY = process.env.CQC_API_KEY;

type CQCLocation = {
    locationId: string;
    locationName: string;
    postalCode: string;
};

async function checkCredits() {
    const { data: config } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'anymailfinder_limit_monthly')
        .single();

    const stats = config?.value as { limit: number, current: number };
    return stats && stats.current < stats.limit;
}

// Midlands Postcode Prefix Targeting Map (v1)
const MIDLANDS_POSTCODE_PREFIXES = [
    'NG', 'LE', 'DE', 'LN', 'NN', // East Midlands (Nottingham, Leicester, Derby, Lincoln, Northants)
    'B', 'CV', 'WV', 'ST', 'WR', 'DY', 'WS' // West Midlands (Birmingham, Coventry, Wolverhampton, Stoke, etc.)
];

async function syncCQC() {
    console.log('🚀 Finalising Midlands Target List Build (Super Sync)...');

    if (!(await checkCredits())) {
        console.warn('⚠️ AnyMailFinder credit limit reached. Syncing ratings only (skipping discovery).');
    }

    let syncCount = 0;
    const itemsPerPage = 100;
    const totalPages = 25; // Deep scan (2,500 locations) to find enough Midlands care homes
    
    console.log(`\n🔍 Scanning ${itemsPerPage * totalPages} latest CQC locations for Midlands targets...`);
    
    for (let page = 1; page <= totalPages; page++) {
        process.stdout.write(`📄 Page ${page}/${totalPages}... `);
        
        try {
            const res = await fetch(`${CQC_API_BASE}/locations?perPage=${itemsPerPage}&page=${page}`, {
                headers: { 'Ocp-Apim-Subscription-Key': CQC_API_KEY!, 'Accept': 'application/json' }
            });

            if (!res.ok) {
                console.error(`\n❌ API Error on page ${page}: ${res.statusText}`);
                continue;
            }

            const data = await res.json();
            const locations = data.locations as CQCLocation[];

            if (!locations || locations.length === 0) {
                console.log('\n✅ End of library reached.');
                break;
            }

            for (const loc of locations) {
                const postcodePrefix = loc.postalCode?.split(' ')[0].toUpperCase();
                if (!MIDLANDS_POSTCODE_PREFIXES.includes(postcodePrefix)) continue;

                try {
                    const detailRes = await fetch(`${CQC_API_BASE}/locations/${loc.locationId}`, {
                        headers: { 'Ocp-Apim-Subscription-Key': CQC_API_KEY!, 'Accept': 'application/json' }
                    });
                    const detail = await detailRes.json();

                    if (detail.careHome !== 'Y') continue;
                    if (!['East Midlands', 'West Midlands'].includes(detail.postalAddressRegion)) continue;

                    const ratingInfo = detail.currentRatings?.overall || {};
                    const keyQuestions = ratingInfo.keyQuestionRatings || [];

                    const ratings = {
                        rating_safe: keyQuestions.find((kq: any) => kq.name === 'Safe')?.rating || 'Not rated',
                        rating_effective: keyQuestions.find((kq: any) => kq.name === 'Effective')?.rating || 'Not rated',
                        rating_caring: keyQuestions.find((kq: any) => kq.name === 'Caring')?.rating || 'Not rated',
                        rating_responsive: keyQuestions.find((kq: any) => kq.name === 'Responsive')?.rating || 'Not rated',
                        rating_well_led: keyQuestions.find((kq: any) => kq.name === 'Well-led')?.rating || 'Not rated',
                    };

                    const { error } = await supabase.from('leads').upsert({
                        cqc_location_id: loc.locationId,
                        name: detail.name,
                        provider: detail.providerName || detail.brandName,
                        address: `${detail.postalAddressLine1}, ${detail.postalAddressTownCity}, ${detail.postalCode}`,
                        region: detail.postalAddressRegion,
                        local_authority: detail.localAuthority,
                        last_inspection_date: ratingInfo.reportDate,
                        ...ratings,
                        campaign_type: 'midlands_deep_sync',
                        status: 'active'
                    }, { onConflict: 'cqc_location_id' });

                    if (!error) syncCount++;
                } catch (e) {}
            }
            console.log(`(Matches so far: ${syncCount})`);
        } catch (err) {
            console.error(`\n❌ Fatal error on page ${page}:`, err);
        }
    }
    console.log(`\n🎉 Deep Sync Complete! ${syncCount} Midlands targets successfully added to Supabase.`);
}

async function syncSpecificLocation(locationId: string) {
    console.log(`🎯 Targeting Specific Location: ${locationId}...`);
    try {
        const detailRes = await fetch(`${CQC_API_BASE}/locations/${locationId}`, {
            headers: { 'Ocp-Apim-Subscription-Key': CQC_API_KEY!, 'Accept': 'application/json' }
        });
        const detail = await detailRes.json();

        const ratingInfo = detail.currentRatings?.overall || {};
        const keyQuestions = ratingInfo.keyQuestionRatings || [];

        const ratings = {
            rating_safe: keyQuestions.find((kq: any) => kq.name === 'Safe')?.rating || 'Not rated',
            rating_effective: keyQuestions.find((kq: any) => kq.name === 'Effective')?.rating || 'Not rated',
            rating_caring: keyQuestions.find((kq: any) => kq.name === 'Caring')?.rating || 'Not rated',
            rating_responsive: keyQuestions.find((kq: any) => kq.name === 'Responsive')?.rating || 'Not rated',
            rating_well_led: keyQuestions.find((kq: any) => kq.name === 'Well-led')?.rating || 'Not rated',
        };

        const { error } = await supabase.from('leads').upsert({
            cqc_location_id: locationId,
            name: detail.name,
            provider: detail.providerName || detail.brandName,
            address: `${detail.postalAddressLine1}, ${detail.postalAddressTownCity}, ${detail.postalCode}`,
            region: detail.postalAddressRegion,
            local_authority: detail.localAuthority,
            last_inspection_date: ratingInfo.reportDate,
            ...ratings,
            campaign_type: 'direct_target',
            status: 'active'
        }, { onConflict: 'cqc_location_id' });

        if (error) console.error(`❌ DB Error:`, error.message);
        else console.log(`✅ Target Successfully Onboarded: ${detail.name}`);
    } catch (err: any) {
        console.error(`❌ Sync Failed: ${err.message}`);
    }
}

const targetId = process.argv.find(arg => arg.startsWith('--location='))?.split('=')[1];
if (targetId) syncSpecificLocation(targetId).catch(console.error);
else syncCQC().catch(err => { console.error('💥 Sync Failed:', err); process.exit(1); });
