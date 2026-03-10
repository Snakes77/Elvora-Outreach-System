type LeadConfig = {
  name: string;
  branch?: string;
  tier?: 'hot' | 'warm';
  size?: 'Small' | 'Medium' | 'Large';
  note?: string;
};

// Returns firstName from full name, e.g., "Katie & Darren Starr" -> "Katie & Darren" or "Katie"
const formatName = (fullName: string) => {
  if (fullName.includes('&')) {
    return fullName.replace(/([a-zA-Z& ]+).*/, '$1').trim();
  }
  return fullName.split(' ')[0];
};

// ─────────────────────────────────────────────
// BOOKING LINK – set this to Melissa's Microsoft Bookings page URL
// Go to: https://outlook.office.com/bookings to create one
// Example: "https://outlook.office.com/bookings/s/xxxxxxxx"
const BOOKING_URL = 'https://outlook.office.com/bookings/s/PLACEHOLDER';
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// PHONE NUMBER – update with Melissa's number
const PHONE = '0115 646 8587';
// ─────────────────────────────────────────────

// The circular logo used in the live website header
const LOGO_URL = 'https://elvoraconsulting.co.uk/icon.png';

export const getSignatureHTML = (config: {
  name?: string;
  role?: string;
  phone?: string;
  email?: string;
}) => {
  const name = config.name || 'Melissa Meakin';
  const role = config.role || 'CARE CONSULTANT';
  const phone = config.phone || PHONE;
  const emailAddress = config.email || 'melissa@elvoraconsulting.co.uk';

  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;width:640px;max-width:640px;margin-top:24px;">
    <!-- TOP RULE -->
    <tr>
      <td colspan="3" height="2" style="background:#0F8B8D;font-size:0;line-height:0;padding:0;">&nbsp;</td>
    </tr>
    <!-- MAIN COLUMNS -->
    <tr>
      <!-- LEFT: logo + brand stack (200px) -->
      <td width="200" valign="top" align="center" style="padding:20px 16px 20px 0;border-right:2px solid #0F8B8D;width:200px;">
        <a href="https://elvoraconsulting.co.uk" style="text-decoration:none;color:inherit;" target="_blank">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
          <!-- Header zone: 68px fixed height — logo centred here -->
          <tr>
            <td align="center" valign="middle" height="68" style="height:68px;padding:0;">
              <img src="${LOGO_URL}" width="68" height="68" alt="Elvora Consulting"
                   style="display:block;border:0;outline:none;text-decoration:none;border-radius:50%;">
            </td>
          </tr>
          <tr><td height="8" style="font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td align="center" style="font-size:15px;font-weight:700;color:#1F2937;line-height:1.25;white-space:nowrap;">
              Elvora&nbsp;<span style="color:#0F8B8D;">Consulting</span>
            </td>
          </tr>
          <tr><td height="5" style="font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td align="center" style="font-size:9px;font-weight:700;color:#0F8B8D;text-transform:uppercase;letter-spacing:1.5px;line-height:1.5;">
              CARE QUALITY<br>EXCELLENCE
            </td>
          </tr>
        </table>
        </a>
      </td>

      <!-- VERTICAL DIVIDER -->
      <td width="2" style="background:#0F8B8D;width:2px;font-size:0;line-height:0;">&nbsp;</td>

      <!-- RIGHT: contact details (438px) -->
      <td width="438" valign="top" style="padding:20px 0 20px 20px;width:438px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;">
          <!-- Header zone: 68px fixed height — name + role centred here -->
          <tr>
            <td valign="middle" height="68" style="height:68px;padding:0;">
              <div style="font-size:16px;font-weight:700;color:#1F2937;margin:0 0 7px 0;line-height:1.2;">${name}</div>
              <div style="font-size:11px;font-weight:700;color:#0F8B8D;text-transform:uppercase;letter-spacing:1.6px;line-height:1.3;">
                ${role}&nbsp;&nbsp;|&nbsp;&nbsp;ELVORA CONSULTING
              </div>
            </td>
          </tr>
          <tr><td height="10" style="font-size:0;line-height:0;">&nbsp;</td></tr>
          <!-- Contact rows -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-size:12px;color:#1F2937;line-height:1.85;">
                <tr>
                  <td width="22" valign="top" style="font-weight:700;padding-right:4px;white-space:nowrap;color:#1F2937;">T:</td>
                  <td style="color:#1F2937;">${phone}</td>
                </tr>
                <tr>
                  <td width="22" valign="top" style="font-weight:700;padding-right:4px;white-space:nowrap;color:#1F2937;">E:</td>
                  <td><a href="mailto:${emailAddress}" style="color:#0F8B8D;text-decoration:none;">${emailAddress}</a></td>
                </tr>
                <tr>
                  <td width="22" valign="top" style="font-weight:700;padding-right:4px;white-space:nowrap;color:#1F2937;">W:</td>
                  <td><a href="https://elvoraconsulting.co.uk" style="color:#0F8B8D;text-decoration:none;">elvoraconsulting.co.uk</a></td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Tagline -->
          <tr>
            <td style="padding-top:10px;font-size:11px;font-style:italic;color:#6B7280;line-height:1.55;">
              &#8220;Empowering providers to deliver care with Comfort, Freedom, and Dignity&#8221;
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;
};

const signature = getSignatureHTML({});

const bookingButton = (label = 'Book a 20 Minute Call') => `
  <div style="margin: 24px 0;">
    <a href="${BOOKING_URL}"
       style="display: inline-block; background-color: #0F8B8D; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
      &#128197; ${label}
    </a>

  </div>
`;

export const OutreachTemplates = {
  // EMAIL 1 – Day 0: Warm Open (AGM intro)
  Phase1_WarmOpen: (lead: LeadConfig) => {
    const firstName = formatName(lead.name);
    return {
      subject: `Great to meet you at the My Homecare AGM – Elvora Consulting`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
          <p>Hi ${firstName},</p>
          <p>I hope you're well. I'm Melissa Meakin from Elvora Consulting – I had the pleasure of presenting at the My Homecare AGM last November.</p>
          <p>Darren very kindly shared your details and suggested we connect, as he felt the work we do in CQC compliance and care quality could be really useful for your business.</p>
          <p>In brief, we support domiciliary care providers to strengthen their quality systems, prepare for CQC inspection, and build confidence in their teams – so that inspections feel less stressful and more like a showcase of the great work you're already doing.</p>
          <p>I'd love to hear a little about where things are for you at the moment. Would you be open to a short call, or shall I send across a brief overview of how we work?</p>
          ${bookingButton('Book a Short Call With Me')}
          <p style="color: #888; font-size: 13px;">Or simply reply to this email – I'm happy to go from there.</p>
          ${signature}
        </div>
      `
    };
  },

  // EMAIL 2 – Day 3: Value (CQC Single Assessment Framework)
  Phase2_Value: (lead: LeadConfig) => {
    const firstName = formatName(lead.name);
    return {
      subject: `One thing CQC inspectors always check first…`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
          <p>Hi ${firstName},</p>
          <p>Under the CQC's current Single Assessment Framework, the very first thing inspectors assess is how well a service understands its own quality – not just whether things are going right, but whether the provider genuinely knows when things aren't, and what they're doing about it.</p>
          <p>For domiciliary care providers, this often catches people off guard. Strong care delivery doesn't always translate into the kind of documented evidence CQC now expects.</p>
          <p>At Elvora Consulting, we work with domiciliary care providers to bridge exactly that gap – so that the care you're delivering every day is clearly visible in your records, audits, and quality processes.</p>
          <p>I reached out a few days ago – I'm Melissa Meakin, and we met (or nearly met!) at the My Homecare AGM back in November.</p>
          <p>Would a 20 minute call be useful to talk through where you are with CQC readiness? Happy to work around your schedule.</p>
          ${bookingButton('Book a 20 Minute Call')}
          ${signature}
        </div>
      `
    };
  },

  // EMAIL 3 – Day 7: Social Proof (6-week case study)
  Phase3_SocialProof: (lead: LeadConfig) => {
    const firstName = formatName(lead.name);
    return {
      subject: `How we helped a domiciliary care provider get inspection ready in 6 weeks`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
          <p>Hi ${firstName},</p>
          <p>I'll keep this short.</p>
          <p>A domiciliary care provider came to us six weeks before a CQC inspection with significant gaps in their care documentation and no structured quality audit process in place. Their team were doing brilliant work on the ground, but it simply wasn't visible on paper.</p>
          <p>We worked alongside their registered manager and team to strengthen their evidence base, embed a sustainable audit cycle, and prepare leadership for the kind of questions inspectors ask. They went into their inspection feeling confident rather than anxious.</p>
          <p>We already work with providers across the My Homecare network, and Darren introduced us at the AGM because he believed our approach would genuinely help franchise owners like yourself.</p>
          <p>If you'd find a brief overview of our services helpful, I'm happy to send one across. Or if a call works better, I'm flexible.</p>
          ${bookingButton('Check My Availability')}
          ${signature}
        </div>
      `
    };
  },

  // EMAIL 4 – Day 14: Polite Breakup
  Phase4_Breakup: (lead: LeadConfig) => {
    const firstName = formatName(lead.name);
    return {
      subject: `Last email from me – Elvora Consulting`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
          <p>Hi ${firstName},</p>
          <p>I've reached out a couple of times over the past few weeks. I completely understand – running a care business is demanding and inboxes fill up fast.</p>
          <p>I won't keep emailing after this one. I just wanted to leave the door open: if CQC readiness, quality improvement, or compliance support ever becomes a priority, Elvora Consulting would be delighted to help. Darren Starr at My Homecare head office can also vouch for our work.</p>
          <p>You're welcome to reach out at any time at <a href="mailto:melissa@elvoraconsulting.co.uk" style="color: #0D7377;">melissa@elvoraconsulting.co.uk</a> or visit <a href="https://elvoraconsulting.co.uk" style="color: #0D7377;">elvoraconsulting.co.uk</a>. Or simply use the link below if a call ever suits.</p>
          ${bookingButton("Book a Call Whenever You're Ready")}
          ${signature}
        </div>
      `
    };
  }
};

const unsubscribeLink = (leadId: string) => `
  <div style="margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #9ca3af; text-align: center;">
    You are receiving this because we met at the My Homecare AGM. 
    <br/>
    No longer wish to receive these? <a href="https://elvoraconsulting.co.uk/api/outreach/unsubscribe?id=${leadId}" style="color: #0F8B8D; text-decoration: underline;">Unsubscribe here</a>
  </div>
`;

export const getTemplateForPhase = (phase: number, leadId: string, lead: LeadConfig) => {
  let template;
  switch (phase) {
    case 1: template = OutreachTemplates.Phase1_WarmOpen(lead); break;
    case 2: template = OutreachTemplates.Phase2_Value(lead); break;
    case 3: template = OutreachTemplates.Phase3_SocialProof(lead); break;
    case 4: template = OutreachTemplates.Phase4_Breakup(lead); break;
    default: return null;
  }

  // Inject unsubscribe link at the end of the HTML
  return {
    ...template,
    html: template.html + unsubscribeLink(leadId)
  };
};
