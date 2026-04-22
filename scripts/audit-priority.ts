import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function audit() {
    console.log('🔍 Auditing Midlands Priority Leads...');
    
    const { data: leads, error } = await supabase
        .from('leads')
        .select('name, overall_rating, email, provider, nominated_individual, registered_manager');

    if (error) {
        console.error('Error fetching leads:', error.message);
        return;
    }

    const ratingsCount: Record<string, number> = {};
    let totalPriority = 0;
    let hasEmail = 0;
    let hasPersonalEmail = 0;
    let hasGenericEmail = 0;
    const providers: Record<string, number> = {};

    let hasManagerName = 0;
    leads?.forEach(lead => {
        const rating = lead.overall_rating || 'Unknown';
        ratingsCount[rating] = (ratingsCount[rating] || 0) + 1;

        const normalizedRating = rating.toLowerCase();
        if (normalizedRating === 'inadequate' || normalizedRating === 'requires improvement') {
            totalPriority++;
            
            if (lead.registered_manager || lead.nominated_individual) {
                hasManagerName++;
            }

            if (lead.email) {
                hasEmail++;
                const handle = lead.email.split('@')[0].toLowerCase();
                const homeNameKey = lead.name.toLowerCase().replace(/[^a-z]/g, '');
                
                // Strict check: must have a dot, and not be a generic prefix or the home name
                const isGenericPrefix = /^(info|admin|enquiries|office|manager|contact|enquiry|adminstration|reception|accounts|referrals|careers)/i.test(handle);
                const isHomeName = homeNameKey.length > 3 && handle.includes(homeNameKey);
                
                if (isGenericPrefix || isHomeName || !handle.includes('.')) {
                    hasGenericEmail++;
                } else {
                    hasPersonalEmail++;
                }
            }

            const provider = lead.provider || 'Independent';
            providers[provider] = (providers[provider] || 0) + 1;
        }
    });

    console.log('\n--- Ratings Breakdown ---');
    Object.entries(ratingsCount).forEach(([rating, count]) => {
        console.log(`${rating}: ${count}`);
    });

    console.log('\n--- Priority Leads (Inadequate/RI) ---');
    console.log(`Total Target Leads: ${totalPriority}`);
    console.log(`Leads with Manager Name: ${hasManagerName}`);
    console.log(`Leads with any email: ${hasEmail}`);
    console.log(`⚠️ Leads with Generic/Non-Personal emails: ${hasGenericEmail}`);
    console.log(`✨ Leads with High-Confidence Personal emails: ${hasPersonalEmail}`);

    console.log('\n--- Top 10 Priority Providers ---');
    Object.entries(providers)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .forEach(([provider, count]) => {
            console.log(`${provider}: ${count}`);
        });
}

audit();
