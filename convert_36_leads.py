import urllib.request, json
import re

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

# The list of 36 IDs provided by the user in the prompt.
# I will just fetch all leads and check against the IDs I listed, or I can pull them from overview.txt.
import os

prompt_text = ""
with open("/Users/paulmeakin/.gemini/antigravity/brain/8f894398-9444-4296-a1e0-1d3ac5883183/.system_generated/logs/overview.txt", 'r') as f:
    prompt_text = f.read()

# Extract the block the user pasted (it has '8002d27c-...' and so on)
# We can just extract all UUIDs that appear in the last few thousand characters.
recent_text = prompt_text[-15000:]
uuids = list(set(re.findall(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', recent_text)))

try:
    # Get the 178 saf leads to check duplicates
    req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,cqc_location_id,name&campaign_type=eq.5_week_saf_campaign", headers={'apikey': key, 'Authorization': f'Bearer {key}'})
    with urllib.request.urlopen(req) as resp:
        saf_leads = json.loads(resp.read().decode())
    saf_location_ids = {l['cqc_location_id'] for l in saf_leads if l['cqc_location_id']}
    
    # Fetch the specific leads by UUID
    ids_str = ",".join(uuids)
    req2 = urllib.request.Request(f"{url}/rest/v1/leads?select=*&id=in.({ids_str})", headers={'apikey': key, 'Authorization': f'Bearer {key}'})
    with urllib.request.urlopen(req2) as resp2:
        target_leads = json.loads(resp2.read().decode())
    
    print(f"Found {len(target_leads)} matching leads from the user's list.")
    
    duplicates = 0
    patched = 0
    rejected = 0
    
    from datetime import datetime
    now_iso = datetime.utcnow().isoformat() + "Z"
    
    for l in target_leads:
        # Check duplicate
        if l.get('cqc_location_id') in saf_location_ids:
            print(f"Skipping duplicate: {l['name']}")
            duplicates += 1
            continue
            
        # We need to figure out best email and name
        best_email = l.get('director_email') or l.get('nominated_individual_email') or l.get('email') or ""
        best_name = l.get('director_name') or l.get('registered_manager') or l.get('nominated_individual') or ""
        
        # If the best email is 'pending', we can't use it.
        if "pending" in best_email or not best_email or "@" not in best_email:
            print(f"Skipping (No usable email found for {l['name']}: {best_email})")
            rejected += 1
            continue
            
        # Prepare the patch
        patch_payload = {
            "campaign_type": "5_week_saf_campaign",
            "current_phase": 0,
            "next_step_date": now_iso,
            "status": "active",
            "email_enrichment_status": "found",
            "name": str(best_name),
            "email": str(best_email)
        }
        
        patch_req = urllib.request.Request(
            f"{url}/rest/v1/leads?id=eq.{l['id']}", 
            data=json.dumps(patch_payload).encode(), 
            headers=headers, 
            method='PATCH'
        )
        urllib.request.urlopen(patch_req)
        patched += 1
        print(f"Migrated and Bundled: {best_name} ({best_email}) to SAF queue")
        
    print(f"\nFinal Statistics:")
    print(f"Total processed: {len(target_leads)}")
    print(f"Duplicates skipped: {duplicates}")
    print(f"Rejected (no usable email): {rejected}")
    print(f"Successfully migrated and queued: {patched}")
    
except Exception as e:
    print(str(e))
