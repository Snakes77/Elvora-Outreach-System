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

ids = [
    "57048d32-b184-47c2-8670-4e836755fb05", # Stewart
    "fccfae44-4b24-4299-8a75-e34591a99b15", # Prospect House
]

for lead_id in ids:
    req = urllib.request.Request(f"{url}/rest/v1/leads?id=eq.{lead_id}", data=json.dumps({"status": "unsubscribed"}).encode(), headers=headers, method="PATCH")
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"Unsubscribed: {lead_id}")
    except Exception as e:
        print(f"Error for {lead_id}:", str(e))
