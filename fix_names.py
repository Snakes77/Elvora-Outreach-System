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
    req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,name,email&campaign_type=eq.5_week_saf_campaign&name=eq.Registered%20Manager", headers=headers)
    with urllib.request.urlopen(req) as resp:
        leads = json.loads(resp.read().decode())
        
        roles = ['info', 'admin', 'hello', 'contact', 'enquiries', 'office', 'sales', 'manager', 'reception']
        
        for l in leads:
            email = l.get('email')
            if email and '@' in email:
                prefix = email.split('@')[0].lower()
                # Remove numbers from prefix
                prefix = ''.join([i for i in prefix if not i.isdigit()])
                # Split by dot or underscore
                parts = prefix.replace('_', '.').split('.')
                
                # Exclude generic role emails
                if any(r in prefix for r in roles):
                    print(f"[{email}] -> Generic role, skipping.")
                    continue
                
                if parts and len(parts[0]) > 2:
                    suggested_name = parts[0].capitalize()
                    print(f"[{email}] -> Suggested: {suggested_name}")
                    
                    # Optional: We will just patch the names here
                    patch_req = urllib.request.Request(
                        f"{url}/rest/v1/leads?id=eq.{l['id']}", 
                        data=json.dumps({"name": suggested_name}).encode(), 
                        headers=headers, 
                        method='PATCH'
                    )
                    urllib.request.urlopen(patch_req).read()
                else:
                    print(f"[{email}] -> Unclear, skipping.")
            
except Exception as e:
    print(e)
