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

req = urllib.request.Request(f"{url}/rest/v1/leads?select=*", headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        leads = json.loads(resp.read().decode())
        found = False
        for l in leads:
            s_l = json.dumps(l).lower()
            if 'wecare' in s_l:
                print("--- MATCH ---")
                print("ID:", l.get('id'))
                print("Name:", l.get('name'))
                print("Email:", l.get('email'))
                print("Nominated:", l.get('nominated_individual'))
                print("Provider:", l.get('provider'))
                found = True
        
        if not found:
            print("Wecare not found anywhere in leads.")
except Exception as e:
    print("Error:", str(e))
