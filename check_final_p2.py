import urllib.request, json
from datetime import datetime

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
headers = {'apikey': key, 'Authorization': f'Bearer {key}'}

req_leads = urllib.request.Request(f"{url}/rest/v1/leads?select=id,current_phase&campaign_type=eq.5_week_saf_campaign&status=eq.active", headers=headers)
try:
    with urllib.request.urlopen(req_leads) as resp:
        leads = json.loads(resp.read().decode())
        phase2 = len([l for l in leads if l.get('current_phase') == 2])
        print(f"Final verify - leads successfully pushed to Phase 2: {phase2}")
except Exception as e:
    print("Error getting leads:", str(e))
