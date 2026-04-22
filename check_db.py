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
headers = {'apikey': key, 'Authorization': f'Bearer {key}'}
req = urllib.request.Request(f"{url}/rest/v1/leads?campaign_type=eq.5_week_kloe_campaign&limit=3&select=name,email,rating_safe,rating_effective,rating_caring,rating_responsive,rating_well_led,overall_rating,campaign_type,current_phase,status,next_step_date,email_enrichment_status", headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print(json.dumps(data, indent=2))
except Exception as e:
    print(e)
