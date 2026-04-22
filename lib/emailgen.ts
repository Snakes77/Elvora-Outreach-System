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

const SYSTEM_PROMPT = `You are Melissa Meakin, a highly experienced Care Consultant based in the UK (Nottingham/Midlands). 
You specialise in helping care homes improve their CQC ratings, especially under the new Single Assessment Framework (SAF).

STRICT WRITING RULES:
1. USE UK ENGLISH ONLY (e.g., specialise, recognise, programme, colour).
2. NO HYPHENS. "Well-led" MUST be written as "Well led". Avoid hyphens in adjectives.
3. ABSOLUTELY NO AI BUZZWORDS: ${ANTI_WORDS.join(', ')}. No "delve", no "robust", no "tapestry".
4. Be professional yet warm and supportive. You are a human, not a bot.
5. Keep paragraphs short (1-3 sentences) for better readability on mobile.
6. The CTA and Sign-off are provided by the template. Just write the core narrative message.`;

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

  const prompt = `Write the core narrative for Phase ${phase} of an outreach sequence.
Care Home: ${provider.name}
Location: ${provider.postalAddressTownCity || 'Midlands'}
Ratings:
- Safe: ${enrichment.safe}
- Well led: ${enrichment.wellLed}
- Effective: ${enrichment.effective}
- Caring: ${enrichment.caring}
- Responsive: ${enrichment.responsive}

Deep Context Findings (Scraped from CQC "Our current view" / "People's experience"):
${enrichment.notes || 'No specific findings scraped.'}

Sequence Objective:
- Phase 1: The 'Sniper' approach. Acknowledge their situation with empathy. Mention specific findings from their report (e.g. medicines, governance, etc.).
- Goal: Demonstrate we have actually read their latest CQC data and understand their local Midlands context.
- Tone: Not critical, but "here to help solve these specific headaches". Mention staff recruitment or inspector confidence.

Write 3 short paragraphs. Include a natural opening relative to their CQC assessment. Do NOT include a subject line, greeting (Hi...), or sign-off. ONLY the body text.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    let generatedText = completion.choices[0]?.message?.content || '';
    
    // Post-processing: only fix the specific CQC terminology; never strip all hyphens
    generatedText = generatedText.replace(/Well-led/g, 'Well led');
    generatedText = generatedText.replace(/well-led/g, 'well led');
    
    return generatedText;
  } catch (error) {
    console.error("Error generating bespoke email with OpenAI:", error);
    return null;
  }
}
