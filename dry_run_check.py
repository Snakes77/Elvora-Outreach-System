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

def formatName(fullName):
    if not fullName: return 'there'
    lower = fullName.lower()
    if lower == 'registered manager' or 'manager' in lower or lower == 'director' or 'nominated individual' in lower or 'registered' in lower:
        return 'there'
    if '&' in fullName:
        return re.sub(r'([a-zA-Z& ]+).*', r'\1', fullName).strip()
    return fullName.split(' ')[0]

try:
    req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,name,email,current_phase,status,next_step_date,campaign_type&campaign_type=eq.5_week_saf_campaign&current_phase=eq.0", headers=headers)
    with urllib.request.urlopen(req) as resp:
        leads = json.loads(resp.read().decode())
        
        print(f"Number of leads waiting to dispatch: {len(leads)}")
        
        real_names = 0
        hi_there_count = 0
        
        for l in leads:
            rendered = formatName(l.get('name', ''))
            if rendered.lower() == 'there':
                hi_there_count += 1
            else:
                real_names += 1
                
        print(f"Emails correctly starting with 'Hi [Name],': {real_names}")
        print(f"Emails safely defaulting to 'Hi there,': {hi_there_count}")
        
except Exception as e:
    print(e)
