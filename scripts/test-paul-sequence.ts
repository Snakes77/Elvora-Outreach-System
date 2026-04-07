import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Resend } from 'resend';
import { getTemplateForPhase } from '../lib/outreach-templates';
import { generateBespokeEmail } from '../lib/emailgen';

const resend = new Resend(process.env.RESEND_API_KEY!);
const TARGET_EMAIL = 'paul@staxxd.co.uk';

async function sendSequenceTests() {
    console.log('🧪 Generating and Sending the 3-Sequence to', TARGET_EMAIL);

    // Sample data simulating a CQC pull
    const sampleProvider = {
        name: 'Greenacres Care Home',
        locationId: 'test-greenacres-id',
        providerId: 'greenacres-ltd',
        postalCode: 'NG1 1AA'
    };

    const sampleLead = {
        id: 'test-greenacres-id',
        name: sampleProvider.name,
        rating_safe: 'Requires Improvement',
        rating_effective: 'Good',
        rating_caring: 'Good',
        rating_responsive: 'Good',
        rating_well_led: 'Requires Improvement',
        last_inspection_date: '2026-01-12' // Just a string for the template
    };

    const enrichment = {
        tier: 3,
        priorityScore: 20,
        safe: 'There were concerns about medicine management.',
        effective: 'Good',
        caring: 'Good',
        responsive: 'Good',
        wellLed: 'Audits did not identify the medicine management shortfalls.',
        daysSinceInspection: 90,
        isOverdue: false,
        notes: ''
    };

    // We send Phase 1, Phase 2, and Phase 3
    for (let phase = 1; phase <= 3; phase++) {
        console.log(`\n=================== PHASE ${phase} ===================`);
        
        let template = getTemplateForPhase(phase, sampleLead.id, sampleLead);
        if (!template) {
            console.error(`❌ Template failed to generate for phase ${phase}`);
            continue;
        }

        let finalHtml = template.html;

        // Simulate Orchestrator behavior for Phase 1
        if (phase === 1) {
            console.log('🤖 Generating GPT-4o-mini Bespoke Context for Phase 1...');
            const bespokeBody = await generateBespokeEmail(sampleProvider, enrichment, phase);
            
            if (bespokeBody && bespokeBody.length > 20) {
                const ctaIndex = finalHtml.indexOf('<div style="margin: 24px 0;">');
                if (ctaIndex > -1) {
                    const formattedBespoke = bespokeBody.split('\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('');
                    finalHtml = finalHtml.substring(0, ctaIndex) + formattedBespoke + finalHtml.substring(ctaIndex);
                }
            } else {
                console.log('⚠️ Failed to generate bespoke body fallback used.');
            }
        }

        process.stdout.write(`✉️ Sending Phase ${phase} to ${TARGET_EMAIL}... `);
        try {
            // Usually we use melissa@<domain> but here we'll use one of the standard domains or the one from test.
            // Let's use melissa@elvoraconsulting.co.uk for testing if verified, or maybe the system config domain.
            // The previous test script used "Melissa <melissa@elvoraconsulting.co.uk>". 
            // We'll stick to that so we don't encounter unverified domain errors on Resend.
            const { data, error } = await resend.emails.send({
                from: 'Melissa <melissa@elvoraconsulting.co.uk>', // using primary domain
                to: TARGET_EMAIL,
                subject: template.subject,
                html: finalHtml,
                tags: [{ name: 'test_run', value: 'true' }]
            });

            if (error) {
                console.error(`❌ Error:`, error.message);
                
                // Fallback to primary domain if the test one fails
                console.log('♻️ Falling back to primary domain...');
                const retry = await resend.emails.send({
                    from: 'Melissa <melissa@elvoraconsulting.co.uk>',
                    to: TARGET_EMAIL,
                    subject: template.subject,
                    html: finalHtml,
                    tags: [{ name: 'test_run', value: 'true' }]
                });
                if (retry.error) console.error(`❌ Retry Error:`, retry.error.message);
                else console.log(`✅ Sent! (ID: ${retry.data?.id})`);
            } else {
                console.log(`✅ Sent! (ID: ${data?.id})`);
            }
        } catch (err: any) {
            console.error(`❌ Crash:`, err.message);
        }

        // Small delay to prevent rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🎉 Finished sending sequence!');
}

sendSequenceTests().catch(console.error);
