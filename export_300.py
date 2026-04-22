import os
import json
import urllib.request
import urllib.parse
import pandas as pd

def main():
    env = {}
    with open('.env.local', 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                parts = line.split('=', 1)
                if len(parts) == 2:
                    env[parts[0]] = parts[1]

    url = env.get('NEXT_PUBLIC_SUPABASE_URL')
    key = env.get('SUPABASE_SERVICE_ROLE_KEY')

    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Range-Unit': 'items',
        'Prefer': 'count=exact'
    }

    # Fetch 300 East and West Midlands targets 
    # Prioritise those with bad ratings first, then just fill up to 300.
    
    # 1. Fetch Bad Ratings First
    req_bad = urllib.request.Request(
        f"{url}/rest/v1/leads?region=in.(East%20Midlands,West%20Midlands)&overall_rating=in.(Inadequate,Requires%20improvement)&limit=300", 
        headers=headers
    )
    with urllib.request.urlopen(req_bad) as response:
        bad_data = json.loads(response.read().decode())
    
    needed = 300 - len(bad_data)
    
    good_data = []
    if needed > 0:
        # 2. Fetch the rest (Good, Outstanding, Unrated or Overdue)
        req_good = urllib.request.Request(
            f"{url}/rest/v1/leads?region=in.(East%20Midlands,West%20Midlands)&overall_rating=not.in.(Inadequate,Requires%20improvement)&limit={needed}", 
            headers=headers
        )
        with urllib.request.urlopen(req_good) as response:
            good_data = json.loads(response.read().decode())
    
    combined_data = bad_data + good_data
    
    df = pd.DataFrame(combined_data)
    filename = 'Melissas_First_Campaign_Midlands_Targets_300.xlsx'
    df.to_excel(filename, index=False)
    
    print(f"Exported {len(df)} records ({len(bad_data)} priority, {len(good_data)} standard) to {filename}")

if __name__ == '__main__':
    main()
