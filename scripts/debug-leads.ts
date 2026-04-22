import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkLeads() {
    const { data: results, error } = await supabase
        .from('leads')
        .select('id, name, address')
        .ilike('name', '%Knights Care%')
        .limit(10);
    
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Search Results:', results);
    }
}

checkLeads();
