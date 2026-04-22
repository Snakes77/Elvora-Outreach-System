import { LeadConfig, formatName, getWeakestQualityStatement, getWeakRatingsSummary, formatInspectionDate, resolveRole, getSignatureHTML, bookingButton, signature } from '../_shared/utils';

export const OutreachTemplates = {
  // WEEK 1: Role-specific opening — the most important email in the sequence
  Week1: (lead: LeadConfig) => {
    const firstName = formatName(lead.name);
    const role = resolveRole(lead);
    const weakest = getWeakestQualityStatement(lead);
    const weakSummary = getWeakRatingsSummary(lead);
    const inspectionDate = formatInspectionDate(lead.last_inspection_date);
    const overallRating = lead.overall_rating || 'Requires Improvement';

    // ── Nominated Individual ──────────────────────────────────────────────────
    if (role === 'Nominated Individual') {
      const subject = inspectionDate
        ? `Your provider's CQC position following the ${inspectionDate} assessment`
        : 'Your governance responsibilities under the new CQC framework';
      return {
        subject,
        html: `
          <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
            <p>Hi ${firstName},</p>
            <p>As the Nominated Individual, you carry personal regulatory accountability for the quality and safety of the services your organisation provides. It is a responsibility the CQC takes seriously under the new Single Assessment Framework.</p>
            <p>I reviewed the CQC data for your service${inspectionDate ? ` following the ${inspectionDate} assessment` : ''}. The overall rating is currently <strong>${overallRating}</strong>${weakSummary ? `, with <strong>${weakSummary}</strong> requiring specific attention` : ''}. Under the new framework, provider-level governance evidence is scrutinised more directly than before — and the NI role sits right at the centre of that.</p>
            <p>I am Melissa Meakin from Elvora Consulting. Over the past 20 years I have worked as a Registered Manager, Regional Crisis Support Manager, and Nominated Individual myself. I understand exactly what the CQC expects of you — and where the evidence gaps most commonly appear.</p>
            <p>Would a short call be useful to walk through what robust governance evidence looks like under the current framework?</p>
            ${bookingButton('Book a Governance Review Call')}
            ${signature}
          </div>`
      };
    }

    // ── Director ─────────────────────────────────────────────────────────────
    if (role === 'Director') {
      const subject = inspectionDate
        ? `CQC ${overallRating} rating — the business implications for your service`
        : `The commercial impact of your CQC position`;
      return {
        subject,
        html: `
          <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
            <p>Hi ${firstName},</p>
            <p>A <strong>${overallRating}</strong> CQC rating affects more than the inspection report${inspectionDate ? ` from ${inspectionDate}` : ''}. It affects your ability to recruit and retain good staff, your occupancy levels, your referral pipeline from local authorities, and your brand in the local market.</p>
            ${weakSummary ? `<p>The key areas flagged in the assessment — <strong>${weakSummary}</strong> — are exactly the categories that commissioners and families look at when choosing a provider.</p>` : ''}
            <p>I am Melissa Meakin, an independent care quality consultant with 20 years in the sector. I work with providers across the Midlands to address these gaps quickly — not through bureaucracy, but through practical systems that actually work day to day.</p>
            <p>Are you open to a brief conversation about the fastest route to an improved rating?</p>
            ${bookingButton('Book a Strategy Call')}
            ${signature}
          </div>`
      };
    }

    // ── Registered Manager (default) ─────────────────────────────────────────
    const subject = inspectionDate
      ? `CQC Single Assessment Framework: Observations on your ${inspectionDate} report`
      : 'Quick question about your latest CQC rating';
    return {
      subject,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
          <p>Hi ${firstName},</p>
          <p>I was reviewing the CQC data for Midlands care providers and came across your latest assessment${inspectionDate ? ` from ${inspectionDate}` : ''}.</p>
          <p>Under the new <strong>Single Assessment Framework</strong>, the <strong>${weakest}</strong> category has become a significant focus area. I know from experience that the quality of care being delivered on the floor is almost always better than what ends up in the evidence — and that gap is exactly what costs providers under the new framework.</p>
          <p>At Elvora Consulting, I work directly with Registered Managers to make sure the quality systems you already have are generating the right evidence against the 34 Quality Statements, so there are no surprises when the next assessment window opens.</p>
          <p>Would you be open to a ten minute conversation about how we helped a similar provider move from ${overallRating} to Good by focusing on ${weakest}?</p>
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
