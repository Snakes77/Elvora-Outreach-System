import { GET } from '../app/api/cron/cqc-sync/route';

async function test() {
    const req = new Request('http://localhost/api/cron/cqc-sync');
    const res = await GET(req);
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
}

test().catch(console.error);
