import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });
    
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Lead Count in .env.local DB:', count);
    }

    const { data: config, error: configError } = await supabase
        .from('system_config')
        .select('*');
    
    if (configError) {
        console.error('Config Error:', configError.message);
    } else {
        console.log('System Config Tables found:', config.length);
    }
}

check();
