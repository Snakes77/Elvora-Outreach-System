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
    # 1. Fetch all stranded SAF leads
    req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,name,email,director_name,director_email,registered_manager,email_enrichment_status&campaign_type=eq.5_week_saf_campaign", headers=headers)
    with urllib.request.urlopen(req) as resp:
        leads = json.loads(resp.read().decode())
    
    updated_count = 0
    for l in leads:
        # Check if the primary email is pending OR not found but we have a director email
        if "pending" in (l.get('email') or "") or l.get('email_enrichment_status') == 'not_found' or l.get('email_enrichment_status') == 'pending':
            target_email = l.get('director_email')
            target_name = l.get('director_name')
            
            # If there's a valid director email to rescue with:
            if target_email and "@" in target_email:
                target_name = target_name or l.get('registered_manager') or ''
                
                # Patch the DB
                patch_data = json.dumps({
                    "email": target_email,
                    "name": target_name,
                    "email_enrichment_status": "found"
                }).encode()
                
                patch_req = urllib.request.Request(f"{url}/rest/v1/leads?id=eq.{l['id']}", data=patch_data, headers=headers, method='PATCH')
                urllib.request.urlopen(patch_req)
                print(f"Rescued: {target_name} ({target_email})")
                updated_count += 1
                
    print(f"Total leads rescued and set to 'found': {updated_count}")

except Exception as e:
    print(e)
