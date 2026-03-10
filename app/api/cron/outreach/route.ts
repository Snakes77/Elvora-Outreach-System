import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getTemplateForPhase } from '@/lib/outreach-templates';

export const dynamic = 'force-dynamic';

// Vercel cron jobs use GET requests by default
export async function GET(request: Request) {
    // Simple security check for Vercel Cron
    // You should set an environment variable CRON_SECRET in Vercel
    const authHeader = request.headers.get('authorization');
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        console.log('Running outreach cron job...');

        // 1. Fetch leads that are 'active' and due for their next step
        const { data: leads, error: fetchError } = await supabaseAdmin
            .from('leads')
            .select('*')
            .eq('status', 'active')
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
            const nextPhase = lead.current_phase + 1;

            // Get the email template for the next phase
            const template = getTemplateForPhase(nextPhase, lead.id, {
                name: lead.name,
                branch: lead.branch,
                tier: lead.tier,
                size: lead.size,
                note: lead.note
            });

            if (!template) {
                // If there are no more templates, mark as completed
                await supabaseAdmin
                    .from('leads')
                    .update({ status: 'completed' })
                    .eq('id', lead.id);

                results.push({ id: lead.id, status: 'completed' });
                continue;
            }

            // Handle multiple emails in the lead.email field (separated by newline or comma)
            const emailsArray = lead.email
                .split(/[\n,]+/)
                .map((e: string) => e.trim())
                .filter((e: string) => e);

            try {
                // 3. Send the email via Resend
                const { data: emailData, error: emailError } = await resend.emails.send({
                    from: 'Melissa <melissa@elvoraconsulting.co.uk>',
                    to: emailsArray,
                    subject: template.subject,
                    html: template.html,
                    tags: [
                        { name: 'lead_id', value: lead.id }
                    ]
                });

                if (emailError) {
                    console.error(`Failed to send email to ${lead.email}:`, emailError);
                    results.push({ id: lead.id, status: 'error', error: emailError });
                    continue;
                }

                // 4. Calculate next step date based on the phase sent
                let nextDate = new Date();
                if (nextPhase === 1) {
                    nextDate.setDate(nextDate.getDate() + 3);  // Day 3 for Value Email
                } else if (nextPhase === 2) {
                    nextDate.setDate(nextDate.getDate() + 4);  // Day 7 for Social Proof (3 + 4)
                } else if (nextPhase === 3) {
                    nextDate.setDate(nextDate.getDate() + 7);  // Day 14 for Breakup (7 + 7)
                } else {
                    // Beyond phase 4, no more emails
                }

                const isCompleted = nextPhase === 4;

                // 5. Update lead in Supabase
                await supabaseAdmin
                    .from('leads')
                    .update({
                        current_phase: nextPhase,
                        next_step_date: nextDate.toISOString(),
                        status: isCompleted ? 'completed' : 'active'
                    })
                    .eq('id', lead.id);

                results.push({ id: lead.id, phase: nextPhase, status: 'success' });
                console.log(`Successfully processed phase ${nextPhase} for ${lead.email}`);

            } catch (err) {
                console.error(`Unexpected error processing lead ${lead.id}:`, err);
                results.push({ id: lead.id, status: 'error', error: err });
            }
        }

        return NextResponse.json({
            message: 'Outreach cron job completed',
            processed: results.length,
            results
        });

    } catch (error) {
        console.error('Fatal cron error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
