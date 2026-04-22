import { GET } from './app/api/cron/sequence/route.ts';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function run() {
    const req = new Request('http://localhost:3000/api/cron/sequence', {
        headers: {
            'authorization': `Bearer ${process.env.CRON_SECRET || ''}`
        }
    });
    console.log("Triggering sequence...");
    const res = await GET(req);
    const json = await res.json();
    console.log(json);
}

run();
