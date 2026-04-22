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
req = urllib.request.Request(f"{url}/rest/v1/leads?campaign_type=eq.5_week_kloe_campaign&select=rating_safe", headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        not_rated = sum(1 for x in data if x['rating_safe'] == 'Not rated')
        rated = len(data) - not_rated
        print(f"Total leads: {len(data)}, Not rated: {not_rated}, Rated correctly: {rated}")
except Exception as e:
    print(e)
