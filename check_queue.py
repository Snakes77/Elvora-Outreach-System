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
    req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,status,email_enrichment_status,next_step_date", headers=headers)
    with urllib.request.urlopen(req) as resp:
        leads = json.loads(resp.read().decode())
        due_now = [l for l in leads if l.get('status') == 'active' and l.get('email_enrichment_status') == 'found' and l.get('next_step_date') and l.get('next_step_date') <= datetime.datetime.now(datetime.timezone.utc).isoformat()]
        pending_later = [l for l in leads if l.get('status') == 'active' and l.get('email_enrichment_status') == 'found' and l.get('next_step_date') and l.get('next_step_date') > datetime.datetime.now(datetime.timezone.utc).isoformat()]
        
        print(f"Total leads: {len(leads)}")
        print(f"Due perfectly (ready for cron): {len(due_now)}")
        print(f"Pending for later: {len(pending_later)}")
        
        # Check reasons why they might not match
        not_active = [l for l in leads if l.get('status') != 'active']
        no_email = [l for l in leads if l.get('email_enrichment_status') != 'found']
        print(f"Not active status: {len(not_active)}")
        print(f"Missing email enrichment: {len(no_email)}")
        
except Exception as e:
    print(e)
