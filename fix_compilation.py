import os

# 1. Update utils.ts to export bookingButton and signature
with open('lib/campaigns/_shared/utils.ts', 'r') as f:
    utils = f.read()

utils += """
export const bookingButton = (text: string) => `
<div style="margin-top: 20px;">
  <a href="${BOOKING_URL}" style="display: inline-block; padding: 12px 24px; background-color: #00938a; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold;">
    ${text}
  </a>
</div>`;

export const signature = getSignatureHTML({});
"""
with open('lib/campaigns/_shared/utils.ts', 'w') as f:
    f.write(utils)
    
# 2. Add them to legacy/templates.ts imports
with open('lib/campaigns/legacy/templates.ts', 'r') as f:
    legacy = f.read()
legacy = legacy.replace("getSignatureHTML } from '../_shared/utils';", "getSignatureHTML, bookingButton, signature } from '../_shared/utils';")
with open('lib/campaigns/legacy/templates.ts', 'w') as f:
    f.write(legacy)

# 3. Add them to saf-5-week/templates.ts imports
with open('lib/campaigns/saf-5-week/templates.ts', 'r') as f:
    saf = f.read()
saf = saf.replace("getSignatureHTML } from '../_shared/utils';", "getSignatureHTML, bookingButton, signature } from '../_shared/utils';")
with open('lib/campaigns/saf-5-week/templates.ts', 'w') as f:
    f.write(saf)

# 4. Remove outreach-templates.ts again
if os.path.exists('lib/outreach-templates.ts'):
    os.remove('lib/outreach-templates.ts')

