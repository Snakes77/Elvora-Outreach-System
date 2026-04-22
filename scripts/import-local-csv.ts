import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const CSV_PATH = '/Users/paulmeakin/Desktop/data (4).csv';

// Priority cities
const TARGET_CITIES = ['Nottingham', 'Derby', 'Leicester'];
const TARGET_REGIONS = ['East Midlands', 'West Midlands'];

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i + 1] === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

async function importLeads() {
    console.log('📂 Reading CSV from Desktop...');
    
    if (!fs.existsSync(CSV_PATH)) {
        console.error(`❌ File not found: ${CSV_PATH}`);
        return;
    }

    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = content.split('\n');

    // Headers are on line 3 (index 2)
    const headerLine = lines[2];
    if (!headerLine) {
        console.error('❌ Could not find header row on line 3');
        return;
    }

    const headers = parseCSVLine(headerLine);
    console.log('✅ Headers detected:', headers.length);

    const prospects = [];
    let skipped = 0;
    
    // Data starts on line 4 (index 3)
    for (let i = 3; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.trim() === '') continue;

        const record = parseCSVLine(line);
        if (record.length < headers.length) continue;

        const data: any = {};
        headers.forEach((h, idx) => {
            data[h] = record[idx];
        });

        const region = data['Region'];
        const city = data['Town/City'];

        // Filter for Midlands
        const isMidlands = TARGET_REGIONS.includes(region);
        if (!isMidlands) {
            skipped++;
            continue;
        }

        const locationId = data['CQC Location ID (for office use only)'];
        if (!locationId) continue;

        // Map to DB fields
        const lead = {
            cqc_location_id: locationId,
            name: data['Name'] || 'Unknown Care Home',
            provider: data['Provider name'] || 'Unknown Provider',
            address: `${data['Address 1']}, ${data['Address 2'] ? data['Address 2'] + ', ' : ''}${data['Town/City']}, ${data['Postcode']}`,
            region: region,
            local_authority: data['Local authority'],
            // Table requires branch/size/tier - mapping defaults
            branch: data['Name'] || 'Main',
            size: 'Unknown',
            tier: 'Bronze',
            status: 'active',
            campaign_type: 'midlands_export_import',
            // Table requires email - we use a temporary placeholder for enrichment
            email: `pending-${locationId}@elvora-discovery.com`,
            // Handle empty dates by passing null instead of empty string
            last_inspection_date: data['Report publication date'] && data['Report publication date'].trim() !== '' 
                ? data['Report publication date'] 
                : null,
            // Priority boost for target cities
            note: TARGET_CITIES.includes(city) ? 'High Priority (Target City)' : 'Midlands Regional'
        };

        prospects.push(lead);
    }

    console.log(`🔍 Total rows: ${lines.length - 3}`);
    console.log(`🚫 Skipped (non-Midlands): ${skipped}`);
    console.log(`✨ Matched Midlands leads: ${prospects.length}`);

    if (prospects.length === 0) {
        console.log('⚠️ No leads matched filters. Stopping.');
        return;
    }

    // Chunked upsert to avoid large request body issues
    const chunkSize = 100;
    let importedCount = 0;

    for (let i = 0; i < prospects.length; i += chunkSize) {
        const chunk = prospects.slice(i, i + chunkSize);
        process.stdout.write(`📤 Importing batch ${Math.floor(i / chunkSize) + 1}... `);
        
        const { error } = await supabase.from('leads').upsert(chunk, { onConflict: 'cqc_location_id' });
        
        if (error) {
            console.error('\n❌ DB Error:', error.message);
        } else {
            importedCount += chunk.length;
            console.log(`(${importedCount}/${prospects.length})`);
        }
    }

    console.log(`\n🎉 Success! Added/Updated ${importedCount} leads in Supabase.`);
    console.log('Next step: Run the enrichment script to find Registered Manager names.');
}

importLeads().catch(console.error);
