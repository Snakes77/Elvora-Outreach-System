import re

# 1. Fix outreach-templates.ts
with open('lib/outreach-templates.ts', 'r') as f:
    ts_code = f.read()

# Add campaign_type to LeadConfig
ts_code = ts_code.replace("contact_role?: string;", "campaign_type?: string;\n  contact_role?: string;")

# Replace formatName logic
old_format = """const formatName = (fullName: string) => {
  if (fullName.includes('&')) {
    return fullName.replace(/([a-zA-Z& ]+).*/, '$1').trim();
  }
  return fullName.split(' ')[0];
};"""

new_format = """const formatName = (fullName: string) => {
  if (!fullName) return 'there';
  const lower = fullName.toLowerCase();
  if (lower === 'registered manager' || lower.includes('manager') || lower === 'director' || lower.includes('nominated individual') || lower.includes('registered')) {
    return 'there';
  }
  if (fullName.includes('&')) {
    return fullName.replace(/([a-zA-Z& ]+).*/, '$1').trim();
  }
  return fullName.split(' ')[0];
};"""

ts_code = ts_code.replace(old_format, new_format)

with open('lib/outreach-templates.ts', 'w') as f:
    f.write(ts_code)

print("Fixed outreach-templates.ts")

# 2. Fix route.ts
with open('app/api/cron/sequence/route.ts', 'r') as f:
    route_code = f.read()

old_route = """                local_authority: lead.local_authority,
                cqc_service_type: lead.cqc_service_type,
            });"""

new_route = """                local_authority: lead.local_authority,
                cqc_service_type: lead.cqc_service_type,
                campaign_type: lead.campaign_type,
            });"""

route_code = route_code.replace(old_route, new_route)

with open('app/api/cron/sequence/route.ts', 'w') as f:
    f.write(route_code)

print("Fixed app/api/cron/sequence/route.ts")

