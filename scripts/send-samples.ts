import { supabaseAdmin } from '../lib/supabase-admin';
import { getTemplateForPhase } from '../lib/outreach-templates';
import { Resend } from 'resend';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const resend = new Resend(process.env.RESEND_API_KEY!);

async function run() {
    const { data: leads, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('campaign_type', '5_week_saf_campaign')
        .eq('status', 'paused')
        .limit(3);

    if (error || !leads) {
        console.error("Error fetching leads:", error);
        return;
    }

    console.log(`Sending ${leads.length} samples to paul@staxxd.co.uk...`);

    for (const lead of leads) {
        const leadConfig = {
            name: lead.name,
            contact_role: lead.contact_role,
            provider: lead.provider,
            branch: lead.branch,
            tier: lead.tier,
            size: lead.size,
            note: lead.note,
            cqc_location_id: lead.cqc_location_id,
            overall_rating: lead.overall_rating,
            last_inspection_date: lead.last_inspection_date,
            rating_safe: lead.rating_safe,
            rating_effective: lead.rating_effective,
            rating_caring: lead.rating_caring,
            rating_responsive: lead.rating_responsive,
            rating_well_led: lead.rating_well_led,
            local_authority: lead.local_authority,
            cqc_service_type: lead.cqc_service_type,
            campaign_type: lead.campaign_type
        };

        const template = getTemplateForPhase(1, lead.id, leadConfig);
        if (template) {
            console.log(`Provider: ${lead.provider} | Safe Rating: ${lead.rating_safe}`);
            const fromAddress = 'Melissa Meakin <melissa@myelvoraconsulting.org>';
            
            try {
                const { error: sendError } = await resend.emails.send({
                    from: fromAddress,
                    to: ['paul@staxxd.co.uk'],
                    replyTo: ['melissa@elvoraconsulting.co.uk'],
                    subject: `[SAMPLE PREVIEW] ${template.subject}`,
                    html: template.html,
                });
                
                if (sendError) {
                    console.error("Error sending:", sendError);
                } else {
                    console.log("-> Sent successfully.");
                }
            } catch (err) {
                console.error("Fatal send error:", err);
            }
        }
    }
}

run();
