// test-cqc.ts
import { loadEnvConfig } from '@next/env';
const projectDir = process.cwd();
loadEnvConfig(projectDir);

import { GET } from '../app/api/cron/cqc-sync/route';

async function run() {
  console.log("Running simulated sync...");
  const fakeRequest = new Request('http://localhost:3000/api/cron/cqc-sync', {
    headers: { 'authorization': `Bearer ${process.env.CRON_SECRET || 'test'}` }
  });
  
  // Temporarily override the CRON_SECRET if it was blank so it doesn't fail auth
  const oldSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'test';

  try {
    const response = await GET(fakeRequest);
    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Data:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    process.env.CRON_SECRET = oldSecret;
  }
}

run();
