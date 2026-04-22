import { LeadConfig, formatName, getWeakestQualityStatement, formatInspectionDate, getSignatureHTML, bookingButton, signature } from '../_shared/utils';

export const SAFTemplates = {
  Week1_Safe: (lead: LeadConfig) => {
    const firstName = formatName(lead.name);
    const safeRating = lead.rating_safe || 'Not rated';
    const ratingText = safeRating.toLowerCase() === 'not rated' 
      ? `currently do not have a published rating` 
      : `currently sit at <strong>${safeRating}</strong>`;
      
    return {
      subject: `CQC 'Safe' Rating - Impact on your latest assessment`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
          <p>Hi ${firstName},</p>
          <p>Under the new Single Assessment Framework, safety is the foundation of every inspection. I was reviewing the CQC data for Midlands care providers and noted that your service ${ratingText} in the 'Safe' domain.</p>
          <p>From my 20 years of experience turning around care services, the issue is rarely a lack of safe practice—it's usually a lack of <em>evidenced</em> safe practice. Medicines management, safeguarding logs, and risk assessments need to clearly translate to the exact Quality Statements the inspectors check.</p>
          <p>I am Melissa Meakin, an independent care consultant. I help providers bridge this evidence gap quickly and sustainably.</p>
          <p>Are you open to a brief call to discuss how we can strengthen your Safe rating evidence?</p>
          ${bookingButton('Book a Quick Call')}
          ${signature}
        </div>`
    };
  },
  Week2_Effective: (lead: LeadConfig) => {
    const firstName = formatName(lead.name);
    const effRating = lead.rating_effective || 'Not rated';
    const ratingSubj = effRating.toLowerCase() === 'not rated' ? '' : ` (${effRating})`;
    const ratingPara = effRating.toLowerCase() === 'not rated' 
      ? `where your service currently has no published rating` 
      : `currently rated as <strong>${effRating}</strong>`;

    return {
      subject: `CQC 'Effective' Rating${ratingSubj} - The Evidence Gap`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
          <p>Hi ${firstName},</p>
          <p>Following up on my previous email—today I wanted to touch on the 'Effective' element of your CQC assessment, ${ratingPara}.</p>
          <p>Staff competency, training matrices, and meaningful care plan audits are frequently cited when CQC finds a service lacking in effectiveness. The framework demands that teams demonstrably act on best practices, not just theoretically know them.</p>
          <p>I work directly with managers and providers to ensure you have the exact systems in place to showcase an Effective service.</p>
          <p>Would a 10-minute chat be useful to see how this works?</p>
          ${bookingButton('Check My Availability')}
          ${signature}
        </div>`
    };
  },
  Week3_Caring: (lead: LeadConfig) => {
    const firstName = formatName(lead.name);
    const caringRating = lead.rating_caring || 'Not rated';
    const ratingPara = caringRating.toLowerCase() === 'not rated' 
      ? `a domain that is absolutely critical to your next assessment` 
      : `where your service is recorded as <strong>${caringRating}</strong>`;

    return {
      subject: `CQC 'Caring' Rating - Capturing the Patient Experience`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
          <p>Hi ${firstName},</p>
          <p>An inspector relies heavily on patient and family feedback to assess the 'Caring' domain, ${ratingPara}.</p>
          <p>Often, staff go above and beyond, but capturing that compassion formally in daily notes can be a struggle. When the evidence isn't there, the CQC scales down the rating, regardless of the real-world care.</p>
          <p>Shall we chat about simple tools to consistently evidence compassionate care?</p>
          ${bookingButton('Book an intro call')}
          ${signature}
        </div>`
    };
  },
  Week4_Responsive: (lead: LeadConfig) => {
    const firstName = formatName(lead.name);
    const respRating = lead.rating_responsive || 'Not rated';
    const ratingPara = respRating.toLowerCase() === 'not rated' 
      ? `how will the 'Responsive' element be rated in your next inspection?` 
      : `the 'Responsive' element was rated as <strong>${respRating}</strong>.`;

    return {
      subject: `Adapting to needs: Your 'Responsive' Rating`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
          <p>Hi ${firstName},</p>
          <p>Are your care plans truly reflecting the changing needs of your residents? By the way, ${ratingPara}</p>
          <p>A "Requires Improvement" here usually stems from generic, static care plans that aren't rapidly updated when a resident's condition shifts. CQC expects to see a dynamic loop of assessment, action, and review.</p>
          <p>I can help you build an incredibly responsive audit loop. Let me know if you'd like a quick conversation.</p>
          ${bookingButton("Let's Chat")}
          ${signature}
        </div>`
    };
  },
  Week5_WellLed: (lead: LeadConfig) => {
    const firstName = formatName(lead.name);
    const wellLedRating = lead.rating_well_led || 'Not rated';
    const overallRating = lead.overall_rating || 'Not rated';
    const ratingPara = wellLedRating.toLowerCase() === 'not rated' 
      ? `the 'Well-led' domain.` 
      : `the 'Well-led' domain, currently at <strong>${wellLedRating}</strong> for your service.`;

    return {
      subject: `CQC 'Well-led' Rating - Governance and Leadership`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px;">
          <p>Hi ${firstName},</p>
          <p>Ultimately, a service's overall rating almost always ties back to ${ratingPara}</p>
          <p>CQC views Well-led as the anchor for all other domains. Without robust internal governance, continuous auditing, and transparent leadership, the other areas inevitably fail to secure high ratings.</p>
          <p>This is my last email to you on this topic. I specialise in implementing leadership structures that make compliance sustainable. If you want to systematically resolve this and prepare for your next assessment, I'd be delighted to help.</p>
          ${bookingButton('Secure your Strategy Session')}
          ${signature}
        </div>`
    };
  }
};
