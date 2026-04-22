import os
import json
import urllib.request
import urllib.parse
import pandas as pd

env = {}
try:
    with open('.env.local', 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                parts = line.split('=', 1)
                if len(parts) == 2:
                    env[parts[0]] = parts[1]
except Exception:
    pass

api_key = env.get('CQC_API_KEY', '')

# Take the first care home from the CSV
df = pd.read_csv('/Users/paulmeakin/Desktop/care_home_in_East_Midlands_2026-04-14__results.csv')
test_home = df.iloc[0]
name = test_home['company_name']
print(f"Testing search for: {name}")

# The CQC API allows searching providers. There is no simple search by name for locations. 
# We'll just try to fetch locations?perPage=10 to see if it allows query params like locationName or postalCode.
url = "https://api.service.cqc.org.uk/public/v1/locations"
headers = {
    'Ocp-Apim-Subscription-Key': api_key
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(f"Total locations found in test without params limit: {len(data.get('locations', []))}")
except Exception as e:
    print(f"API Error: {e}")
