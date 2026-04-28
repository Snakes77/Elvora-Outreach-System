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
    req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,name,email,director_name,director_email,registered_manager,email_enrichment_status&campaign_type=eq.midlands_export_import", headers=headers)
    with urllib.request.urlopen(req) as resp:
        leads = json.loads(resp.read().decode())
    
    updated_count = 0
    for l in leads:
        email = l.get('email') or ""
        status = l.get('email_enrichment_status')
        target_email = l.get('director_email')
        
        # If primary email is pending, empty, or not found, BUT we have a real director email
        if ("pending" in email or status in ['not_found', 'pending', None] or not email) and target_email and "@" in target_email:
            # We must rescue it!
            target_name = l.get('director_name') or l.get('registered_manager') or ''
            
            patch_data = json.dumps({
                "email": target_email,
                "name": target_name,
                "email_enrichment_status": "found"
            }).encode()
            
            patch_req = urllib.request.Request(f"{url}/rest/v1/leads?id=eq.{l['id']}", data=patch_data, headers=headers, method='PATCH')
            urllib.request.urlopen(patch_req)
            print(f"Rescued: {target_name} ({target_email})")
            updated_count += 1
            
    print(f"Total Midlands leads rescued and set to 'found': {updated_count}")
    
    # Let's count how many are now waiting to go in the 'midlands_export_import' queue
    req_check = urllib.request.Request(f"{url}/rest/v1/leads?select=id&campaign_type=eq.midlands_export_import&email_enrichment_status=eq.found&current_phase=eq.0", headers=headers)
    with urllib.request.urlopen(req_check) as resp_check:
         print(f"Total Midlands Leads ready to send at phase 0: {len(json.loads(resp_check.read().decode()))}")

except Exception as e:
    print(e)
