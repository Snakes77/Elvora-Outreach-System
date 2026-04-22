import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { sendOutreachEmail } from '../lib/resend';

// Bare-bones deliverability check — sends a plain text email and reports the Resend event status.
// Sending routes through lib/resend.ts — .org domain rotation, never .co.uk.

async function run() {
  console.log('Sending deliverability test...');

  const result = await sendOutreachEmail(
    'test-bounce-check',
    'bounce_test',
    'paul@staxxd.co.uk',
    'Connection test from Elvora',
    '<p>This is a connection test. Please reply if received.</p>',
    'This is a connection test. Please reply if received.'
  );

  if (result.success) {
    console.log(`Sent via ${result.domainUsed}. Resend ID: ${result.resendId}`);
  } else {
    console.error('Failed:', result.error);
  }
}

run().catch(console.error);
