import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Resend } from 'resend';
import { getTemplateForPhase } from '../lib/outreach-templates';

const resend = new Resend(process.env.RESEND_API_KEY!);

const TEST_EMAILS = [
    'melissa@elvoraconsulting.co.uk',
    'paul@staxxd.co.uk'
];

async function sendTests() {
    console.log('🧪 Sending Test Outreach Emails (Phase 1: The Widget Hook)...');

    // 1. Prepare "Greenacres" Sample Data
    const sampleLead = {
        id: 'test-greenacres-id',
        name: 'Greenacres Care Home',
        provider: 'Greenacres Care Home Limited',
        rating_safe: 'Requires Improvement',
        rating_effective: 'Good',
        rating_caring: 'Good',
        rating_responsive: 'Good',
        rating_well_led: 'Requires Improvement',
        last_inspection_date: '2026-01-12'
    };

    // 2. Get Phase 1 Template (Quality Statement Hook)
    const template = getTemplateForPhase(1, sampleLead.id, {
        name: sampleLead.name,
        rating_safe: sampleLead.rating_safe,
        rating_effective: sampleLead.rating_effective,
        rating_caring: sampleLead.rating_caring,
        rating_responsive: sampleLead.rating_responsive,
        rating_well_led: sampleLead.rating_well_led,
        last_inspection_date: sampleLead.last_inspection_date
    });

    if (!template) {
        console.error('❌ Template failed to generate.');
        return;
    }

    // 3. Send to both!
    for (const email of TEST_EMAILS) {
        process.stdout.write(`✉️ Sending to ${email}... `);
        try {
            const { data, error } = await resend.emails.send({
                from: 'Melissa <melissa@elvoraconsulting.co.uk>',
                to: email,
                subject: template.subject,
                html: template.html,
                tags: [{ name: 'test_run', value: 'true' }]
            });

            if (error) {
                console.error(`❌ Error:`, error.message);
            } else {
                console.log(`✅ Sent! (ID: ${data?.id})`);
            }
        } catch (err: any) {
            console.error(`❌ Crash:`, err.message);
        }
    }

    console.log('\n🎉 Test batch complete! Check your inboxes.');
}

sendTests().catch(console.error);
