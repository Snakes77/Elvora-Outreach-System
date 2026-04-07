import { supabaseAdmin } from './supabase-admin';
import { getCQCLocations, getCQCLocationDetails, calculateTier, scrapeCQCDetailedInspection } from './cqc';
import { findEmailForProvider } from './anymail';
import { generateBespokeEmail } from './emailgen';
import { sendOutreachEmail } from './resend';
import { getTemplateForPhase } from './outreach-templates';

/**
 * Orchestrates a complete sequence start for matching leads.
 */
export async function discoverAndStartSequence(criteria: { region?: string, rating?: string, limit?: number }) {
  console.log('Discovering locations with criteria:', criteria);
  
  // 1. Fetch matching CQC Locations
  const locations = await getCQCLocations({
    careHome: 'Y',
    region: criteria.region,
    rating: criteria.rating,
    limit: criteria.limit || 5
  });

  console.log(`Found ${locations.length} matching locations.`);

  const newLeads = [];

  // 2. Process each location
  for (const loc of locations) {
    // Check if we already have this lead
    const { data: existingLead } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('location_id', loc.locationId)
      .maybeSingle();

    if (existingLead) {
      console.log(`Lead ${loc.locationId} already exists, skipping.`);
      continue;
    }

    // Scrape details
    const scraped = await scrapeCQCDetailedInspection(loc.locationId);
    
    // Tier calculation
    const overallRating = loc.currentRatings?.overall?.rating || 'Not Rated';
    const reportDate = loc.currentRatings?.overall?.reportDate;
    const { tier, isOverdue, days } = calculateTier(overallRating, reportDate);

    // Initialise EnrichmentData for the lead
    const enrichment = {
      tier,
      priorityScore: tier === 4 ? 40 : tier === 3 ? 20 : tier === 1 ? 10 : 0,
      safe: scraped.safe || 'Not Rated',
      effective: scraped.effective || 'Not Rated',
      caring: scraped.caring || 'Not Rated',
      responsive: scraped.responsive || 'Not Rated',
      wellLed: scraped.well_led || 'Not Rated',
      daysSinceInspection: days,
      isOverdue
    };

    // Enrich Email
    const emailData = await findEmailForProvider(loc.name, undefined); // We might not have the domain yet
    
    // Store in DB
    const { data: leadData, error: leadError } = await supabaseAdmin
      .from('leads')
      .insert({
        location_id: loc.locationId,
        location_name: loc.name,
        provider_name: loc.providerId, // CQC API gives providerId, we might need provider name
        email: emailData.email || '',
        postcode: loc.postalCode,
        rating: overallRating,
        last_inspection_date: reportDate,
        cqc_details: enrichment,
        outreach_status: emailData.email ? 'ready' : 'missing_email',
        current_step: 0,
      })
      .select('id')
      .single();

    if (leadError || !leadData) {
      console.error(`Error inserting lead ${loc.locationId}`, leadError);
      continue;
    }

    newLeads.push(leadData.id);

    // If ready, we can immediately schedule/send step 1
    if (emailData.email) {
      await processNextSequenceStep(leadData.id, 1);
    }
  }

  return { success: true, processed: newLeads.length };
}

/**
 * Processes a specific sequence step for a given lead.
 */
export async function processNextSequenceStep(leadId: string, phase: number) {
  // Fetch lead with CQC details
  const { data: lead, error: leadError } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) {
    throw new Error('Lead not found');
  }

  if (lead.outreach_status === 'booked' || lead.is_paused) {
    console.log(`Lead ${leadId} is booked or paused. Skipping outreach.`);
    return;
  }

  const enrichment = lead.cqc_details as any;

  // Ensure 'Well led' terminology
  const safeWellLed = enrichment?.wellLed?.replace(/-/g, ' ') || 'Not Rated';
  
  // Format lead for outreach-templates
  const leadConfig = {
    name: lead.location_name || 'Provider',
    cqc_location_id: lead.location_id,
    last_inspection_date: lead.last_inspection_date,
    rating_safe: enrichment?.safe,
    rating_effective: enrichment?.effective,
    rating_caring: enrichment?.caring,
    rating_responsive: enrichment?.responsive,
    rating_well_led: safeWellLed,
  };

  // 1. Get Base HTML from Templates
  const template = getTemplateForPhase(phase, leadId, leadConfig);
  if (!template) {
    console.log(`No template for phase ${phase}`);
    return;
  }

  // 2. Generate Bespoke Paragraphs using GPT-4o-mini
  // Only override if phase is 1 to keep it organic, or depending on strategy
  let finalHtml = template.html;
  
  if (phase === 1) {
    const bespokeBody = await generateBespokeEmail({
      name: lead.location_name,
      locationId: lead.location_id,
      providerId: lead.provider_name,
      postalCode: lead.postcode
    }, enrichment, phase);

    if (bespokeBody && bespokeBody.length > 20) {
      // Find where to inject bespoke body. We can replace a placeholder or just use it.
      // For simplicity, we could replace the middle paragraph.
      // The template contains <p>At Elvora Consulting...</p>
      // We'll append bespoke body right before the CTA.
      const ctaIndex = finalHtml.indexOf('<div style="margin: 24px 0;">');
      if (ctaIndex > -1) {
        // Inject Bespoke HTML (assuming bespokeBody is plain text with newlines or has its own HTML)
        const formattedBespoke = bespokeBody.split('\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('');
        finalHtml = finalHtml.substring(0, ctaIndex) + formattedBespoke + finalHtml.substring(ctaIndex);
      }
    }
  }

  // 3. Create dummy sequence_steps row if none exists (just for tracking)
  const { data: stepData } = await supabaseAdmin
    .from('sequence_steps')
    .insert({ step_number: phase, subject_template: template.subject, body_template: "dynamic" })
    .select('id')
    .single();

  // 4. Send via Resend
  if (lead.email) {
    const result = await sendOutreachEmail(leadId, stepData?.id || '', lead.email, template.subject, finalHtml);
    
    if (result.success) {
      // Update Lead status
      await supabaseAdmin
        .from('leads')
        .update({
          current_step: phase,
          outreach_status: `step_${phase}_sent`,
          last_contacted_at: new Date().toISOString()
        })
        .eq('id', leadId);
    }
  } else {
    console.warn(`Lead ${leadId} has no email address`);
  }
}
