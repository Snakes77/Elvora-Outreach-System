import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { getTemplateForPhase } from '../lib/outreach-templates';
import { sendOutreachEmail } from '../lib/resend';

// Sends all phases to melissa@ and paul@ for template review.
// Sending routes through lib/resend.ts — .org domain rotation, never .co.uk.

const TEST_LEAD = {
  id: 'test-outreach-review',
  name: 'Katie & Darren Starr',
  contact_role: 'Nominated Individual',
  provider: 'Starr Care Group',
  overall_rating: 'Requires Improvement',
  last_inspection_date: '2025-10-03',
  rating_safe: 'Requires Improvement',
  rating_effective: 'Good',
  rating_caring: 'Good',
  rating_responsive: 'Good',
  rating_well_led: 'Requires Improvement',
  local_authority: 'Nottingham City',
};

async function run() {
  const recipients = ['melissa@elvoraconsulting.co.uk', 'paul@staxxd.co.uk'];
  console.log(`Sending all 8 phases to: ${recipients.join(', ')}`);

  for (let phase = 1; phase <= 8; phase++) {
    const template = getTemplateForPhase(phase, TEST_LEAD.id, TEST_LEAD);
    if (!template) continue;

    for (const email of recipients) {
      process.stdout.write(`  Phase ${phase} → ${email}... `);
      const result = await sendOutreachEmail(
        TEST_LEAD.id,
        `test_phase_${phase}`,
        email,
        `[TEST P${phase}] ${template.subject}`,
        template.html
      );
      console.log(result.success ? `sent via ${result.domainUsed}` : `failed: ${result.error}`);
    }

    await new Promise(r => setTimeout(r, 1_000));
  }

  console.log('Done.');
}

run().catch(console.error);
