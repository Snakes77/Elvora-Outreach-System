import urllib.request, json, datetime
env = {}
try:
    with open('.env.local', 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k,v = line.strip().split('=', 1)
                env[k] = v
except: pass

url = env.get('NEXT_PUBLIC_SUPABASE_URL')
key = env.get('SUPABASE_SERVICE_ROLE_KEY')
headers = {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}

try:
    # We know that the leads bumped by force.ts had next_step_date advanced by 7 days.
    # Today is Apr 21. 7 days from now is Apr 28.
    req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,campaign_type,current_phase,next_step_date", headers=headers)
    with urllib.request.urlopen(req) as resp:
        leads = json.loads(resp.read().decode())
        
        apr28_leads = []
        for l in leads:
            d = l.get('next_step_date')
            if d and d.startswith('2026-04-28'):
                apr28_leads.append(l)
                
        print(f"Total leads with next_step_date on Apr 28: {len(apr28_leads)}")
        
        campaigns = {}
        for l in apr28_leads:
            c = l.get('campaign_type') or 'Unknown'
            campaigns[c] = campaigns.get(c, 0) + 1
            
        print("Campaign breakdown of leads updated today:")
        for c, count in campaigns.items():
            print(f" - {c}: {count}")
            
except Exception as e:
    print(e)
