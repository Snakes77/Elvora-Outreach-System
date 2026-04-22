import { scrapeCQCDetailedInspection } from '../lib/cqc';
async function r() {
  const findings = await scrapeCQCDetailedInspection('1-1007050476');
  console.log('Final:', JSON.stringify(findings, null, 2));
}

r();
