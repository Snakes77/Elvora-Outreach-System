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
    req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,current_phase,next_step_date&campaign_type=eq.5_week_saf_campaign", headers=headers)
    with urllib.request.urlopen(req) as resp:
        leads = json.loads(resp.read().decode())
        
        phases = {}
        for l in leads:
            p = l.get('current_phase')
            phases[p] = phases.get(p, 0) + 1
            
        print(f"Total SAF leads: {len(leads)}")
        print(f"Phases: {phases}")
        
except Exception as e:
    print(e)
