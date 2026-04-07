import OpenAI from 'openai';
import { CQCLocation, EnrichmentData } from './cqc';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface LeadConfig {
  name: string;
  cqc_location_id?: string;
  last_inspection_date?: string;
  rating_safe?: string;
  rating_effective?: string;
  rating_caring?: string;
  rating_responsive?: string;
  rating_well_led?: string;
}

const ANTI_WORDS = [
  'robust', 'delve', 'leverage', 'hurdle', 'testament', 'seamless', 
  'cutting-edge', 'innovative', 'navigating', 'tapestry', 'journey'
];

const SYSTEM_PROMPT = `You are Melissa Meakin, a highly experienced Care Consultant based in the UK. 
You are writing an initial outreach email to a care home provider whose CQC ratings are poor or overdue.

STRICT RULES:
1. USE UK ENGLISH ONLY (e.g., specialise, recognise, programme, colour).
2. DO NOT USE ANY HYPHENS. "Well-led" MUST be written as "Well led". Always avoid hyphens in compound adjectives.
3. DO NOT USE ANY OF THESE AI BUZZWORDS: ${ANTI_WORDS.join(', ')}.
4. Be professional, concise, empathetic, and direct. Do not sound like a machine.
5. Focus on the core pain points: the new Single Assessment Framework (SAF), documentation gaps, Mock Inspections, and recruitment issues.
6. The CTA will be appended automatically. Merely sign off naturally.`;

/**
 * Generates a personalised email body using OpenAI gpt-4o-mini.
 */
export async function generateBespokeEmail(
  provider: CQCLocation,
  enrichment: EnrichmentData,
  phase: number = 1
) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY is not set. Falling back to default or skipping generation.");
    return null;
  }

  const prompt = `Write the body of an outreach email for Phase ${phase} of our sequence.
Provider Name: ${provider.name}
Overall Rating: ${enrichment.tier === 3 ? 'Requires Improvement' : enrichment.tier === 4 ? 'Inadequate' : 'Good/Outstanding but Overdue'}
Safe Rating: ${enrichment.safe || 'Not Rated'}
Well led Rating: ${enrichment.wellLed || 'Not Rated'}
Context details: ${enrichment.notes || 'None'}

Please write 3 concise paragraphs addressing their specific situation based on the CQC ratings above. Keep it friendly and supportive. Mention you help Midlands providers. Emphasise how turning this around can help with staff recruitment or inspector confidence. Write ONLY the email body (no subject line, no greeting like "Hi Name,", no sign-off like "Best, Melissa", just the core text).`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 400
    });

    let generatedText = completion.choices[0]?.message?.content || '';
    
    // Post-processing safety net
    generatedText = generatedText.replace(/-/g, ' '); // No hyphens rule brute-force fallback
    // Replace markdown bold just in case
    
    return generatedText;
  } catch (error) {
    console.error("Error generating bespoke email with OpenAI:", error);
    return null;
  }
}
