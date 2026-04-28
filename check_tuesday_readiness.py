import urllib.request, json
from datetime import datetime, timezone

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

req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,current_phase,status,next_step_date&campaign_type=eq.5_week_saf_campaign&status=eq.active", headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        leads = json.loads(resp.read().decode())
        
        # count by next_step_date day
        by_day = {}
        total_p1 = len([l for l in leads if l.get('current_phase') == 1])
        
        for l in leads:
            date_str = l.get('next_step_date')
            if date_str:
                day = date_str.split('T')[0]
                by_day[day] = by_day.get(day, 0) + 1
                
        print(f"Total active Phase 1 (waiting for Phase 2): {total_p1}")
        for day in sorted(by_day.keys()):
            print(f" - Due on {day}: {by_day[day]} leads")
            
except Exception as e:
    print("Error:", str(e))
