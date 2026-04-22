import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { getTemplateForPhase } from '../lib/outreach-templates';
import { sendOutreachEmail } from '../lib/resend';

// Sends Phase 1–4 with configurable delays.
// Sending routes through lib/resend.ts — .org domain rotation, never .co.uk.

const TARGET_EMAIL = 'paul@staxxd.co.uk';
const DELAY_MINUTES = 5;

const TEST_LEAD = {
  id: 'test-meadow-view-id',
  name: 'Karen Hughes',
  contact_role: 'Registered Manager',
  provider: 'Meadow View Care Centre',
  local_authority: 'Leicester City',
  overall_rating: 'Requires Improvement',
  last_inspection_date: '2026-02-14',
  rating_safe: 'Requires Improvement',
  rating_effective: 'Good',
  rating_caring: 'Good',
  rating_responsive: 'Good',
  rating_well_led: 'Requires Improvement',
};

function ts(): string {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function countdown(minutes: number): Promise<void> {
  const totalSeconds = minutes * 60;
  for (let remaining = totalSeconds; remaining > 0; remaining -= 10) {
    const m = Math.floor(remaining / 60);
    const s = (remaining % 60).toString().padStart(2, '0');
    process.stdout.write(`\r  Next email in ${m}m ${s}s...`);
    await new Promise(r => setTimeout(r, Math.min(10_000, remaining * 1_000)));
  }
  process.stdout.write('\r' + ' '.repeat(40) + '\r');
}

async function run() {
  console.log('');
  console.log(`4-phase sequence test → ${TARGET_EMAIL}`);
  console.log(`Lead: ${TEST_LEAD.name} (${TEST_LEAD.contact_role}) — ${TEST_LEAD.provider}`);
  console.log('');

  for (let phase = 1; phase <= 4; phase++) {
    const template = getTemplateForPhase(phase, TEST_LEAD.id, TEST_LEAD);
    if (!template) {
      console.error(`[${ts()}] No template for phase ${phase}`);
      continue;
    }

    console.log(`[${ts()}] Phase ${phase}/4`);
    const result = await sendOutreachEmail(
      TEST_LEAD.id,
      `test_phase_${phase}`,
      TARGET_EMAIL,
      `[TEST] ${template.subject}`,
      template.html
    );

    if (result.success) {
      console.log(`  Sent via ${result.domainUsed}`);
    } else {
      console.error(`  Failed:`, result.error);
    }

    if (phase < 4) {
      console.log(`[${ts()}] Waiting ${DELAY_MINUTES} minutes...`);
      await countdown(DELAY_MINUTES);
    }
  }

  console.log('');
  console.log(`[${ts()}] Done.`);
}

run().catch(console.error);
