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

req = urllib.request.Request(f"{url}/rest/v1/leads?id=eq.83e25ff5-ffd1-4ce4-a846-cd74aa4eee41", headers=headers)
with urllib.request.urlopen(req) as resp:
    print(resp.read().decode())
