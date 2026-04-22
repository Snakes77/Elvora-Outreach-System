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
    req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,name,provider,cqc_location_id,rating_safe,rating_effective,rating_caring,rating_responsive,rating_well_led,overall_rating,last_inspection_date&campaign_type=eq.5_week_saf_campaign&limit=1&rating_safe=eq.Requires%20improvement", headers=headers)
    with urllib.request.urlopen(req) as resp:
        leads = json.loads(resp.read().decode())
        if leads:
            print(json.dumps(leads[0], indent=2))
except Exception as e:
    print(e)
