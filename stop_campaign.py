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
    patch_req = urllib.request.Request(
        f"{url}/rest/v1/leads?campaign_type=eq.5_week_saf_campaign", 
        data=json.dumps({"status": "paused"}).encode(), 
        headers=headers, 
        method='PATCH'
    )
    with urllib.request.urlopen(patch_req) as patch_resp:
        print(f"Status of stopping the campaign: {patch_resp.status}")
except Exception as e:
    print(e)
