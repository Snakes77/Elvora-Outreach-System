import urllib.request, json
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
    req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,status,email_enrichment_status,next_step_date,campaign_type,current_phase&campaign_type=eq.5_week_saf_campaign", headers=headers)
    with urllib.request.urlopen(req) as resp:
        leads = json.loads(resp.read().decode())
        print(f"Total SAF Campaign Leads: {len(leads)}")
        if len(leads) > 0:
            print("Categories:")
            statuses = {}
            email_statuses = {}
            for l in leads:
                st = l.get('status') or 'None'
                est = l.get('email_enrichment_status') or 'None'
                statuses[st] = statuses.get(st, 0) + 1
                email_statuses[est] = email_statuses.get(est, 0) + 1
            print(f"Statuses: {statuses}")
            print(f"Email Enrichments: {email_statuses}")
            
except Exception as e:
    print(e)
