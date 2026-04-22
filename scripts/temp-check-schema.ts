import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
    const { data: cols, error } = await supabase
        .from('leads')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error('Error:', error.message);
    } else if (cols && cols.length > 0) {
        console.log('Columns found:', Object.keys(cols[0]));
        console.log('Sample rating:', cols[0].overall_rating);
    } else {
        console.log('No data found in leads table.');
    }
}

checkSchema();
