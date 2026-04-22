require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    const { data, error } = await supabase.from('leads').select('id, region, overall_rating');
    if (error) console.error(error);
    else {
        const ew = data.filter(d => d.region === 'East Midlands' || d.region === 'West Midlands');
        console.log("Total leads in DB:", data.length);
        console.log("Total in East/West Midlands:", ew.length);
        const badRating = ew.filter(d => ['inadequate', 'requires improvement'].includes((d.overall_rating||'').toLowerCase()));
        console.log("East/West Midlands with bad rating:", badRating.length);
    }
}
main();
