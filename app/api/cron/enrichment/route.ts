import { NextResponse } from 'next/server';
import { runFullEnrichmentPipeline } from '@/lib/enrichment-orchestrator';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Enrichment cron — runs daily at 07:00 UTC (weekdays), one hour before
// the outreach sequence runner at 08:00 UTC, so all new CQC-sourced leads
// are enriched before the sequence runner picks them up.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const report = await runFullEnrichmentPipeline();
        return NextResponse.json(report);
    } catch (error: any) {
        console.error('[enrichment cron] Fatal error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
