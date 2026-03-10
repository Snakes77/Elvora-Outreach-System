# Elvora BD Database

Populated by cqc_pull.py. Work top-to-bottom (bd_tier, then bd_priority_score).

## Running the pull
  python3 cqc_pull.py --regions "East Midlands" "West Midlands" "North West"

  Options:
    --regions     One or more CQC region names (required)
    --ratings     Filter by rating (default: all)
    --min-beds    Minimum registered beds (default: 0)
    --output      CSV output path (default: bd/prospects.csv)
    --use-csv     Use local CQC Care Directory CSV instead of API
    --detail      Fetch full detail per location (enables downgrade detection, slower)
    --tiers       Only include tiers 1 2 3 4

  Download CQC CSV: https://www.cqc.org.uk/about-us/transparency/using-cqc-data

## Column reference
  bd_tier              1=Overdue 2=Downgraded 3=RI 4=Inadequate
  bd_priority_score    Higher = contact sooner
  location_id          Paste into CLAUDE-bd.md Active Task
  location_name        Care home name
  provider_name        Organisation / company name
  address              Full address
  region               CQC region
  local_authority      Local authority
  phone                Registered phone
  website              Provider website
  beds                 Registered bed count
  current_rating       CQC overall rating
  last_inspection      Date of last inspection (YYYY-MM-DD)
  days_since_insp      Days since that inspection
  previous_rating      Prior rating (if --detail used)
  downgraded           Y = was Good, now RI
  overdue_flag         Y = inspection likely overdue
  safe_rating          Key question: Safe
  well_led_rating      Key question: Well-led
  outreach_status      blank / contacted / responded / converted / not_suitable
  notes                Free text
