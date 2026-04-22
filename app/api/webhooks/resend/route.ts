import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';

// Verify Resend webhook signature to prevent spoofed events.
// Set RESEND_WEBHOOK_SECRET in env vars from your Resend dashboard → Webhooks → Signing Secret.
function verifyResendSignature(rawBody: string, signatureHeader: string | null): boolean {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) return true; // Skip check if not configured (dev / local)
    if (!signatureHeader) return false;

    const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(signatureHeader, 'hex')
    );
}

// Resend sends webhooks as POST requests
export async function POST(request: Request) {
    try {
        const rawBody = await request.text();

        if (!verifyResendSignature(rawBody, request.headers.get('svix-signature'))) {
            console.error('[webhook] Invalid Resend signature — request rejected.');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const payload = JSON.parse(rawBody);

        // Verify it's an email.received event (inbound email routing)
        if (payload.type === 'email.received') {
            const emailData = payload.data;

            // Extract the sender's email address from the "from" field
            // The "from" field might look like "John Doe <john@example.com>"
            const fromString = emailData.from || '';
            const emailMatch = fromString.match(/<([^>]+)>/);
            const senderEmail = emailMatch ? emailMatch[1].toLowerCase() : fromString.toLowerCase();

            if (!senderEmail) {
                return NextResponse.json({ message: 'No sender email found in payload' }, { status: 400 });
            }

            console.log(`Received reply from: ${senderEmail}`);

            // 1. Search for an active lead containing this email
            // We use 'ilike' %email% because the lead email field might contain multiple emails
            const { data: leads, error: fetchError } = await supabaseAdmin
                .from('leads')
                .select('*')
                .eq('status', 'active')
                .ilike('email', `%${senderEmail}%`);

            if (fetchError) {
                console.error('Error fetching leads for webhook:', fetchError);
                return NextResponse.json({ error: 'Database error' }, { status: 500 });
            }

            // 2. If a matching lead is found, mark them as 'replied'
            if (leads && leads.length > 0) {
                for (const lead of leads) {
                    const { error: updateError } = await supabaseAdmin
                        .from('leads')
                        .update({ status: 'replied' })
                        .eq('id', lead.id);

                    if (updateError) {
                        console.error(`Failed to update lead ${lead.id} status:`, updateError);
                    } else {
                        console.log(`✅ Lead ${lead.id} (${lead.email}) marked as replied. Campaign paused.`);
                    }
                }
            } else {
                console.log(`No active lead found for email ${senderEmail}. Ignoring.`);
            }
        }

        // 2. Interest Detection (Link Click)
        if (payload.type === 'email.clicked') {
            const clickData = payload.data;
            const leadId = clickData.tags?.lead_id;
            const clickedUrl = clickData.url;

            console.log(`Link clicked in email. Lead ID: ${leadId}, URL: ${clickedUrl}`);

            if (leadId) {
                // Mark the lead as 'interested' (pauses the campaign)
                const { error: updateError } = await supabaseAdmin
                    .from('leads')
                    .update({ status: 'interested' })
                    .eq('id', leadId);

                if (updateError) {
                    console.error(`Failed to update lead ${leadId} status on click:`, updateError);
                } else {
                    console.log(`✅ Lead ${leadId} marked as interested. Campaign paused.`);
                }
            }
        }

        // 3. GDPR Opt-out (Unsubscribe)
        if (payload.type === 'email.unsubscribed') {
            const unsubData = payload.data;
            const leadId = unsubData.tags?.lead_id;

            console.log(`Unsubscribe event received. Lead ID: ${leadId}`);

            if (leadId) {
                const { error: updateError } = await supabaseAdmin
                    .from('leads')
                    .update({ status: 'unsubscribed' })
                    .eq('id', leadId);

                if (updateError) {
                    console.error(`Failed to update lead ${leadId} status on unsubscribe:`, updateError);
                } else {
                    console.log(`✅ Lead ${leadId} automatically marked as unsubscribed.`);
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Webhook processing error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
