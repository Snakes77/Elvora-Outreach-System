import { Resend } from 'resend';
import { supabaseAdmin } from './supabase-admin';

// Lazy initialisation — do NOT instantiate at module level.
// Scripts load env vars after importing this module, so reading RESEND_API_KEY
// at import time would always be undefined.
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not set in environment');
    _resend = new Resend(key);
  }
  return _resend;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN POLICY
// elvoraconsulting.co.uk is the REAL brand domain — it must NEVER be used for
// bulk outreach. It is only set as reply-to so that replies land in the right
// inbox. All outreach rotates across the 5 .org domains below.
// ─────────────────────────────────────────────────────────────────────────────
const REPLY_TO = 'melissa@elvoraconsulting.co.uk';

const OUTREACH_DOMAINS = [
  'myelvoraconsulting.org',
  'tryelvoraconsulting.org',
  'getelvoraconsulting.org',
  'goelvoraconsulting.org',
  'useelvoraconsulting.org',
];

const DAILY_CAP_PER_DOMAIN = 50;

/**
 * Picks the .org domain with the most remaining daily send capacity.
 * Falls back to the hard-coded OUTREACH_DOMAINS list if Supabase is unavailable.
 * The real .co.uk domain is NEVER returned here.
 */
async function getOptimalSendingDomain(): Promise<string> {
  let pool: string[] = OUTREACH_DOMAINS;

  // Try to load the .org domain list from system_config (optional override)
  try {
    const { data } = await supabaseAdmin
      .from('system_config')
      .select('value')
      .eq('key', 'sending_domains')
      .single();

    if (data?.value && Array.isArray(data.value)) {
      const orgDomains = (data.value as Array<{ domain: string; verified: boolean }>)
        .filter(d => d.verified && d.domain?.endsWith('.org'))
        .map(d => d.domain);
      if (orgDomains.length > 0) pool = orgDomains;
    }
  } catch {
    // Non-fatal — use the hard-coded list
  }

  // Check today's usage per domain
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const usage: Record<string, number> = {};
  pool.forEach(d => (usage[d] = 0));

  try {
    const { data: sendData } = await supabaseAdmin
      .from('email_sends')
      .select('sending_domain')
      .gte('sent_at', startOfDay.toISOString());

    if (sendData) {
      sendData.forEach((record: { sending_domain: string }) => {
        if (usage[record.sending_domain] !== undefined) {
          usage[record.sending_domain]++;
        }
      });
    }
  } catch {
    // Non-fatal — just pick the first available
    return pool[0];
  }

  for (const domain of pool) {
    if (usage[domain] < DAILY_CAP_PER_DOMAIN) return domain;
  }

  throw new Error('All .org outreach domains have reached their daily cap of ' + DAILY_CAP_PER_DOMAIN);
}

export async function sendOutreachEmail(
  leadId: string,
  stepId: string,
  toEmail: string,
  subject: string,
  htmlContent: string,
  textContent?: string
) {
  try {
    const activeDomain = await getOptimalSendingDomain();
    const fromAddress = `Melissa Meakin <melissa@${activeDomain}>`;

    // Strictly enforce domain matching across all embedded HTML assets
    const finalHtmlContent = htmlContent.replace(/\{\{SENDING_DOMAIN\}\}/g, activeDomain);
    const finalTextContent = textContent ? textContent.replace(/\{\{SENDING_DOMAIN\}\}/g, activeDomain) : undefined;

    const { data, error } = await getResend().emails.send({
      from: fromAddress,
      to: [toEmail],
      replyTo: [REPLY_TO],
      subject,
      html: finalHtmlContent,
      ...(finalTextContent ? { text: finalTextContent } : {}),
      // Tags are required for the Resend webhook to route click/unsubscribe events back to a lead
      tags: [
        { name: 'lead_id', value: leadId },
        { name: 'step_id', value: stepId },
      ],
    });

    if (error) {
      console.error('Resend API error:', error);
      throw error;
    }

    // Log the send to Supabase
    const { error: dbError } = await supabaseAdmin
      .from('email_sends')
      .insert({
        lead_id: leadId,
        step_id: stepId,
        // resend_id: data?.id, // schema error PGRST204
        sending_domain: activeDomain,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('Failed to log email_send in DB:', dbError);
    }

    return { success: true, resendId: data?.id, domainUsed: activeDomain };
  } catch (err) {
    console.error('Failed to send outreach email:', err);
    return { success: false, error: err };
  }
}
