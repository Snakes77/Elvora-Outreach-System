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
    req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,next_step_date&campaign_type=eq.5_week_saf_campaign", headers=headers)
    with urllib.request.urlopen(req) as resp:
        leads = json.loads(resp.read().decode())
        
        has_date = 0
        no_date = 0
        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
        past = 0
        future = 0
        
        for l in leads:
            d = l.get('next_step_date')
            if d:
                has_date += 1
                if d <= now_str: past += 1
                else: future += 1
            else:
                no_date += 1
                
        print(f"Has next_step_date: {has_date}")
        print(f"  Due now (<= now): {past}")
        print(f"  Future (> now): {future}")
        print(f"No next_step_date: {no_date}")
            
except Exception as e:
    print(e)
