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

req = urllib.request.Request(f"{url}/rest/v1/leads?or=(name.ilike.*stewart*,email.ilike.*stewart*,director_name.ilike.*stewart*,nominated_individual.ilike.*stewart*)", headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        if len(res) == 0:
            print("Stewart not found.")
        else:
            for l in res:
                print("ID:", l.get('id'))
                print("Name:", l.get('name'))
                print("Email:", l.get('email'))
                print("Status:", l.get('status'))
except Exception as e:
    print("Error:", str(e))
