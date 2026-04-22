import json

with open('priority_batch.json', 'r') as f:
    data = json.load(f)

campaigns = set([item.get('campaign_type') for item in data])
regions = set([item.get('region') for item in data])

print("Campaigns:", campaigns)
print("Regions:", regions)
