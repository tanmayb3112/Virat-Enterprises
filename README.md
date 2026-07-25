# Virat Enterprises — Website

Print-ordering platform + franchise lead generator for **Virat Enterprises** (6 printing/xerox shops in Pune). _Naam hi Kaafi hai._

Built with **Next.js 14 (App Router) + TypeScript + Tailwind**, designed to run on **free tiers** (Vercel Hobby + Supabase Free). See [`VIRAT_WEBSITE_SPEC.md`](./VIRAT_WEBSITE_SPEC.md) for the full product spec.

## Runs with zero secrets

The site is **fully usable with no environment variables**. In this "demo / manual" mode:

- Customers complete the full order wizard (upload, options, live pricing, preview, branch, delivery) and **hand the order off to the shop over WhatsApp** with a pre-filled, itemised message + manual UPI.
- Franchise leads open a **WhatsApp** confirmation.
- No database is required to take real orders.

Add environment variables to progressively enable persistence, order tracking, admin, payments and email — nothing breaks if a key is missing (it degrades to the manual flow).

## Local development

```bash
npm install
cp .env.example .env.local   # optional — site works without it
npm run dev                  # http://localhost:3000
```

## Deploy to Vercel (recommended, free Hobby tier)

1. Push this repo to GitHub (the `claude/website-launch-*` branch or `main`).
2. On [vercel.com](https://vercel.com) → **New Project** → import the repo. Framework is auto-detected (Next.js).
3. (Optional now, required for backend) add the env vars from `.env.example` in **Settings → Environment Variables**.
4. **Deploy.** The site is live at `https://<project>.vercel.app`. Point a custom domain in Vercel → Domains.

## Enabling the backend (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](./supabase/schema.sql) (tables + RLS + seed).
3. Create a **private** Storage bucket named `print-files`.
4. Copy the Project URL + anon key + service-role key into your env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
5. Redeploy. Orders now persist and the header shows `env: live`.

## Routes

| Route | What |
|-------|------|
| `/` | Home — hero, rate card, services, shops, franchise teaser |
| `/order` | Print-order wizard (upload → options → preview → branch → pay) |
| `/order/[token]` | Public order-status tracker (live once Supabase is connected) |
| `/branches` | All 6 shops, map, directions, LocalBusiness schema |
| `/franchise` | Franchise landing + ROI calculator + lead form |
| `/admin` | Staff order queue + job ticket + delivery panel (demo data) |
| `/admin/reports` | Daily billed-vs-received report + CSV export |
| `/links` | Link-in-bio page for Instagram/Facebook |
| `/legal/{terms,privacy,refunds}` | Policies (draft — owner to review) |
| `/api/orders`, `/api/leads` | Order + lead capture |

## Project structure

```
app/            routes (App Router)
components/      Header, Footer
lib/            config, pricing engine, data seed, format, supabase, whatsapp
supabase/       schema.sql (tables + RLS + seed)
```

## Pricing engine

`lib/pricing.ts` is the single source of truth (live ticker + server recompute), matching the design prototype exactly. Rates come from the admin-editable `rate_card` table in production.

## What still needs the owner

See [`VIRAT_WEBSITE_SPEC.md` §14](./VIRAT_WEBSITE_SPEC.md) — branch addresses/pins for 5 shops, real rate card, Razorpay KYC, UPI QR images, staff emails, franchise numbers, logo, Meta Pixel ID, GST status, and legal review.
