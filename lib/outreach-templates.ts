type LeadConfig = {
  name: string;
  branch?: string;
  tier?: 'hot' | 'warm';
  size?: 'Small' | 'Medium' | 'Large';
  note?: string;
  // CQC specific
  cqc_location_id?: string;
  last_inspection_date?: string;
  rating_safe?: string;
  rating_effective?: string;
  rating_caring?: string;
  rating_responsive?: string;
  rating_well_led?: string;
};

// Returns firstName from full name, e.g., "Katie & Darren Starr" -> "Katie & Darren" or "Katie"
const formatName = (fullName: string) => {
  if (fullName.includes('&')) {
    return fullName.replace(/([a-zA-Z& ]+).*/, '$1').trim();
  }
  return fullName.split(' ')[0];
};

const getWeakestQualityStatement = (lead: LeadConfig) => {
  const ratings = [
    { name: 'Safe', rating: lead.rating_safe },
    { name: 'Effective', rating: lead.rating_effective },
    { name: 'Caring', rating: lead.rating_caring },
    { name: 'Responsive', rating: lead.rating_responsive },
    { name: 'Well led', rating: lead.rating_well_led },
  ];

  const riRating = ratings.find(r => r.rating?.toLowerCase() === 'requires improvement');
  return riRating ? riRating.name : 'Well led';
};

// ─────────────────────────────────────────────
// BOOKING LINK – set this to Melissa's Microsoft Bookings page URL
const BOOKING_URL = 'https://outlook.office.com/bookwithme/user/e97f487ef98b49689b66cfc0528a60aa@elvoraconsulting.co.uk?anonymous&ep=pcard';
const PHONE = '0115 646 8587';
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
    <tr><td colspan="3" height="2" style="background:#0F8B8D;font-size:0;line-height:0;padding:0;">&nbsp;</td></tr>
    <tr>
      <td width="200" valign="top" align="center" style="padding:20px 16px 20px 0;border-right:2px solid #0F8B8D;width:200px;">
        <a href="https://elvoraconsulting.co.uk" style="text-decoration:none;color:inherit;" target="_blank">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
          <tr><td align="center" valign="middle" height="68" style="height:68px;padding:0;"><img src="${LOGO_URL}" width="68" height="68" alt="Elvora Consulting" style="display:block;border:0;outline:none;border-radius:50%;"></td></tr>
          <tr><td height="8" style="font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td align="center" style="font-size:15px;font-weight:700;color:#1F2937;line-height:1.25;">Elvora&nbsp;<span style="color:#0F8B8D;">Consulting</span></td></tr>
          <tr><td align="center" style="font-size:9px;font-weight:700;color:#0F8B8D;text-transform:uppercase;letter-spacing:1.5px;">CARE QUALITY<br>EXCELLENCE</td></tr>
        </table>
        </a>
      </td>
      <td width="2" style="background:#0F8B8D;width:2px;">&nbsp;</td>
      <td width="438" valign="top" style="padding:20px 0 20px 20px;width:438px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          <tr><td valign="middle" height="68" style="height:68px;"><div style="font-size:16px;font-weight:700;color:#1F2937;">${name}</div><div style="font-size:11px;font-weight:700;color:#0F8B8D;text-transform:uppercase;">${role}&nbsp;&nbsp;|&nbsp;&nbsp;ELVORA CONSULTING</div></td></tr>
          <tr><td><table style="font-size:12px;color:#1F2937;line-height:1.85;">
                <tr><td width="22" style="font-weight:700;">T:</td><td>${phone}</td></tr>
                <tr><td width="22" style="font-weight:700;">E:</td><td><a href="mailto:${emailAddress}" style="color:#0F8B8D;text-decoration:none;">${emailAddress}</a></td></tr>
                <tr><td width="22" style="font-weight:700;">W:</td><td><a href="https://elvoraconsulting.co.uk" style="color:#0F8B8D;text-decoration:none;">elvoraconsulting.co.uk</a></td></tr>
          </table></td></tr>
        </table>
      </td>
    </tr>
  </table>`;
};

const signature = `
  <p style="margin:16px 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#333333;line-height:1.6;">Kind regards,</p>
  ${getSignatureHTML({})}`;
const bookingButton = (label = 'Book a 20 Minute Call') => `
  <div style="margin: 24px 0;">
    <a href="${BOOKING_URL}" style="display: inline-block; background-color: #0F8B8D; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
      🗓️ ${label}
    </a>
  </div>`;

export const OutreachTemplates = {
  // WEEK 1: The Bridge & Quality Statement Anchor
  Week1: (lead: LeadConfig) => {
    const firstName = formatName(lead.name);
    const weakest = getWeakestQualityStatement(lead);
    const subject = lead.last_inspection_date 
      ? `CQC Single Assessment Framework: Observations on your ${new Date(lead.last_inspection_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} report`
      : 'Quick question about your latest CQC rating';

    return {
      subject,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
          <p>Hi ${firstName},</p>
          <p>I was recently reviewing the CQC data for Midlands care providers and noticed your latest assessment.</p>
          <p>Under the new <strong>Single Assessment Framework</strong>, the <strong>${weakest}</strong> category has become a major area of focus for many. It is a common challenge, often the fantastic care being delivered by the team does not always translate perfectly into the data and evidence that the CQC now expects on a continuous basis.</p>
          <p>At Elvora Consulting, we specialise in helping providers bridge that gap. We ensure your quality systems are effective enough to "self audit" against the 34 new Quality Statements, so there are no surprises when the next assessment window opens.</p>
          <p>Would you be open to a brief 10 minute chat about how we've helped other providers move from RI to Good by focusing on ${weakest}?</p>
          ${bookingButton('Book a Short Call')}
          ${signature}
        </div>`
    };
  },

  // WEEK 2: The Data Gap
  Week2: (lead: LeadConfig) => {
    const firstName = formatName(lead.name);
    return {
      subject: `The Evidence in the Single Assessment Framework…`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
          <p>Hi ${firstName},</p>
          <p>Under the CQC's current Single Assessment Framework, the first thing they look at is not just whether things are going right, it is whether the leadership <em>knows</em> when they are not, and what is being done about it.</p>
          <p>Many providers find that their documentation is the biggest challenge. Strong care delivery does not always mean strong evidence against the new Quality Statements.</p>
          <p>I reached out last week, I am Melissa Meakin, and we help care homes in the Midlands turn their everyday excellence into documented compliance that the CQC now expects.</p>
          <p>Is this something you're currently working on, or shall we connect once your current audit cycle is complete?</p>
          ${bookingButton('Book a 20 Minute Call')}
          ${signature}
        </div>`
    };
  },

  // WEEK 3: Leadership/Well led Focus
  Week3: (lead: LeadConfig) => {
    const firstName = formatName(lead.name);
    return {
      subject: `Supporting your Registered Manager`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
          <p>Hi ${firstName},</p>
          <p>The role of a Registered Manager is more demanding than ever. Between recruitment and daily operations, keeping a constant pulse on the Well led criteria can feel like a secondary task until an inspection is imminent.</p>
          <p>We work as a mentor or partner to managers, providing an external quality eye to catch gaps before they become report findings.</p>
          <p>Would it be useful to send you a brief overview of how we support managers with their quality systems?</p>
          ${bookingButton('Check My Availability')}
          ${signature}
        </div>`
    };
  },

  // WEEK 4: Social Proof (6-week case study)
  Week4: (lead: LeadConfig) => {
    const firstName = formatName(lead.name);
    return {
      subject: `From RI to Good in 6 weeks: Case Study`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
          <p>Hi ${firstName},</p>
          <p>I'll keep this short. We recently worked with a provider in the Midlands who was struggling with their quality audit process.</p>
          <p>In 6 weeks, we helped them implement a digital audit cycle and prepare their team for inspector interviews. They moved from a "Requires Improvement" rating to "Good" in their latest visit.</p>
          <p>Would you like to see the framework we used?</p>
          ${bookingButton('Show Me the Framework')}
          ${signature}
        </div>`
    };
  },

  // WEEK 5: Mock Inspections
  Week5: (lead: LeadConfig) => {
    const firstName = formatName(lead.name);
    return {
      subject: `Mock Inspection: Preparation without the stress`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
          <p>Hi ${firstName},</p>
          <p>The best way to prepare for a CQC visit is to see your service through an inspector's eyes before they arrive.</p>
          <p>Our mock inspections provide a safe environment to identify risks and celebrate successes, giving your team the confidence to speak up when the real inspection happens.</p>
          <p>Are you planning any mock inspections for the coming quarter?</p>
          ${bookingButton('Book an Inspection Prep Call')}
          ${signature}
        </div>`
    };
  },

  // WEEK 6: Sustainable Quality Systems
  Week6: (lead: LeadConfig) => {
    const firstName = formatName(lead.name);
    return {
      subject: `Quality is a habit, not an event`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
          <p>Hi ${firstName},</p>
          <p>One of the biggest frustrations we hear from providers is the "rollercoaster" of quality—ramping up for inspections and then seeing systems slide back once the report is published.</p>
          <p>We build systems that are sustainable for the long term, so you're always "inspection ready," every single day.</p>
          <p>Shall we chat about how to make your audits more efficient?</p>
          ${bookingButton('Let\'s Chat Systems')}
          ${signature}
        </div>`
    };
  },

  // WEEK 7: Recruitment Impact
  Week7: (lead: LeadConfig) => {
    const firstName = formatName(lead.name);
    return {
      subject: `How your CQC rating impacts your recruitment`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
          <p>Hi ${firstName},</p>
          <p>In a competitive labour market, the best carers want to work for "Good" and "Outstanding" providers. A "Requires Improvement" rating isn't just a compliance issue—it's a recruitment bottleneck.</p>
          <p>Improving your quality systems is the fastest way to stabilise your workforce and reduce your agency spend.</p>
          <p>I'd love to help you get there.</p>
          ${bookingButton('Book a Strategy Call')}
          ${signature}
        </div>`
    };
  },

  // WEEK 8: Friendly Breakup
  Week8: (lead: LeadConfig) => {
    const firstName = formatName(lead.name);
    return {
      subject: `Leaving the door open: Elvora Consulting`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
          <p>Hi ${firstName},</p>
          <p>I've reached out a few times over the last two months. I understand that your priorities may have shifted, or you might already have the support you need.</p>
          <p>I won't keep emailing you, but I wanted to leave you with my direct details. If CQC compliance or quality improvement ever moves to the top of your list, I'd be delighted to help.</p>
          <p>You can reach me at <a href="mailto:melissa@elvoraconsulting.co.uk">melissa@elvoraconsulting.co.uk</a> or visit our site at elvoraconsulting.co.uk.</p>
          <p>Wishing you and your team all the best.</p>
          ${signature}
        </div>`
    };
  }
};

const unsubscribeLink = (leadId: string) => `
  <div style="margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #9ca3af; text-align: center;">
    No longer wish to receive these? <a href="https://elvoraconsulting.co.uk/api/outreach/unsubscribe?id=${leadId}" style="color: #0F8B8D;">Unsubscribe here</a>
  </div>`;

export const getTemplateForPhase = (phase: number, leadId: string, lead: LeadConfig) => {
  let template;
  switch (phase) {
    case 1: template = OutreachTemplates.Week1(lead); break;
    case 2: template = OutreachTemplates.Week2(lead); break;
    case 3: template = OutreachTemplates.Week3(lead); break;
    case 4: template = OutreachTemplates.Week4(lead); break;
    case 5: template = OutreachTemplates.Week5(lead); break;
    case 6: template = OutreachTemplates.Week6(lead); break;
    case 7: template = OutreachTemplates.Week7(lead); break;
    case 8: template = OutreachTemplates.Week8(lead); break;
    default: return null;
  }
  return { ...template, html: template.html + unsubscribeLink(leadId) };
};
