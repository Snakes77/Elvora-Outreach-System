import csv
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

csv_path = '/Users/paulmeakin/Desktop/care_home_in_East_Midlands_2026-04-14__results.csv'
try:
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        headers_list = reader.fieldnames
        print("Headers found in CSV:")
        print(headers_list)
        
        # Read a few rows
        count = 0
        names = []
        missing_names = 0
        for row in reader:
            count += 1
            # Check what name column might be
            # E.g. 'decision_maker_name', 'company_name', 'Contact Name'
            n1 = row.get('decision_maker_name')
            if n1: names.append(n1)
            else: missing_names += 1
            
        print(f"Total rows: {count}")
        print(f"Rows with decision_maker_name populated: {len(names)}")
        print(f"Rows missing decision_maker_name: {missing_names}")
        
except Exception as e:
    print(e)
    
# Also check Supabase for the missing names
try:
    req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,name,campaign_type&campaign_type=eq.5_week_saf_campaign", headers=headers)
    with urllib.request.urlopen(req) as resp:
        leads = json.loads(resp.read().decode())
        
        reg_mgr = 0
        real_names = 0
        for l in leads:
            name = l.get('name')
            if name == 'Registered Manager':
                reg_mgr += 1
            else:
                real_names += 1
                
        print(f"\nIn Supabase out of {len(leads)} leads:")
        print(f"Real names found: {real_names}")
        print(f"Registered Manager (blank in DB): {reg_mgr}")
except Exception as e:
    print(e)

