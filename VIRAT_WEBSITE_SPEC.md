# Virat Enterprises — Website Specification (for Claude Code)

> **Purpose of this file:** Complete build instruction for Claude Code to develop the Virat Enterprises website — a print-ordering platform + franchise lead generator. Everything must run on **free tiers only**. Read this entire file before writing any code.

---

## 1. Business Overview

**Virat Enterprises** ("Naam hi Kaafi hai") is a printing & xerox business with **6 branches in Pune**:

| # | Branch | Brand name | Address | Phone | Coordinates |
|---|--------|-----------|---------|-------|-------------|
| 1 | Mukund Nagar | Virat Enterprises | Shop 7, Hermes Heritage Shopping Complex, Rahim Shaikh Road, Mukund Nagar, Pune | +91 98231 41366 | TODO: lat/lng |
| 2 | JM Road | Virat | TODO: full address | TODO | TODO: lat/lng |
| 3 | Satara Road | MM Digital | TODO: full address | TODO | TODO: lat/lng |
| 4 | ABC (Appa Balwant Chowk) | Virat | TODO: full address | TODO | TODO: lat/lng |
| 5 | Pune Corporation | Virat | TODO: full address | TODO | TODO: lat/lng |
| 6 | TODO: 6th branch name | Virat | TODO: full address | TODO | TODO: lat/lng |

> **IMPORTANT:** Branch data must live in a Supabase `branches` table (not hard-coded), editable from the admin dashboard. Seed with the rows above. Coordinates are required for the 3 km free-delivery check — geocode each address once and store lat/lng.

**Services:** Xerox/photocopy, B/W & color printing, binding, lamination, scanning, large-format/CAD prints, stationery. Print prices historically start at ₹0.35/side for students.

**Site audiences:**
1. **Customers** — place print orders online, pay, get delivery/pickup.
2. **Staff/owners** — manage orders, book deliveries, see daily reports.
3. **Franchise prospects** — learn about the model, calculate ROI, submit a lead.
4. **Ad traffic** — Facebook/Instagram ad landing pages with tracking.

---

## 2. Tech Stack (FREE TIER ONLY — hard constraint)

| Layer | Choice | Free-tier notes |
|-------|--------|-----------------|
| Hosting/frontend/API | **Next.js 14+ (App Router) on Vercel Hobby** | 100 GB bandwidth/mo, serverless functions. No cron beyond 2/day on Hobby — daily report cron fits. |
| Database + Auth + Storage | **Supabase Free** | 500 MB DB, 1 GB storage, 50k MAU auth. One project holds everything. |
| File uploads (print files) | **Supabase Storage** (decided — NOT OneDrive) | Private bucket `print-files`. Auto-delete files 7 days after order completion (cron) to stay under 1 GB. Max upload 25 MB/file. |
| Payments (primary) | **Razorpay Standard Checkout** | Free to set up (KYC needed). 0% on UPI for small merchants; webhook auto-confirms payment. |
| Payments (fallback) | **Static UPI QR + manual confirmation** | If Razorpay onboarding stalls: show shop QR image + UPI ID, customer enters UPI transaction ref (UTR), staff verifies in bank app and marks "Paid" on dashboard. **Build both paths; feature-flag via env var `PAYMENT_MODE=razorpay|manual`.** |
| Transactional email | **Resend Free** (100/day, 3k/mo) | New-order alerts to branch staff email + customer invoice email. |
| Maps/geocoding | **OpenStreetMap Nominatim (free) + Leaflet** | Geocode customer address → haversine distance to branch for 3 km check. Respect Nominatim usage policy (1 req/sec, proper User-Agent). Let customer drag a pin to fix location. |
| PDF handling | **pdf.js (client-side)** | Page count + print preview in browser. No server cost. |
| Invoice PDF | **@react-pdf/renderer or pdf-lib** (serverless) | Generate invoice PDF on demand. |
| Analytics/ads | **Meta Pixel + Vercel Analytics (free)** | Pixel events for ad conversion tracking. |

**Explicitly rejected:** OneDrive/Microsoft Graph (too much setup), paid tiers of anything, AWS S3, Twilio SMS (paid). If a feature can't be done free, degrade gracefully to a manual workflow and note it in the UI.

---

## 3. Roles & Auth

- **Supabase Auth**: Google OAuth + email magic-link/OTP.
- `profiles` table with `role`: `customer` (default) | `staff` | `admin`.
- **Staff detection:** an `allowed_staff_emails` table (admin-editable). On login, if the user's email matches, upgrade role to `staff` and route them to the **Orders Dashboard** instead of the customer storefront. Admin emails get reports + settings too.
- Each staff member is linked to one or more branches (`staff_branches` join table) — they only see their branch's orders. Admins see all.
- Customers can save: name, phone, addresses (multiple), default print preferences.
- Guest checkout allowed (name + phone + address, no account) — but account creation is offered post-order.

---

## 4. Customer Flow — Print Ordering (Feature 1)

### 4.1 Upload
- Accept: PDF, JPG/PNG, DOCX/PPTX/XLSX. Multiple files per order.
- PDF/images: parse page count client-side (pdf.js / image = 1 page).
- Office files: no client parsing — ask customer "How many pages?" (number input) and show a notice: *"Page count will be verified by the shop; price may adjust."* Staff can edit page count on the dashboard, which recalculates the bill; customer is notified by email if it changes.
- Store in Supabase Storage under `print-files/{order_id}/{filename}`. Private bucket; staff access via signed URLs.

### 4.2 Print preferences (per file — keep it FAST, sensible defaults pre-selected)
| Option | Choices | Default |
|--------|---------|---------|
| Paper size | A4, A3, A5, Legal, Letter | A4 |
| Color | B/W, Color | B/W |
| Sides | Single-sided, Double-sided | Double-sided |
| Orientation | Portrait, Landscape | Portrait (auto-detect from PDF) |
| Paper quality | 70 GSM, 80 GSM, 100 GSM, Glossy | 70 GSM |
| Pages per side (N-up) | 1, 2, 4 | 1 |
| Copies | 1–999 | 1 |
| Binding (whole order) | None, Staple, Spiral, Hard | None |
| Lamination (whole order) | None, per-page | None |
| Page range | All / custom (e.g. 1-5, 8) | All |
| Notes | free text ("print pages 2–4 in color only", etc.) | empty |

One screen, chip/toggle UI, no multi-step wizard for preferences. Advanced options (N-up, page range, GSM) collapsed under "More options".

### 4.3 Print preview
- Client-side render with pdf.js: show first pages as thumbnails reflecting **orientation, N-up layout, color/greyscale filter (CSS `filter: grayscale(1)` for B/W), and single/double side indication** (front/back page pairing view).
- Live price ticker updates as preferences change.

### 4.4 Branch selection
- "Choose your branch" — list + Leaflet map of all 6 branches.
- If customer shares location (browser geolocation) or enters address first, sort branches by distance and pre-select the nearest.

### 4.5 Delivery / pickup
- Options: **Pickup from shop** (free) or **Home delivery**.
- Delivery address: saved addresses for logged-in users, or address form + draggable map pin (Nominatim geocode).
- **Delivery fee rules (display prominently):**
  - Distance ≤ 3 km from selected branch **AND** order value > ₹500 → **FREE delivery**.
  - Otherwise → *"Delivery charges at actuals — your parcel is sent as a Cash-on-Delivery courier (Uber/Rapido parcel); you pay the delivery partner directly on receipt."*
- Show computed distance and which rule applies before checkout.

### 4.6 Billing, payment, invoice
- Bill = Σ(per-file: pages × sides-adjusted sheet count × copies × rate[size][color][gsm]) + binding + lamination. GST line only if the business is GST-registered (env flag `GST_ENABLED`, `GST_NUMBER`, 18% on services — confirm with owner; default OFF).
- **Rate card:** stored in `rate_card` table, admin-editable from dashboard. **Seed with placeholder rates (owner will edit):**

| Item | Placeholder rate |
|------|-----------------|
| A4 B/W per side (70 GSM) | ₹2 |
| A4 B/W per side, 100+ sides | ₹1.5 |
| A4 Color per side | ₹10 |
| A3 B/W per side | ₹5 |
| A3 Color per side | ₹20 |
| 100 GSM surcharge per sheet | +₹1 |
| Glossy per sheet | +₹15 |
| Spiral binding | ₹40 |
| Hard binding | ₹150 |
| Staple | Free |
| Lamination per page (A4) | ₹20 |
| Minimum order | ₹20 |

- **Payment (mode = razorpay):** Razorpay Checkout (UPI/cards/netbanking). Webhook `payment.captured` → mark order `PAID`.
- **Payment (mode = manual):** show branch's UPI QR image + UPI ID (`upi://pay?pa=...&am=...` deep link too), customer submits UTR/reference number, order enters `PAYMENT_PENDING_VERIFICATION`; staff verifies and marks paid.
- **Invoice:** auto-numbered (`VE-{branch}-{YYYYMM}-{seq}`), downloadable PDF, emailed to customer on payment. Includes branch details, itemized job, delivery fee note.

### 4.7 Order statuses
`RECEIVED → PAYMENT_PENDING(_VERIFICATION) → PAID → PRINTING → READY → OUT_FOR_DELIVERY / READY_FOR_PICKUP → COMPLETED` (+ `CANCELLED`, `REFUND_NEEDED`). Customer sees a status tracker page (link in email; no login needed via order token URL).

---

## 5. Staff/Owner Flow — Order Management (Feature 2)

### 5.1 Orders dashboard (`/admin`)
- Staff log in with their allowlisted email → see live order queue for their branch (Supabase Realtime subscription — new orders appear without refresh + sound ping).
- Order card: files (signed-URL download links), all preferences clearly printed as a **job ticket** (printable A5 slip), customer contact, payment status, delivery type/address/distance.
- Actions: verify payment (manual mode), edit page count/price (office files), advance status, cancel with reason.
- **Email notifications (Resend):** every new paid order → email to the branch's notification address with job ticket summary + dashboard link. Also on cancellation.

### 5.2 Assisted delivery booking (when staff marks order READY + delivery)
No free Uber/Rapido APIs exist, so build an **assisted booking panel**:
- Shows pickup (branch address) and drop (customer address) pre-formatted with copy buttons.
- Deep links: open Uber (`https://m.uber.com/ul/?action=setPickup&pickup[latitude]=...&dropoff[latitude]=...` — use Uber universal link format) and Rapido app/site.
- Reminder box showing payment rule for THIS order: "FREE delivery — Virat pays courier" or "COD — customer pays courier ₹at actuals; book as cash/COD parcel".
- Staff enters: vendor (Uber/Rapido/Other), booking/tracking ID (optional), courier fee. Status → `OUT_FOR_DELIVERY`.
- On delivery confirmation from the vendor app, staff clicks **"Mark Delivered"** → status `COMPLETED`, customer gets completion email.

### 5.3 Daily reports (Feature 3)
- `/admin/reports`: per-branch and all-branch daily/weekly/monthly views.
- Metrics: total orders, **total billed amount**, total confirmed/received payments (Razorpay-captured + manually-verified), gap between billed vs received (flag mismatches), delivery fees paid, cancelled orders, top services.
- Vercel cron (1/day, within Hobby limit) emails an end-of-day summary to admin email(s). CSV export button.

---

## 6. Franchise Section (Feature 4)

Route: `/franchise` — this is also the primary **ad landing page** (see §7). Tone: clean, trustworthy, minimal jargon, Hindi/Marathi-friendly English.

### 6.1 Content sections (in order)
1. **Hero:** "Own a Virat Enterprises Franchise" + key stats strip (see business profile below) + CTA "Calculate your ROI".
2. **About Virat (Business Profile):**
   - Company name, logo, tagline "Naam hi Kaafi hai"
   - Services offered (full list §1)
   - **6 shops across Pune** with map
   - Business model: **FOFO (Franchise Owned, Franchise Operated)** — TODO: owner wrote "FIFO" in notes; confirm exact model wording with owner
   - How we help customers (quality, speed, price)
   - Current business performance (from owner's intake sheet — verify before publishing): ~₹1,00,000 approximate monthly revenue per shop; ~₹10,000 average daily sales; existing locations: Shanti Nagar, Mukund Nagar, Corporation, JM Road, Satara Rd, ABC Chowk
   - Legal documents provided (franchise agreement, licenses guidance)
3. **Investment tiers** (from owner's notes):

| Tier | Total investment | Includes |
|------|-----------------|----------|
| Starter | ₹10 lakh | Includes ₹2 lakh franchise fee |
| Growth | ₹20 lakh | Includes ₹2 lakh franchise fee |
| Premium | ₹30 lakh | Includes ₹2 lakh franchise fee |

   Copy: **"Franchise starts from ₹10 lakh minimum (includes ₹2 lakh franchise fee)."**
4. **What's included from Virat's side (Inclusions):** brand name & marketing, shop layout design + **sample design gallery**, machinery guidance/procurement, training, supply chain (paper/ink), centralized online orders from this website routed to your shop, ongoing support. **Shop setup timeline: X days to complete shop work** (TODO: owner to give exact number of days).
5. **Steps to get a franchise:** 1) Submit interest form → 2) Call/meeting with Virat team → 3) Location survey & approval → 4) Agreement + franchise fee → 5) Shop design & fit-out (X days) → 6) Training → 7) Launch. Show as a numbered timeline graphic.
6. **ROI Calculator (interactive):** inputs: investment tier (10/20/30 L), expected monthly sale (₹, slider, default ₹1,00,000 based on current shops), margin % (default: TODO from owner's ROI sheet; placeholder 30% gross / 20% net). Outputs: **gross profit/mo, net profit/mo, payback ("mention") period in months, 3-year projection chart.** Disclaimer: *"Estimates based on current shop performance; actual results vary. Not a guarantee of returns."* All calculator defaults come from an admin-editable `franchise_assumptions` table.
7. **Lead form:** name, phone (required, validated Indian mobile), email, city/area, investment budget (dropdown: 10L / 20L / 30L / not sure), owns shop space? (Y/N), message. → saved to `franchise_leads` table + email alert to admin + WhatsApp click-to-chat confirmation link. Fire Meta Pixel `Lead` event.
8. **FAQ** (accordion) + final CTA.

---

## 7. Ads Hook — Facebook/Instagram (Feature 5)

- **Meta Pixel** installed site-wide (env `NEXT_PUBLIC_META_PIXEL_ID`). Events: `PageView`, `ViewContent` (franchise page), `Lead` (franchise form), `InitiateCheckout`, `Purchase` (print orders, with value).
- UTM parameters captured on landing and stored with any lead/order (`utm_source/medium/campaign`).
- Landing pages designed as ad destinations: `/franchise` (franchise campaigns) and `/` or `/order` (print-order campaigns). Fast LCP, mobile-first, single clear CTA above the fold.
- Rich **OG/Twitter meta tags** + branch-wise `LocalBusiness` JSON-LD schema for every branch page (helps Google too).
- Instagram/Facebook profile links in header/footer (owner's accounts — TODO: handles).
- A small `/links` page (link-in-bio style) for the Instagram bio: Order prints / Franchise / Locations / WhatsApp.

---

## 8. Data Model (Supabase Postgres)

```
branches(id, name, brand_name, address, phone, lat, lng, upi_id, upi_qr_url, notify_email, is_active)
profiles(id → auth.users, name, phone, role[customer|staff|admin], default_prefs jsonb)
allowed_staff_emails(email, role, branch_ids[])
staff_branches(profile_id, branch_id)
addresses(id, profile_id, label, line1, line2, city, pincode, lat, lng)
orders(id, order_no, token, customer_profile_id nullable, guest_name, guest_phone, guest_email,
       branch_id, status, delivery_type[pickup|delivery], address jsonb, distance_km,
       delivery_fee_rule[free|cod_actuals], subtotal, total, payment_mode, payment_status,
       razorpay_order_id, utr_reference, utm jsonb, created_at, ...)
order_items(id, order_id, file_path, file_name, page_count, page_count_source[parsed|customer|staff],
            prefs jsonb, line_total)
order_events(id, order_id, status, note, actor, created_at)   -- full audit trail
deliveries(id, order_id, vendor, tracking_id, courier_fee, booked_at, delivered_at)
rate_card(id, key, label, rate, unit, is_active)               -- admin-editable
invoices(id, order_id, invoice_no, pdf_path, issued_at)
franchise_leads(id, name, phone, email, city, budget, has_space, message, utm jsonb, status[new|contacted|closed], created_at)
franchise_assumptions(key, value)                              -- calculator defaults
daily_reports(id, branch_id, date, billed_total, received_total, orders_count, json_detail)
```
Row Level Security ON everywhere: customers read only their own orders (or via order token); staff read/write their branch's orders; admin all.

---

## 9. Pages / Routes

```
/                     Home: hero, services, "Order prints now" CTA, branch map, franchise teaser, testimonials
/order                Print order wizard (upload → prefs → preview → branch → delivery → pay)
/order/[token]        Order status tracker (public via token)
/branches             All branches with map, hours, phone, directions
/franchise            Franchise landing (§6)
/account              Customer: profile, addresses, saved prefs, order history, invoices
/login                Auth (Google + email OTP)
/admin                Staff: live order queue (branch-scoped)
/admin/orders/[id]    Order detail: job ticket, payment verify, delivery booking panel
/admin/reports        Daily/weekly/monthly reports + CSV export
/admin/settings       Admins only: rate card, branches, staff emails, franchise assumptions, payment mode
/links                Link-in-bio page
/legal/terms, /legal/privacy, /legal/refunds   (required for Razorpay KYC approval)
```

---

## 10. Build Phases (implement in this order)

1. **Phase 1 — Core ordering:** Next.js scaffold, Supabase setup (schema + RLS), upload + prefs + price calc + pdf.js preview, branch select, manual UPI payment, order emails, basic admin queue. *Ship this first — it's the money-maker.*
2. **Phase 2 — Payments & delivery:** Razorpay integration + webhook, invoices, delivery distance logic + assisted booking panel, status tracker page.
3. **Phase 3 — Reports & franchise:** daily reports + cron email, franchise page + ROI calculator + leads.
4. **Phase 4 — Growth:** Meta Pixel + UTM capture, SEO/JSON-LD, /links page, polish.

Definition of done per phase: works on mobile (primary device for customers AND staff), Lighthouse mobile ≥ 85, all flows tested with `PAYMENT_MODE=manual`.

---

## 11. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
PAYMENT_MODE=manual              # switch to "razorpay" when KYC approved
RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET
RESEND_API_KEY
ADMIN_EMAILS=tanmay.bhanushali@photonlegal.com   # TODO: add owner emails
NEXT_PUBLIC_META_PIXEL_ID
GST_ENABLED=false / GST_NUMBER=
NEXT_PUBLIC_SITE_URL
```

---

## 12. Free-Tier Guardrails

- Supabase storage cleanup cron: delete order files 7 days after `COMPLETED`/`CANCELLED` (keep invoices; they're small).
- 25 MB/file, 100 MB/order upload caps with clear error messages.
- Nominatim: throttle 1 req/s, cache geocodes in DB, custom User-Agent `virat-enterprises-website`.
- Resend 100/day cap: batch staff notifications (1 email per order, not per file); if quota exceeded, orders still work — dashboard is source of truth.
- Vercel Hobby: max 2 cron jobs (use: 1 = daily report, 2 = file cleanup). No Edge Middleware heavy work.
- No paid SMS/WhatsApp APIs: use `wa.me` click-to-chat links only.

---

## 13. Section for Claude Design — Website Prototype Brief

> **This section instructs Claude (design mode) to produce a clean, working visual prototype of the website before/alongside development.**

**Brand feel:** Trustworthy neighborhood print shop gone digital. Clean, high-contrast, fast. Primary color: deep blue `#1B3A6B`; accent: energetic orange `#F5821F` (print-shop energy); background near-white `#FAFAF8`; text `#1A1A1A`. Font: Inter or Plus Jakarta Sans. Rounded-lg cards, generous whitespace, subtle shadows. The tagline "Naam hi Kaafi hai" appears in the hero. Mobile-first (most customers arrive from Instagram/Facebook on phones).

**Prototype scope (working HTML/React prototype, single artifact per screen or one multi-screen app):**
1. **Home page** — hero with "Upload. Print. Delivered." message, order CTA, 6-branch strip, services grid, franchise banner.
2. **Order wizard** — the full 5-step flow with working state: file dropzone (fake file ok), preference chips with live price ticker, mock print preview (page thumbnails that respond to B/W-color and N-up settings), branch picker cards, delivery form showing the free-delivery rule callout ("FREE delivery within 3 km on orders above ₹500"), payment screen with QR placeholder.
3. **Staff dashboard** — order queue cards with status pills, one expanded order showing job ticket + "Book delivery" panel with copy buttons and Uber/Rapido deep-link buttons.
4. **Daily report screen** — billed vs received bar comparison, orders table, date picker.
5. **Franchise page** — hero, 3 investment-tier cards (₹10L/₹20L/₹30L, "includes ₹2L franchise fee"), 7-step timeline, **working ROI calculator** (sliders → payback months, net profit/mo, 3-yr chart), lead form.

Interactions must actually work in the prototype (state changes, calculator math, price ticker). Use placeholder images/QRs. Keep every screen printable-clean — no decorative clutter. All INR formatting as `₹1,00,000` (Indian digit grouping).

---

## 14. Open TODOs for the Owner (Tanmay / Virat team)

1. Full addresses + phone numbers + Google Maps pins for the 5 remaining branches, and the 6th branch name.
2. Confirm brand naming on the site: unify under "Virat Enterprises" with "MM Digital" as a branch label?
3. Real rate card (replace placeholder prices in §4.6).
4. Razorpay account: complete KYC (needs PAN, bank account, business proof). Until then run `PAYMENT_MODE=manual`.
5. UPI ID + QR image per branch (or one central UPI).
6. Staff email IDs for the allowlist + branch notification emails.
7. Franchise numbers: confirm business model wording (FOFO?), margin %, payback period from the ROI sheet, shop fit-out days, monthly sale defaults.
8. Logo files (SVG/PNG), shop photos, sample shop-layout designs for the franchise gallery.
9. Meta Pixel ID from Facebook Business Manager; Instagram/Facebook handles.
10. GST registered? If yes, GSTIN for invoices.
11. Legal: terms, privacy, refund policy text (drafts can be generated, owner must review).
