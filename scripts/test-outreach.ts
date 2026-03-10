import { Resend } from 'resend';
import { getTemplateForPhase } from '../lib/outreach-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

// Using a real contact name so you can preview personalisation exactly as it will appear
const testLead = {
    name: "Katie & Darren Starr",
    branch: "West Sussex & Kent",
    tier: "hot" as "hot" | "warm",
    size: "Large" as "Small" | "Medium" | "Large",
    note: "Managing Director – warmest lead"
};

async function testAllPhases() {
    const targetEmail = 'melissa@elvoraconsulting.co.uk';
    const ccEmail = 'paul@staxxd.co.uk';
    console.log(`Sending all 4 test emails to ${targetEmail} (CC: ${ccEmail})...`);

    for (let phase = 1; phase <= 4; phase++) {
        const template = getTemplateForPhase(phase, 'test-lead-id', testLead);
        if (!template) continue;

        try {
            const { data, error } = await resend.emails.send({
                from: 'Melissa <updates@elvoraconsulting.co.uk>',
                to: targetEmail,
                cc: ccEmail,
                subject: template.subject, // Clean subject for approval
                html: template.html,
            });

            if (error) {
                console.error(`❌ Phase ${phase} failed:`, error);
            } else {
                console.log(`✅ Phase ${phase} test sent! ID:`, data?.id);
            }
        } catch (err) {
            console.error(`❌ Unexpected error on Phase ${phase}:`, err);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

testAllPhases();
