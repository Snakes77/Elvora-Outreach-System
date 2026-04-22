import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { verifyEmail } from '../lib/anymail';
// We'll use a dynamic import or manual search results in this script for now
// since I am a human agent orchestrating this.

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deepEnrichV2() {
    console.log('🧪 Starting Deep Enrichment v2 (Research-First)...');

    // 1. Fetch Priority Leads
    const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .in('overall_rating', ['Inadequate', 'Requires improvement'])
        .ilike('email', 'pending-%')
        .limit(5);

    if (error) {
        console.error('Error fetching leads:', error.message);
        return;
    }

    if (!leads || leads.length === 0) {
        console.log('✅ No priority leads pending enrichment.');
        return;
    }

    console.log(`🎯 targets identified: ${leads.length}`);

    for (const lead of leads) {
        console.log(`\n--- Researching: ${lead.name} ---`);
        console.log(`🆔 DB ID: ${lead.id}`);
        console.log(`📍 CQC ID: ${lead.cqc_location_id}`);
        console.log(`👤 Manager: ${lead.registered_manager || 'None'}`);
        console.log(`👤 NI: ${lead.nominated_individual || 'None'}`);
        console.log(`🌐 CQC Website: ${lead.website_url || 'None'}`);

        // Note: For this script to be fully automated, we'd need a web_search API.
        // Since I (the AI) have the web_search tool, I will perform the research 
        // outside this script and then use the script to VERIFY and UPDATE.
        
        // This script is intended to be run for VERIFICATION of discovered candidates.
    }
}

// Support command-line candidate verification
const candidate = process.argv.find(arg => arg.startsWith('--verify='))?.split('=')[1];
const leadId = process.argv.find(arg => arg.startsWith('--id='))?.split('=')[1];

async function runVerification(email: string, id: string) {
    console.log(`🔍 Verifying candidate: ${email}...`);
    const result = await verifyEmail(email);
    console.log(`📊 Status: ${result.status} (Score: ${result.score || 'N/A'})`);

    if (result.status === 'valid') {
        const { error } = await supabase
            .from('leads')
            .update({ 
                email, 
                email_enrichment_status: 'found_verified',
                note: `Verified via Research-First phase on ${new Date().toLocaleDateString()}`
            })
            .eq('id', id);

        if (error) console.error('❌ Failed to update DB:', error.message);
        else console.log(`✅ Success! Lead ${id} updated with ${email}`);
    } else {
        console.log(`❌ Candidate ${email} is ${result.status}. Not updating DB.`);
    }
}

if (candidate && leadId) {
    runVerification(candidate, leadId).catch(console.error);
} else {
    deepEnrichV2().catch(console.error);
}
