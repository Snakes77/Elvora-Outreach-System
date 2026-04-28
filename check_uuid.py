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

req = urllib.request.Request(f"{url}/rest/v1/leads?id=ilike.22b9c10f*", headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        print(json.loads(resp.read().decode()))
except Exception as e:
    print("Error:", str(e))
