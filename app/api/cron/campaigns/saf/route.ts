import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SAFTemplates } from '@/lib/campaigns/saf-5-week/templates';
import { sendOutreachEmail } from '@/lib/resend';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// SECURE SAF CAMPAIGN (5-WEEK) RUNNER
// Vercel cron fires securely in isolation from legacy campaigns.
// Only processes leads strictly bound to '5_week_saf_campaign'
// ─────────────────────────────────────────────────────────────────────────────

const PHASE_DELAYS_DAYS: Record<number, number> = {
    1: 7,
    2: 7,
    3: 7,
    4: 7,
    5: 0, // Final phase
};

const MAX_PHASE = 5;

const getSafTemplateForPhase = (phase: number, leadConfig: any) => {
    switch (phase) {
        case 1: return SAFTemplates.Week1_Safe(leadConfig);
        case 2: return SAFTemplates.Week2_Effective(leadConfig);
        case 3: return SAFTemplates.Week3_Caring(leadConfig);
        case 4: return SAFTemplates.Week4_Responsive(leadConfig);
        case 5: return SAFTemplates.Week5_WellLed(leadConfig);
        default: return null;
    }
}

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('[SAF Sequence] Booting isolated SAF Sequence Runner...');

        const { data: leads, error: fetchError } = await supabaseAdmin
            .from('leads')
            .select('*')
            .eq('status', 'active')
            .eq('email_enrichment_status', 'found')
            .eq('campaign_type', '5_week_saf_campaign') // STRICT ISOLATION FILTER
            .lte('next_step_date', new Date().toISOString())
            .limit(15); // Stagger sending for smooth delivery across the hour

        if (fetchError) {
            console.error('[SAF Sequence] Failed to fetch leads:', fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!leads || leads.length === 0) {
            console.log('[SAF Sequence] No leads due today.');
            return NextResponse.json({ message: 'No leads due for follow-up today' });
        }

        console.log(`[SAF Sequence] Extracted ${leads.length} SAF lead(s) due.`);

        const results: Array<Record<string, unknown>> = [];

        for (const lead of leads) {
            const nextPhase: number = (lead.current_phase || 0) + 1;

            if (nextPhase > MAX_PHASE) {
                await supabaseAdmin.from('leads').update({ status: 'completed', next_step_date: null }).eq('id', lead.id);
                results.push({ id: lead.id, status: 'completed_guard' });
                continue;
            }

            const template = getSafTemplateForPhase(nextPhase, {
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
                campaign_type: lead.campaign_type,
            });

            if (!template) {
                await supabaseAdmin.from('leads').update({ status: 'completed', next_step_date: null }).eq('id', lead.id);
                results.push({ id: lead.id, status: 'completed' });
                continue;
            }

            const emails: string[] = lead.email ? lead.email.split(/[\n,]+/).map((e: string) => e.trim()).filter(Boolean) : [];

            if (emails.length === 0) {
                results.push({ id: lead.id, status: 'skipped_no_email' });
                continue;
            }

            try {
                const result = await sendOutreachEmail(lead.id, `phase_${nextPhase}`, emails[0], template.subject, template.html);

                if (!result.success) {
                    console.error(`[SAF Sequence] Send failed for ${lead.id}:`, result.error);
                    results.push({ id: lead.id, phase: nextPhase, status: 'error', error: String(result.error) });
                    continue;
                }

                const isCompleted = nextPhase >= MAX_PHASE;
                const nextDate = new Date();
                const delay = PHASE_DELAYS_DAYS[nextPhase] ?? 7;
                nextDate.setDate(nextDate.getDate() + delay);

                await supabaseAdmin
                    .from('leads')
                    .update({
                        current_phase: nextPhase,
                        next_step_date: isCompleted ? null : nextDate.toISOString(),
                        status: isCompleted ? 'completed' : 'active',
                    })
                    .eq('id', lead.id);

                console.log(`[SAF Sequence] Sent Phase ${nextPhase}/${MAX_PHASE} to ${lead.id} via ${result.domainUsed}`);
                results.push({ id: lead.id, phase: nextPhase, status: isCompleted ? 'sequence_complete' : 'success', domain: result.domainUsed });

            } catch (err) {
                console.error(`[SAF Sequence] Error for ${lead.id}:`, err);
                results.push({ id: lead.id, status: 'error', error: String(err) });
            }
        }

        const sent = results.filter(r => r.status === 'success' || r.status === 'sequence_complete').length;
        console.log(`[SAF Sequence] Complete. ${sent}/${leads.length} sent.`);
        return NextResponse.json({ message: 'SAF Runner completed', leads_processed: leads.length, sent, results });

    } catch (error) {
        console.error('[SAF Sequence] Fatal error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
