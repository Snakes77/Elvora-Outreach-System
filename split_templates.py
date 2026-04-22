import re

with open('lib/outreach-templates.ts', 'r') as f:
    text = f.read()

# Extract SAFTemplates string
saf_match = re.search(r'export const SAFTemplates = \{.*?\n\};', text, re.DOTALL)
if saf_match:
    saf_code = "import { LeadConfig, formatName, getWeakestQualityStatement, formatInspectionDate, getSignatureHTML } from '../_shared/utils';\n\n" + saf_match.group(0) + "\n"
    with open('lib/campaigns/saf-5-week/templates.ts', 'w') as f:
        f.write(saf_code)
    print("Wrote SAF templates")

# Extract OutreachTemplates string
outreach_match = re.search(r'export const OutreachTemplates = \{.*?\n\};(?=\n\nexport const SAFTemplates)', text, re.DOTALL)
if outreach_match:
    outreach_code = "import { LeadConfig, formatName, getWeakestQualityStatement, getWeakRatingsSummary, formatInspectionDate, resolveRole, getSignatureHTML } from '../_shared/utils';\n\n" + outreach_match.group(0) + "\n"
    with open('lib/campaigns/legacy/templates.ts', 'w') as f:
        f.write(outreach_code)
    print("Wrote Legacy templates")

