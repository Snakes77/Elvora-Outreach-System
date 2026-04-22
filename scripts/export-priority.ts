import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function exportPriority() {
    console.log('📤 Exporting 154 Priority Leads for Sniper Enrichment...');
    
    const { data: leads, error } = await supabase
        .from('leads')
        .select('*');

    if (error) {
        console.error('Error fetching leads:', error.message);
        return;
    }

    const priorityLeads = leads?.filter(lead => {
        const rating = (lead.overall_rating || '').toLowerCase();
        return rating === 'inadequate' || rating === 'requires improvement';
    });

    console.log(`✨ Found ${priorityLeads?.length} priority leads.`);
    
    fs.writeFileSync('priority_batch.json', JSON.stringify(priorityLeads, null, 2));
    console.log('✅ Exported to priority_batch.json');
}

exportPriority();
