# BD Process -- Elvora Consulting
# =========================================================
# This file defines how Elvora approaches CQC-data-driven BD.
# Read before drafting any outreach.
# =========================================================

## The BD Philosophy

Melissa does not cold-pitch. She reaches out as a peer -- someone
who has 20+ years in care, who has been a Registered Manager and
Nominated Individual, and who has seen the inside of an inspection.

The prospect already knows they have a problem. The CQC told them in
writing. Melissa's job is to show she understands what that problem
feels like, and that there is a clear path out of it.

Every piece of outreach should pass this test:
"Would a registered manager who just got a Requires Improvement read
this and feel understood -- or sold to?"

---

## Prospect Tiers (priority order, matching cqc_pull.py output)

### Tier 1 -- Overdue for Inspection
Rating: Good or Outstanding. Last inspection 24+ months ago (Good)
or 18+ months ago (Outstanding).
WHY HOT: the next inspection is coming and they do not know when.
ANGLE: proactive preparation is the difference between Good and Outstanding.
TONE: Profile 4 (Energising Coach) -- aspirational, forward-looking.

### Tier 2 -- Recently Downgraded (Good to RI)
Rating: Requires Improvement. Previous rating: Good (within ~18 months).
WHY HOT: they know exactly what they have lost and what it costs.
ANGLE: "You have been Good before. You know what that felt like.
Let us get back there."
TONE: Profile 2 (Warm Mentor) -- empathetic, constructive.

### Tier 3 -- Requires Improvement (general)
Rating: Requires Improvement. Any inspection date.
WHY THEY MATTER: motivated, have a re-inspection deadline, need support.
ANGLE: the re-inspection window is the constraint -- work within it.
TONE: Profile 2 (Warm Mentor) or Profile 1 (Expert Authority).

### Tier 4 -- Inadequate
Rating: Inadequate. Enforcement action may already be in progress.
APPROACH: steady, serious, no alarm. Melissa has guided providers
through this before. Letter outreach often more appropriate than
LinkedIn for this tier.
TONE: Profile 3 (Calm in Crisis).

---

## Using the CQC Inspection Report in Outreach

When given a Location ID, fetch:
  https://www.cqc.org.uk/location/{LOCATION_ID}

Extract:
1. Overall rating and date of last inspection
2. Which key questions were rated RI or Inadequate
   (Safe / Effective / Caring / Responsive / Well-led)
3. One or two specific concerns from the report
   e.g. "medication records were not consistently completed"
        "staff did not always receive regular supervision"
4. Any enforcement action or requirement notices issued

Use items 2 and 3 in outreach -- always specific, never vague.

---

## Outreach Sequence

Day 1:  LinkedIn connection (no note, or single-line note)
Day 3:  LinkedIn message (if connected) -- lead with their situation
Day 13: Follow-up -- shorter, different angle
Day 20: Email to info@ or manager direct (if website available)
Day 30: Letter to registered address (Tier 4 only, or high-value targets)

Stop after 3 touches with no response. Log outcome in bd/prospects.csv
under outreach_status column.

---

## Email Discovery (AnyMailFinder)

AnyMailFinder is connected via MCP. Before any outreach is drafted,
the pipeline finds a verified email for the provider domain.

- Email Finder by Domain: 1 credit, returns up to 20 verified emails
- Only charged if a valid email is found (97%+ delivery rate)
- If no email found: log in Supabase, move to next prospect
- Never send to unverified addresses -- protects sending domain reputation

Credits are tracked in Supabase per send so cost-per-contact is visible.

---

## Approval Flow

All drafts go to Supabase approval queue before sending.
Nothing sends automatically without review.

1. Claude drafts email -- saved to Supabase with status: 'draft'
2. Melissa reviews in dashboard -- approves, edits, or rejects
3. On approval -- status moves to 'approved', Resend fires
4. Send logged back to Supabase -- open/click/bounce tracked
5. outreach_status updated in prospects table

Once output quality is trusted the approval step can be opened
to send automatically -- controlled by a single config flag.

---

## Services to Lead With (by tier)

| Tier              | Primary offer                                     |
|-------------------|---------------------------------------------------|
| Tier 1 (Overdue)  | Outstanding Rating Support / QA Audit             |
| Tier 2 (Downgraded)| Personal Mentorship / Inspection Preparation     |
| Tier 3 (RI)       | Inspection Preparation / Crisis Management        |
| Tier 4 (Inadequate)| Crisis Management & Turnaround / Mentorship      |

CTA: free initial conversation with Melissa
URL: elvoraconsulting.co.uk
Phone: 0115 646 8587
