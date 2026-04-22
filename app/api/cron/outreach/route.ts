import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getTemplateForPhase } from '@/lib/outreach-templates';
import { sendOutreachEmail } from '@/lib/resend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('Running outreach cron job...');

        // 1. Fetch leads that are 'active', have a verified email, and are due for their next step
        const { data: leads, error: fetchError } = await supabaseAdmin
            .from('leads')
            .select('*')
            .eq('status', 'active')
            .eq('email_enrichment_status', 'found')
            .lte('next_step_date', new Date().toISOString());

        if (fetchError) {
            console.error('Error fetching leads:', fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!leads || leads.length === 0) {
            console.log('No leads due for follow-up today.');
            return NextResponse.json({ message: 'No leads due for follow-up today' });
        }

        console.log(`Found ${leads.length} leads due for outreach.`);

        const results = [];

        // 2. Process each lead
        for (const lead of leads) {
            const nextPhase = (lead.current_phase || 0) + 1;

            // Get the email template for the next phase
            const template = getTemplateForPhase(nextPhase, lead.id, {
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
            });

            if (!template) {
                // No more templates — mark sequence as completed
                await supabaseAdmin
                    .from('leads')
                    .update({ status: 'completed' })
                    .eq('id', lead.id);

                results.push({ id: lead.id, status: 'completed' });
                continue;
            }

            // Handle multiple emails in the lead.email field (comma or newline separated)
            const emailsArray: string[] = lead.email
                ? lead.email.split(/[\n,]+/).map((e: string) => e.trim()).filter((e: string) => e)
                : [];

            if (emailsArray.length === 0) {
                console.warn(`Lead ${lead.id} has no email address. Skipping.`);
                results.push({ id: lead.id, status: 'skipped_no_email' });
                continue;
            }

            try {
                // 3. Send via lib/resend.ts — domain rotation + daily cap enforced there
                const primaryEmail = emailsArray[0];
                const result = await sendOutreachEmail(
                    lead.id,
                    `phase_${nextPhase}`,
                    primaryEmail,
                    template.subject,
                    template.html
                );

                if (!result.success) {
                    console.error(`Failed to send email to ${primaryEmail}:`, result.error);
                    results.push({ id: lead.id, status: 'error', error: result.error });
                    continue;
                }

                // 4. Calculate next step date
                const nextDate = new Date();
                const phaseDelays: Record<number, number> = {
                    1: 7, 2: 7, 3: 7, 4: 7, 5: 7, 6: 7, 7: 7, 8: 0,
                };
                const delay = phaseDelays[nextPhase] ?? 7;
                nextDate.setDate(nextDate.getDate() + delay);
                
                // Add natural variance +/- 20 minutes
                const jitterMs = (Math.random() - 0.5) * 40 * 60 * 1000;
                nextDate.setTime(nextDate.getTime() + jitterMs);

                const maxPhase = lead.campaign_type === '5_week_saf_campaign' ? 5 : 8;
                const isCompleted = nextPhase >= maxPhase;

                // 5. Update lead in Supabase
                await supabaseAdmin
                    .from('leads')
                    .update({
                        current_phase: nextPhase,
                        next_step_date: isCompleted ? null : nextDate.toISOString(),
                        status: isCompleted ? 'completed' : 'active',
                    })
                    .eq('id', lead.id);

                results.push({
                    id: lead.id,
                    phase: nextPhase,
                    status: 'success',
                    domain: result.domainUsed,
                });
                console.log(`Phase ${nextPhase} sent for lead ${lead.id} via ${result.domainUsed}`);

            } catch (err) {
                console.error(`Unexpected error processing lead ${lead.id}:`, err);
                results.push({ id: lead.id, status: 'error', error: err });
            }
        }

        return NextResponse.json({
            message: 'Outreach cron job completed',
            processed: results.length,
            results,
        });

    } catch (error) {
        console.error('Fatal cron error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
