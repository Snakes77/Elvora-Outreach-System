import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function listLeads() {
    const { data: results, error } = await supabase
        .from('leads')
        .select('*')
        .limit(10);
    
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Sample Leads:', JSON.stringify(results, null, 2));
    }
}

listLeads();
