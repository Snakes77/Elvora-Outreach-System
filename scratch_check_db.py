import json
import urllib.request
import urllib.parse
import pandas as pd
import os

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
    'Range-Unit': 'items'
}

df = pd.read_csv('/Users/paulmeakin/Desktop/care_home_in_East_Midlands_2026-04-14__results.csv')
print(f"Total rows in CSV: {len(df)}")
# check if any of these are in the DB by checking provider or address?

req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,cqc_location_id,name,provider,address,region,overall_rating,rating_safe,rating_effective,rating_caring,rating_responsive,rating_well_led", headers=headers)
with urllib.request.urlopen(req) as response:
    db_leads = json.loads(response.read().decode())
print(f"Total leads in Supabase: {len(db_leads)}")

# we can match by checking if the company_name in csv is close to the provider in DB
csv_names = df['company_name'].str.lower().tolist()
db_providers = [str(l.get('provider')).lower() for l in db_leads if l.get('provider')]

matches = 0
for name in csv_names:
    for provider in db_providers:
        if name in provider or provider in name:
            matches += 1
            break

print(f"Rough matches found in DB by name: {matches}")
