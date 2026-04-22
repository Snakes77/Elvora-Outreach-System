import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import csvParser from 'csv-parser';
import { getCQCLocationDetails, calculateTier } from '../lib/cqc'; // Adjust imports if necessary

const CQC_API_BASE = 'https://api.service.cqc.org.uk/public/v1';
const CQC_API_KEY = process.env.CQC_API_KEY || '';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchCQCLocationCache() {
    console.log('Fetching all CQC locations to build a cache for matching...');
    const locations = [];
    let page = 1;
    let url = `${CQC_API_BASE}/locations?perPage=10000`;
    
    // We will just do a few pages until it is done
    while (url) {
        process.stdout.write(`Fetching page... `);
        let res = null;
        let retries = 3;
        while (retries > 0) {
            try {
                res = await fetch(url, { headers: { 'Ocp-Apim-Subscription-Key': CQC_API_KEY } });
                if (res.ok) break;
            } catch (e) {}
            retries--;
            if (retries > 0) {
                process.stdout.write(`Retry... `);
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        
        if (!res || !res.ok) {
            console.error('Failed to fetch:', res ? res.statusText : 'Network Error');
            break;
        }
        const data = await res.json();
        const batch = data.locations || [];
        locations.push(...batch);
        process.stdout.write(`${locations.length} locations so far\n`);
        
        if (data.nextPageUri) {
            url = data.nextPageUri.startsWith('http') 
                ? data.nextPageUri 
                : `${CQC_API_BASE.replace('/public/v1', '')}${data.nextPageUri.startsWith('/') ? data.nextPageUri : '/' + data.nextPageUri}`;
            // Let's just forcibly construct the CQC domain if it's relative:
            if (!url.includes('api.service.cqc.org.uk')) {
                url = `https://api.service.cqc.org.uk/public/v1${data.nextPageUri.replace('/public/v1', '')}`;
            }
        } else {
            break;
        }
    }
    console.log(`Finished caching ${locations.length} total CQC locations.`);
    return locations;
}

function cleanString(s: string) {
    if (!s) return '';
    return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function runImport() {
    const csvPath = '/Users/paulmeakin/Desktop/care_home_in_East_Midlands_2026-04-14__results.csv';
    const rawTargets: any[] = [];
    
    // 1. Read CSV
    console.log('Reading CSV...');
    await new Promise((resolve) => {
        fs.createReadStream(csvPath)
            .pipe(csvParser())
            .on('data', (row: any) => rawTargets.push(row))
            .on('end', resolve);
    });
    console.log(`Loaded ${rawTargets.length} targets from CSV.`);

    // 2. Fetch CQC Locations
    const cqcCache = await fetchCQCLocationCache();
    
    // 3. Match and Enrich
    let matchCount = 0;
    const enrichedLeads = [];

    for (let i = 0; i < rawTargets.length; i++) {
        const row = rawTargets[i];
        const rawName = row.company_name;
        // The CSV location is a full address. Let's try to extract postcode if possible
        // Example: "172 Nottingham Rd, Nottingham NG8 6AX, United Kingdom"
        const address = row.company_location || '';
        const postCodeMatch = address.match(/[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}/i);
        const postcode = postCodeMatch ? postCodeMatch[0].toUpperCase().replace(/\s+/g, '') : null;
        
        // Find best match in CQC Cache
        let matchedLocation = null;
        if (postcode) {
            // Priority: Postcode match + Name partial match
            matchedLocation = cqcCache.find(l => 
                l.postalCode && l.postalCode.replace(/\s+/g, '').toUpperCase() === postcode &&
                cleanString(l.locationName).includes(cleanString(rawName).substring(0, 5))
            );
        }
        
        if (!matchedLocation) {
            // Fallback: Name exact match
            matchedLocation = cqcCache.find(l => cleanString(l.locationName) === cleanString(rawName));
        }
        
        let cqcDetails: any = null;
        if (matchedLocation) {
            matchCount++;
            process.stdout.write(`\rFetching details for ${matchedLocation.locationId} (${matchCount}/${rawTargets.length})`);
            try {
                cqcDetails = await getCQCLocationDetails(matchedLocation.locationId);
            } catch (err) {
                console.error(`Error fetching detail for matched location ${matchedLocation.locationId}`, err);
            }
        }

        const emailToUse = row.decision_maker_email || row.one_email || row.company_emails?.split(',')[0];
        
        // Prepare lead object
        let ratings = {
            rating_safe: 'Not rated',
            rating_effective: 'Not rated',
            rating_caring: 'Not rated',
            rating_responsive: 'Not rated',
            rating_well_led: 'Not rated',
            overall_rating: 'Not rated',
            last_inspection_date: null
        };

        if (cqcDetails) {
            const ratingInfo = cqcDetails.currentRatings?.overall || {};
            const keyQuestions = ratingInfo.keyQuestionRatings || [];
            ratings = {
                rating_safe: keyQuestions.find((kq: any) => kq.name === 'Safe')?.rating || 'Not rated',
                rating_effective: keyQuestions.find((kq: any) => kq.name === 'Effective')?.rating || 'Not rated',
                rating_caring: keyQuestions.find((kq: any) => kq.name === 'Caring')?.rating || 'Not rated',
                rating_responsive: keyQuestions.find((kq: any) => kq.name === 'Responsive')?.rating || 'Not rated',
                rating_well_led: keyQuestions.find((kq: any) => kq.name === 'Well-led')?.rating || 'Not rated',
                overall_rating: ratingInfo.rating || 'Not rated',
                last_inspection_date: ratingInfo.reportDate || null
            };
        }

        const lead = {
            cqc_location_id: matchedLocation ? matchedLocation.locationId : null,
            name: row.decision_maker_name || 'Registered Manager',
            contact_type: row.decision_maker_job_title || 'Registered Manager',
            email: emailToUse,
            provider: rawName,
            address: address,
            region: 'East Midlands', // As per file name
            branch: 'CQC Automated',
            size: 0,
            tier: cqcDetails ? calculateTier(ratings.overall_rating, ratings.last_inspection_date as any).tier : 0,
            ...ratings,
            campaign_type: '5_week_saf_campaign',
            current_phase: 0,
            email_enrichment_status: emailToUse ? 'found' : 'pending',
            status: 'active',
            next_step_date: new Date().toISOString()
        };

        enrichedLeads.push(lead);
    }
    
    console.log(`\n\nMatched ${matchCount} out of ${rawTargets.length} locations to CQC API.`);

    // 4. Insert to Supabase one by one to avoid chunk failure
    console.log('Inserting into Supabase...');
    let successCount = 0;
    for (let i = 0; i < enrichedLeads.length; i++) {
        const lead = enrichedLeads[i];
        if (!lead.email) continue; // Skip to avoid duplicate null conflicts

        const { error } = await supabase.from('leads').upsert(lead, { onConflict: 'email' });
        if (error) {
            // Check secondary constraint
            const { error: err2 } = await supabase.from('leads').upsert(lead, { onConflict: 'cqc_location_id' });
            if (!err2) successCount++;
        } else {
            successCount++;
        }
    }
    console.log(`Successfully saved ${successCount} leads! Done!`);
}

runImport().catch(console.error);
