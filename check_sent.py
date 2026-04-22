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
    # Get leads that have current_phase = 1 to see who was actually sent just now
    req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,campaign_type,current_phase,name,email&current_phase=eq.1", headers=headers)
    with urllib.request.urlopen(req) as resp:
        leads = json.loads(resp.read().decode())
        
        print(f"Total leads with current_phase=1: {len(leads)}")
        campaigns = {}
        for l in leads:
            c = l.get('campaign_type') or 'Unknown'
            campaigns[c] = campaigns.get(c, 0) + 1
            
        print("Campaign breakdown of sent leads:")
        for c, count in campaigns.items():
            print(f" - {c}: {count}")
            
except Exception as e:
    print(e)
