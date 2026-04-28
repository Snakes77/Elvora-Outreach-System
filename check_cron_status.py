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

# Check if any emails were sent today via email_sends table
req_sends = urllib.request.Request(f"{url}/rest/v1/email_sends?select=id,sent_at,sending_domain&order=sent_at.desc&limit=10", headers=headers)
try:
    with urllib.request.urlopen(req_sends) as resp:
        sends = json.loads(resp.read().decode())
        print(f"Recent email_sends records: {len(sends)}")
        for s in sends:
            print(f" - {s.get('sent_at')} | {s.get('sending_domain')}")
except Exception as e:
    print("Error getting sends:", str(e))

# Check the phases of active leads
req_leads = urllib.request.Request(f"{url}/rest/v1/leads?select=id,current_phase&campaign_type=eq.5_week_saf_campaign&status=eq.active", headers=headers)
try:
    with urllib.request.urlopen(req_leads) as resp:
        leads = json.loads(resp.read().decode())
        phase0 = len([l for l in leads if l.get('current_phase') == 0])
        phase1 = len([l for l in leads if l.get('current_phase') == 1])
        print(f"\nPhases now:")
        print(f"Phase 0: {phase0}")
        print(f"Phase 1: {phase1}")
except Exception as e:
    print("Error getting leads:", str(e))
