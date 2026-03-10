import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('id');

    if (!leadId) {
        return new NextResponse('Invalid Unsubscribe Link', { status: 400 });
    }

    try {
        // Update lead status to 'unsubscribed'
        const { error } = await supabaseAdmin
            .from('leads')
            .update({ status: 'unsubscribed' })
            .eq('id', leadId);

        if (error) throw error;

        // Return a nice HTML confirmation page
        return new NextResponse(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #0F8B8D;">Unsubscribed Successfully</h1>
        <p>You have been removed from our outreach list. We're sorry to see you go!</p>
        <a href="https://elvoraconsulting.co.uk" style="color: #0F8B8D; text-decoration: none; font-weight: bold;">Return to Elvora Consulting</a>
      </div>
    `, {
            headers: { 'Content-Type': 'text/html' }
        });
    } catch (err) {
        console.error('Unsubscribe error:', err);
        return new NextResponse('Error performing unsubscribe. Please try again later.', { status: 500 });
    }
}
