# CLAUDE.md -- Elvora Consulting / Business Development

@context/about.md
@context/voice.md
@context/anti-words.md
@context/tone-profiles.md
@context/bd/bd-process.md

## How to Use This Mode

This mode turns CQC prospect data into targeted outreach from Melissa.
Run cqc_pull.py first to build the prospect database, then use this
mode to draft outreach anchored in each provider's actual CQC record.

### Workflow:
1. Run: python3 cqc_pull.py --regions "East Midlands" "West Midlands"
2. Open bd/prospects.csv -- work from the top (highest priority first)
3. Copy the location_id from the row you want to target
4. Paste it into Active Task below with the outreach type you want
5. Claude fetches that location's CQC page, extracts specific findings,
   then drafts outreach from Melissa that references what the inspector
   actually found -- not generic, not vague, not a pitch

### Outreach types:
- linkedin-connect   -- short connection note (300 chars max)
- linkedin-message   -- first message post-connection (~400 words)
- email-cold         -- cold email to registered manager or provider
- email-followup     -- 10-day follow-up if no response
- letter             -- formal letter to provider address (Tier 4 / Inadequate)

### The non-negotiable rule:
Every piece of outreach must reference something specific from that
provider's actual CQC record. Generic outreach does not come from Melissa.

### Tone by tier:
- Tier 1 (Overdue)       -- Profile 4 (Energising Coach) -- aspirational
- Tier 2 (Downgraded)    -- Profile 2 (Warm Mentor) -- empathetic
- Tier 3 (RI general)    -- Profile 2 (Warm Mentor) or Profile 1 (Expert Authority)
- Tier 4 (Inadequate)    -- Profile 3 (Calm in Crisis) -- direct, steady

### CQC report URL format:
https://www.cqc.org.uk/location/{LOCATION_ID}

## Active Task
<!-- location_id:
     outreach_type:
     tier (from CSV):
     any_context (beds, care type, region, anything notable):
     tone_override (optional): -->
