import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { getTemplateForPhase } from '../lib/outreach-templates';
import { sendOutreachEmail } from '../lib/resend';

// Sends Phase 1 to two recipients as a quick template spot-check.
// Sending routes through lib/resend.ts — .org domain rotation, never .co.uk.

const TEST_EMAILS = [
  'melissa@elvoraconsulting.co.uk',
  'paul@staxxd.co.uk',
];

const SAMPLE_LEAD = {
  id: 'test-send-outreach',
  name: 'David Okafor',
  contact_role: 'Registered Manager',
  provider: 'Greenacres Care Home Limited',
  rating_safe: 'Requires Improvement',
  rating_effective: 'Good',
  rating_caring: 'Good',
  rating_responsive: 'Good',
  rating_well_led: 'Requires Improvement',
  overall_rating: 'Requires Improvement',
  last_inspection_date: '2026-01-12',
  local_authority: 'Derby City',
};

async function run() {
  console.log('Sending Phase 1 test to:', TEST_EMAILS.join(', '));

  const template = getTemplateForPhase(1, SAMPLE_LEAD.id, SAMPLE_LEAD);
  if (!template) {
    console.error('Template generation failed.');
    return;
  }

  for (const email of TEST_EMAILS) {
    process.stdout.write(`  ${email}... `);
    const result = await sendOutreachEmail(
      SAMPLE_LEAD.id,
      'test_phase_1',
      email,
      `[TEST] ${template.subject}`,
      template.html
    );
    if (result.success) {
      console.log(`sent via ${result.domainUsed}`);
    } else {
      console.error(`failed:`, result.error);
    }
  }

  console.log('Done.');
}

run().catch(console.error);
