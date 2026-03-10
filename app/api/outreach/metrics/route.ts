import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        // Fetch summary stats from Supabase
        const { data: leads, error } = await supabaseAdmin
            .from('leads')
            .select('status, current_phase');

        if (error) throw error;

        const stats = {
            total: leads.length,
            active: leads.filter((l: any) => l.status === 'active').length,
            replied: leads.filter((l: any) => l.status === 'replied').length,
            interested: leads.filter((l: any) => l.status === 'interested').length,
            unsubscribed: leads.filter((l: any) => l.status === 'unsubscribed').length,
            completed: leads.filter((l: any) => l.status === 'completed').length,
            byPhase: {
                phase1: leads.filter((l: any) => l.current_phase === 1).length,
                phase2: leads.filter((l: any) => l.current_phase === 2).length,
                phase3: leads.filter((l: any) => l.current_phase === 3).length,
                phase4: leads.filter((l: any) => l.current_phase === 4).length,
            }
        };

        return NextResponse.json(stats);
    } catch (err) {
        console.error('Metrics error:', err);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
