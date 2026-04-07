# Elvora Outreach System 🚀
### Automated CQC-Targeted Marketing & Lead Generation

A high-sophistication lead generation and outreach engine designed specifically for the UK care sector. This system automates the end-to-end process of identifying care providers from the CQC (Care Quality Commission) API, enriching them with performance metadata, and executing hyper-personalized email campaigns anchored in the **Single Assessment Framework (SAF)**.

---

## 🌟 Core Capabilities

### 1. The Super Sync Engine (`/scripts/sync-cqc.ts`)
A robust data acquisition layer that deep-scans the CQC API using **Postcode Prefix Targeting** (e.g., NG, LE, DE, B, WR) to build high-density regional lead lists.
- **SAF Data Enrichment**: Automatically maps the 34 new "Quality Statements" and 5 Key Questions (Safe, Effective, Caring, Responsive, Well led).
- **Direct Boarding**: Supports the `--location=ID` flag for instant onboarding of high-value individual targets.
- **Credit Guard**: Integrated with AnyMailFinder APIs to track and protect discovery quotas.

### 2. Precision Outreach Engine (`/lib/outreach-templates.ts`)
An 8-week automated email sequence designed by Elvora Consulting to nurture leads from cold to consultation.
- **Dynamic Anchoring**: Every email is dynamically anchored to the lead's specific CQC performance (e.g., focusing on a "Requires Improvement" rating in the "Safe" category).
- **Melissa Meakin Persona**: Strictly human-first, peer-to-peer tone using professional UK English.
- **Multi-Sender Rotation**: 3-inbox rotation strategy (Mailforge) to ensure maximum deliverability and domain reputation protection.

### 3. Engagement Guard & Webhooks
Outreach is a "Stop on Interaction" system. The suite includes real-time webhook handlers for:
- **Resend Webhooks**: Pauses outreach upon email opens, clicks, or replies.
- **Microsoft/Google Bookings**: Instantly identifies consultation bookings to ensure no redundant follow-ups are sent.

### 4. Branded CQC Ratings Widget (`/app/api/widget/`)
A premium, glassmorphic UI value-add offer for engaged prospects.
- **Premium Design**: High-performance "Elvora Insights" badge for care home websites.
- **Real-Time Data**: Served via a secure public API endpoint and lightweight JS loader.

---

## 🎨 Design & Style Standards

This project adheres to the strict **[Elvora Style Guide](STYLE_GUIDE.md)**:
- **UK English Only**: Strictly `-ise` spellings (e.g., personalisation).
- **Zero Hyphen Policy**: Punctuation is kept clean and professional; hyphens are avoided in all user-facing copy (e.g., `Well led` vs `Well-led`).
- **Anti-Word Filter**: No AI-isms (e.g., no "delve", "robust", "leverage", or "hurdle").

---

## 🛠️ Technical Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL) with Admin Client access.
- **Email API**: Resend
- **Workflow**: `tsx` for high-speed script execution.

---

## 🚀 Getting Started

### 1. Environment Configuration
Create a `.env.local` file with the following keys:
```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
CQC_API_KEY=...
RESEND_API_KEY=...
CRON_SECRET=...
```

### 2. Synchronize Data
To populate the database with Midlands targets:
```bash
npx tsx scripts/sync-cqc.ts
```

### 3. Trigger Outreach
The outreach cycle is managed via a cron job at `/api/cron/outreach`. In production, this should be triggered daily.

---

Developed with ❤️ by Elvora Consulting.
*Care Quality Excellence.*
