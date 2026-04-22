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
    # Let's find Tottle Brook House, The Limes, Cockington House
    names = ["Tottle Brook House | Elysium Healthcare", "The Limes", "Cockington House"]
    for n in names:
        req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,name,provider&provider=eq.{urllib.parse.quote(n)}", headers=headers)
        with urllib.request.urlopen(req) as resp:
            leads = json.loads(resp.read().decode())
            print(f"Provider: {n}")
            for l in leads:
                print(f"  Name in DB: {l.get('name')}")
except Exception as e:
    print(e)
