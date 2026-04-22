import urllib.request
import json
import os
env = {}
try:
    with open('.env.local', 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k,v = line.strip().split('=', 1)
                env[k] = v
except: pass

req = urllib.request.Request("https://api.service.cqc.org.uk/public/v1/locations?perPage=1", headers={'Ocp-Apim-Subscription-Key': env.get('CQC_API_KEY','')})
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print(json.dumps(data['locations'][0], indent=2))
except Exception as e:
    print(e)
