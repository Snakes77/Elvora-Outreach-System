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
    # Get the 178 saf leads
    req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,cqc_location_id,name&campaign_type=eq.5_week_saf_campaign", headers=headers)
    with urllib.request.urlopen(req) as resp:
        saf_leads = json.loads(resp.read().decode())
    
    saf_location_ids = {l['cqc_location_id'] for l in saf_leads if l['cqc_location_id']}
    saf_names = set(l['name'].lower() for l in saf_leads if l['name'])
    
    # Let's get the midlands_export_import leads that the user listed.
    # We will just fetch all midlands_export_import and check them against SAF leads.
    req2 = urllib.request.Request(f"{url}/rest/v1/leads?select=id,cqc_location_id,name,email,director_name,director_email,campaign_type,current_phase&campaign_type=eq.midlands_export_import", headers=headers)
    with urllib.request.urlopen(req2) as resp2:
        midlands_leads = json.loads(resp2.read().decode())

    duplicates = 0
    unique_midlands = []
    
    for l in midlands_leads:
        # Check against SAF leads by Location ID
        if l.get('cqc_location_id') in saf_location_ids:
            duplicates += 1
        elif l.get('name') and l['name'].lower() in saf_names:
            duplicates += 1
        else:
            unique_midlands.append(l)

    print(f"Total SAF leads: {len(saf_leads)}")
    print(f"Total midlands leads fetched: {len(midlands_leads)}")
    print(f"Duplicates found: {duplicates}")
    print(f"Unique new leads ready to convert: {len(unique_midlands)}")
    
    # Of these unique leads, how many have usable emails in director_email or email?
    usable = 0
    for l in unique_midlands:
        e1 = l.get('email') or ""
        e2 = l.get('director_email') or ""
        if (e1 and not "pending" in e1) or (e2 and "@" in e2):
            usable += 1
    print(f"Of the unique leads, {usable} have usable emails.")
    
except Exception as e:
    print(str(e))
