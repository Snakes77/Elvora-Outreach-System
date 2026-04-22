import urllib.request, json, random, datetime
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

# Fetch leads
req = urllib.request.Request(f"{url}/rest/v1/leads?campaign_type=eq.5_week_saf_campaign&current_phase=eq.0&select=id", headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        leads = json.loads(resp.read().decode())
        print(f"Found {len(leads)} leads to schedule.")
        
        # Base time: 2026-04-21 09:00:00 UTC (10:00 AM BST)
        base_time = datetime.datetime(2026, 4, 21, 9, 0, 0, tzinfo=datetime.timezone.utc)
        
        success_count = 0
        for lead in leads:
            # Add between 0 and 3600 seconds (1 hour)
            random_offset = random.randint(0, 3600)
            target_time = base_time + datetime.timedelta(seconds=random_offset)
            target_time_str = target_time.isoformat()
            
            patch_req = urllib.request.Request(
                f"{url}/rest/v1/leads?id=eq.{lead['id']}", 
                data=json.dumps({"next_step_date": target_time_str}).encode(), 
                headers=headers, 
                method='PATCH'
            )
            with urllib.request.urlopen(patch_req) as patch_resp:
                if patch_resp.status in (200, 204):
                    success_count += 1
                    
        print(f"Scheduled {success_count} leads successfully.")
except Exception as e:
    print(e)
