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
            name = l.get('name') or ""
            email = l.get('email') or ""
            director = l.get('director_name') or ""
            nom = l.get('nominated_individual') or ""
            
            if "nadarajah" in name.lower() or "nadarajah" in director.lower() or "nadarajah" in nom.lower():
                print("--- MATCH ---")
                print("ID:", l.get('id'))
                print("Name:", name)
                print("Email:", email)
                print("Director:", director)
                print("Nominated:", nom)
                print("Provider:", l.get('provider'))
                found = True
        
        if not found:
            print("Nadarajah not found in leads.")
except Exception as e:
    print("Error:", str(e))
