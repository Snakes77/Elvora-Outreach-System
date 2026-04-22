import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findTargets() {
    const { data: results, error } = await supabase
        .from('leads')
        .select('id, name, overall_rating, campaign_type')
        .in('overall_rating', ['Inadequate', 'Requires improvement'])
        .limit(20);
    
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Target Leads:', results);
    }
}

findTargets();
