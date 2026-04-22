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
req = urllib.request.Request(f"{url}/rest/v1/leads?campaign_type=eq.5_week_kloe_campaign", data=json.dumps({"campaign_type": "5_week_saf_campaign"}).encode(), headers=headers, method='PATCH')
try:
    with urllib.request.urlopen(req) as resp:
        print("DB Updated successfully.")
except Exception as e:
    print(e)
