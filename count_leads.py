import os
import json
import urllib.request

env = {}
with open('.env.local', 'r') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#'):
            parts = line.split('=', 1)
            if len(parts) == 2:
                env[parts[0]] = parts[1]

url = env.get('NEXT_PUBLIC_SUPABASE_URL')
key = env.get('SUPABASE_SERVICE_ROLE_KEY')

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Range-Unit': 'items'
}

req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,region,overall_rating", headers=headers)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())

print("Total leads:", len(data))
ew = [d for d in data if d.get('region') in ['East Midlands', 'West Midlands']]
print("Total in East/West Midlands:", len(ew))
bad = [d for d in ew if str(d.get('overall_rating')).lower() in ['inadequate', 'requires improvement']]
print("East/West Midlands with bad rating:", len(bad))
