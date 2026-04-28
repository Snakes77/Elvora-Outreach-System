import urllib.request, json
from datetime import datetime

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

uuids = [
    "8002d27c-4387-41e0-9cdc-76547081d8e5", "83e25ff5-ffd1-4ce4-a846-cd74aa4eee41", "1e3162ce-de8b-41e3-a444-bc1800d9838e", "f0b9f717-0609-4913-a6b8-dfbdb39bec3e", "ccf81e2e-8059-450b-a62f-72636cfa718d", "8673cec3-7c9a-4340-bbd1-31a8956453d0", "cb4cafc2-2431-484e-9e6f-68d5463444ec", "f6152a55-36fb-4616-972b-1a84b8060228", "acbad03c-6961-4829-aa43-570d02be4163", "df625398-dfb1-4b13-a467-e429746c81dc", "847ed22b-b95a-4e26-983d-cd011c176d54", "7211fd14-7376-40a5-93e0-97ad78a59c92", "d5852d8c-4791-4493-aad3-85b2a67f2bc5", "de9e7552-d0e5-4b99-9439-09e2a43c1ae4", "d52ca6f2-304f-48b7-872b-798a21c1e7fa", "7f621bbe-c4a8-4046-b369-c0e60f64027a", "e62bcee5-2849-46dc-8216-107aab6694eb", "45c330fd-fbe1-4973-bf5e-94b2345aca56", "5806007a-92b2-403c-8dd5-27a0a9165263", "8e54fc25-d30d-4b64-b935-890b05b15bb4", "882a7a71-f2ba-4d8a-9212-04f5f8126419", "ad95819e-3262-48c0-9c14-080654c5eeff", "1c407fbf-13a7-41d1-bf32-cc723402914a", "d937dae4-eec0-4efe-bd35-fb2f2252b071", "abc2ca45-93b2-49a2-940f-6ddb5e97c719", "55cb1ace-4a70-41b4-a31c-99fab9e15f3c", "f3a9379a-02e9-4f38-8271-2c92e8b3cf29", "f44cd37e-cc4d-4bdd-8b99-dccf2d2dc38c", "6ad153ea-0c97-446f-9410-58deebc4b28e", "5a52490a-597c-49a5-8347-788b9dcb191d", "f638b820-ab80-41e6-82d4-a96a6d536174", "262be4cf-887c-48ba-954d-96d7a1a4d2d7", "4961446e-8ded-4a33-90d3-827b7d3b9aa7", "e1cc9c32-da69-4366-8c0f-786ddade2f29", "ba6d6044-a800-4c1a-9898-a29ee2e10c1e", "be9c81ea-5c75-4227-a875-7256e26fd597", "bb0d3b38-92f7-494e-a675-e3e102bffc0f", "8c746c5a-f4fd-400a-b70e-316206d25b30", "a8cbf886-b4a9-4aef-ae30-c0fadf14e931", "042e204e-e02b-474d-a57f-61fbe7fd91c8", "9d8c3c3a-a01c-4dff-9174-5d8616919078", "acfebcdb-f6a9-4785-a4ef-3de98fc2b041", "1dd2d9d3-0181-4075-8f37-8098a4a2cd20", "3fe69a17-514f-4d09-a127-9287840c1769", "4fd0b3fb-c297-416d-a8b6-62ed0c6da9f6", "e5956ea6-e01c-48e3-b809-e82a985fd7b6", "7c6a7479-ed37-47fe-bc58-e03ccebfdd10", "26cf35b8-53f0-40c5-aad6-61364da94dfe", "bf34be6b-d262-450c-ab5a-1e32531611af", "ead5003f-eaa1-45a6-a183-80cda392e815", "f4fb71a1-c75a-4c08-bd4c-a37bd5119a71", "220d0df3-372b-4797-a730-45f621158b9a", "265eff1c-e10a-4c7a-a30f-6cb8bcc11c9d", "ffc0358c-cf9e-4d25-93d8-887db9f65e7d", "0d566b0a-6b4b-4c67-9285-5d3c505c60ff", "0484033c-cb19-4404-8248-685981a2621c", "aac11d10-1ea3-4705-8298-1681a96e2832", "ba920571-f218-4540-b710-42a6c435aa59", "eb3a219b-88db-4b7c-97eb-517cf5886106", "564f8363-837e-400d-8a28-10ce6622d591", "44402bdf-e3af-466e-980b-39f0a0f48ff2", "759ed798-46cf-4a9a-9b20-681c2457f77c", "d6762c3c-5ac0-4979-bf1d-23a042c342bb", "86017bc6-cf73-449b-8089-ed56abfbe51b", "973a1106-20e0-4569-986c-f1451a7e20fa", "54b10c73-a540-4a25-a5ad-4820cca39ee9", "438683bb-2129-436e-9d5e-07db34c29e2f", "f0a7d4ba-ceaa-4d1c-93c3-0badd5e5e6d8", "5899cc42-e1a2-4b80-b6f1-a807f05e76ba", "d6af2215-0618-43c1-9f26-7a793ae2d9d9", "cff1a3bf-9f1a-4118-a1eb-06b0ffdcf49f", "8f7c0ee2-248e-465e-b520-bb668876e58e", "b03e4561-f780-407d-8e40-cd00d62807af", "7687e1e6-4fff-40e5-872b-9c6d4ad28ae9", "252484b0-9ba2-4936-8eb4-fe362bc4ccfd", "c9bf573a-1863-497c-9976-53cd1529bba3", "1604b22a-a030-4f62-b0a8-0c68bc06b5f1", "188c825c-9ba4-4631-9da0-96e5e82c623d", "df6bdcea-0fea-4735-9fe2-182046bf8508", "0b2d8c50-e656-4bdf-ae12-407221da88ee", "70848932-670f-4a8f-b355-e6705aa33685", "7c5fa6d2-b591-4977-ac26-d3f5b88fd5fa", "1e7c8a11-71e4-40c0-9ab8-871ef67862e6", "4bc3fe18-845b-4fa1-b515-655b966e53c9", "6cf28189-0088-44d4-918c-0cf33659ca80", "77eb81d9-f7d9-45c9-8b2b-1ec9b820ae03", "47d045fa-9615-4984-a294-940bd72f9ec0", "92040d3b-08f9-4663-b0a4-d649afeab307", "8cd1b179-32b4-43c7-bb94-d58f1c14e249", "9add253d-e221-40f1-b7aa-65449e334a4d", "55f023d5-f136-41cc-bce6-f224023d3d3f", "aa004ac8-2a7c-441d-82e0-39a6540e1509", "f60013e7-f651-42e7-9fe9-5b2fe807e96c", "114b4575-9ec0-44a9-aea5-e3bf0301c3e4", "53bf2496-f477-4301-b559-bc9d385bf3aa", "b08c6a5b-c7d1-4062-aa7a-e796750428f0", "030e6fde-511d-495a-877f-ac84edfca4e7", "630f0daa-26b8-4975-b3c4-29445660d87f", "18083f5a-c974-445a-8555-2e495a7893a5", "d37c1669-70bf-4708-be36-88478043bd21", "f724dd6e-4b0e-4d3e-93ca-1bfdcc3468e9", "aadc3f95-920c-4d1f-b1b3-91036f59d5b7", "7234c2cf-da48-4393-8cb2-04e34cf8fdc3", "b9ae575d-d798-4912-871e-33f18a47b965", "1793be2f-5ff9-4cf4-85bc-ff724034d618", "483501e8-124c-436a-9bba-e1b3a6c9dbc4", "25a438dd-6dbe-43cf-be8e-25827e44020b"
]

try:
    # 1. Fetch SAF leads to ensure no duplicates
    req = urllib.request.Request(f"{url}/rest/v1/leads?select=id,cqc_location_id,name&campaign_type=eq.5_week_saf_campaign", headers={'apikey': key, 'Authorization': f'Bearer {key}'})
    with urllib.request.urlopen(req) as resp:
        saf_leads = json.loads(resp.read().decode())
    saf_location_ids = {l['cqc_location_id'] for l in saf_leads if l['cqc_location_id']}
    
    # 2. Fetch the target data for the array
    ids_str = ",".join(uuids)
    req2 = urllib.request.Request(f"{url}/rest/v1/leads?select=*&id=in.({ids_str})", headers={'apikey': key, 'Authorization': f'Bearer {key}'})
    with urllib.request.urlopen(req2) as resp2:
        target_leads = json.loads(resp2.read().decode())
        
    duplicates = 0
    patched = 0
    rejected = 0
    now_iso = datetime.utcnow().isoformat() + "Z"
    
    for l in target_leads:
        if l.get('cqc_location_id') in saf_location_ids and l.get('campaign_type') != '5_week_saf_campaign':
            duplicates += 1
            print(f"Skipping duplicate: {l['name']}")
            continue
            
        best_email = l.get('director_email') or l.get('nominated_individual_email') or l.get('email') or ""
        best_name = l.get('director_name') or l.get('registered_manager') or l.get('nominated_individual') or ""
        
        # Must have valid email to send, bypass pending
        if "pending" in best_email or not best_email or "@" not in best_email:
            rejected += 1
            print(f"Rejected (No usable email): {l['name']}")
            continue
            
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
            
    print(f"\nFinal Statistics:")
    print(f"Total processed: {len(target_leads)}")
    print(f"Duplicates skipped: {duplicates}")
    print(f"Rejected (no usable email): {rejected}")
    print(f"Successfully migrated and queued: {patched}")
    
except Exception as e:
    print(str(e))
