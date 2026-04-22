import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { getTemplateForPhase } from '../lib/outreach-templates';
import { sendOutreachEmail } from '../lib/resend';

// ─────────────────────────────────────────────────────────────────────────────
// Manual sequence test — sends Phase 1, 2, 3 to paul@staxxd.co.uk
// 5-minute gap between each email.
// Sending always routes through lib/resend.ts — .org domain rotation, never .co.uk
//
// Run:  npx tsx scripts/test-paul-sequence.ts
// ─────────────────────────────────────────────────────────────────────────────

const TARGET_EMAIL = 'paul@staxxd.co.uk';
const DELAY_MINUTES = 5;

// Simulated CQC lead — Nottingham care home, Registered Manager.
// Change contact_role to 'Nominated Individual' or 'Director' to preview those variants.
const TEST_LEAD = {
  id: 'test-sequence-preview',
  name: 'Sarah Mitchell',
  contact_role: 'Registered Manager',
  provider: 'Riverside Care Home',
  address: '14 Trent Boulevard, Nottingham, NG7 1AB',
  region: 'East Midlands',
  local_authority: 'Nottingham City',
  cqc_location_id: '1-TEST-NTM-001',
  overall_rating: 'Requires Improvement',
  last_inspection_date: '2025-11-08',
  rating_safe: 'Requires Improvement',
  rating_effective: 'Good',
  rating_caring: 'Good',
  rating_responsive: 'Requires Improvement',
  rating_well_led: 'Requires Improvement',
  cqc_service_type: 'Residential social care',
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

async function sendPhase(phase: number): Promise<void> {
  const template = getTemplateForPhase(phase, TEST_LEAD.id, TEST_LEAD);
  if (!template) {
    console.error(`  No template found for phase ${phase}`);
    return;
  }

  const result = await sendOutreachEmail(
    TEST_LEAD.id,
    `test_phase_${phase}`,
    TARGET_EMAIL,
    `[TEST] ${template.subject}`,
    template.html
  );

  if (result.success) {
    console.log(`  Sent via ${result.domainUsed}. Resend ID: ${result.resendId}`);
  } else {
    console.error(`  Failed:`, result.error);
  }
}

async function run(): Promise<void> {
  console.log('');
  console.log('Sequence test');
  console.log(`To:   ${TARGET_EMAIL}`);
  console.log(`Lead: ${TEST_LEAD.name} — ${TEST_LEAD.contact_role}`);
  console.log(`Home: ${TEST_LEAD.provider}, ${TEST_LEAD.local_authority}`);
  console.log(`CQC:  ${TEST_LEAD.overall_rating} | Safe: ${TEST_LEAD.rating_safe} | Well led: ${TEST_LEAD.rating_well_led}`);
  console.log(`Gap:  ${DELAY_MINUTES} minutes between emails`);
  console.log('');
  console.log("Role variants: change contact_role to 'Nominated Individual' or 'Director' to preview those templates.");
  console.log('');

  for (let phase = 1; phase <= 3; phase++) {
    console.log(`[${ts()}] Phase ${phase}/3`);
    await sendPhase(phase);

    if (phase < 3) {
      console.log(`[${ts()}] Waiting ${DELAY_MINUTES} minutes...`);
      await countdown(DELAY_MINUTES);
    }
  }

  console.log('');
  console.log(`[${ts()}] Done. 3 emails sent to ${TARGET_EMAIL}.`);
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
