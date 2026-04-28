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
headers = {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json', 'Prefer': 'return=representation'}

req = urllib.request.Request(f"{url}/rest/v1/leads?id=eq.d52ca6f2-304f-48b7-872b-798a21c1e7fa", data=json.dumps({"status": "replied"}).encode(), headers=headers, method="PATCH")
try:
    with urllib.request.urlopen(req) as resp:
        print(json.loads(resp.read().decode()))
except Exception as e:
    print("Error:", str(e))
