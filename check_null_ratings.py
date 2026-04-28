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

req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,name,rating_safe,last_inspection_date,campaign_type&status=eq.active", headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        leads = json.loads(resp.read().decode())
        
        null_saf = [l for l in leads if l.get('campaign_type') == '5_week_saf_campaign' and not l.get('rating_safe')]
        
        print(f"Total active SAF leads with null ratings: {len(null_saf)}")
        if null_saf:
            print("Examples:", null_saf[:3])
            
except Exception as e:
    print("Error:", str(e))
