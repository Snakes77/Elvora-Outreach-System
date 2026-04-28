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

tables = ['email_sends', 'discovery_logs', 'sequence_steps']

for table in tables:
    req = urllib.request.Request(f"{url}/rest/v1/{table}?select=count", headers=headers)
    req.add_header('Prefer', 'count=exact')
    try:
        with urllib.request.urlopen(req) as resp:
            # The count is in the response header Content-Range e.g. "0-9/14"
            range_hdr = resp.headers.get('Content-Range')
            count = range_hdr.split('/')[-1] if range_hdr else 'unknown'
            print(f"Table {table}: {count} records")
    except Exception as e:
        print(f"Error checking {table}: {str(e)}")

