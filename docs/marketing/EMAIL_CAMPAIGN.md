# B2B Email Campaign — Templates & Sending Plan

Audience: the prospect database (`pune_prospects.csv` — compiled from publicly
listed business contacts, source URL recorded per row). One-to-one style
emails, 20–30/day from the shop's Gmail/Google Workspace address. Reply-based
— the goal is a WhatsApp conversation or a shop visit, not a click.

Rules baked into every template: name the recipient's business, say why THEM
(their category), one concrete price hook, one CTA, plain-text look (no heavy
HTML), and an opt-out line.

---

## Sequence 1 — Coaching classes / academies (highest priority)

**Email 1 (day 0) — subject:** `Test-paper printing for {{ClassName}} — fixed per-set rate`

> Namaste {{Owner/Admin}} ji,
>
> I run **Virat Enterprises** — 6 printing & xerox shops across Pune (Mukund
> Nagar, ABC Chowk, JM Road, Satara Road, Corporation, Shanti Nagar). We
> print for several coaching classes and I believe {{ClassName}} could save
> meaningfully on weekly test papers and notes.
>
> What we offer classes like yours:
> • B/W from **₹2/side** — **₹1.50/side** on 100+ sides (most test sets qualify)
> • Spiral binding ₹40 · same-day turnaround for morning batches
> • **Fixed monthly contract** with a daily pickup/delivery slot — one invoice
> • Upload PDFs online, we deliver — free within 3 km on ₹500+
>
> Can I drop off a rate card this week, or share a quote on WhatsApp?
> 📞 +91 98231 41366 (call/WhatsApp) · {{SiteURL}}/order
>
> — {{YourName}}, Virat Enterprises · "Naam hi Kaafi hai"
> (If you'd rather not hear from us, just reply "no thanks".)

**Email 2 (day 4, if no reply) — subject:** `Re: printing for {{ClassName}}`
> Quick follow-up — happy to print one week's test papers **free as a trial**
> so you can check quality and timing. Shall I send the details on WhatsApp?

**Email 3 (day 10, final) — subject:** `Closing the file for now`
> I won't keep nudging — if bulk printing ever becomes a headache (exam
> season!), we're 10 minutes away and pick up daily. Saving our number helps:
> +91 98231 41366. All the best with the batch!

## Sequence 2 — Law firms / CA firms / offices

**Email 1 — subject:** `Bulk printing account for {{FirmName}} — pickup twice daily`

> Dear {{Name}},
>
> Virat Enterprises runs 6 print shops across Pune. For firms like
> {{FirmName}} we run **monthly printing accounts**: your team emails or
> uploads files, we print (case files, agreements, audit sets, spiral-bound
> reports), and our runner delivers to your office — twice-daily slots,
> single monthly invoice, 7-day credit.
>
> B/W from ₹2/side (₹1.50 bulk) · colour ₹10 · hard binding ₹150 ·
> scanning & lamination at the counter.
>
> Could we set up a small trial run this week? Reply here or WhatsApp
> +91 98231 41366.
>
> — {{YourName}}, Virat Enterprises
> (Reply "no thanks" to opt out — no further emails.)

**Email 2 (day 5):** offer to match their current per-page rate + free trial delivery.

## Sequence 3 — Architects / engineering consultancies

**Subject:** `CAD & large-format plots near {{Area}} — same-day`
> Large-format/CAD plots, lamination and binding, 6 locations in Pune with
> pickup & delivery. Trial plot free. WhatsApp a drawing to +91 98231 41366
> for an instant quote.

## Franchise outreach (separate identity — do NOT mix with services emails)

**Subject:** `Print-shop franchise in {{City/Area}} — from ₹10 lakh, 6 shops already running`
> {{Name}} ji, we're expanding Virat Enterprises (6 profitable print shops in
> Pune, ~₹1,00,000 monthly revenue per shop) via FOFO franchise — total
> investment from ₹10 lakh including the ₹2 lakh franchise fee. The
> franchisee gets brand, fit-out design, machinery guidance, training, supply
> chain, and online orders from our website routed to their counter.
> ROI calculator: {{SiteURL}}/franchise
> Open to a 15-minute call this week?

---

## Sending — free-tier plan

**Phase 1 (now): Gmail manually, 20–30/day.**
- Drafts for each sequence are pre-created in the shop Gmail (Claude can
  generate these as drafts via the connected Gmail account — personalize the
  {{placeholders}} per prospect before sending).
- Track in the CSV: add columns `emailed_on`, `template`, `reply`.
- Follow-ups matter more than volume: 40% of replies come from email 2–3.

**Phase 2 (when >50/day): Resend free tier (100/day)** on a proper domain
(e.g. mail.viratenterprises.in) with SPF+DKIM — Claude wires this into the
codebase when the domain exists. Never blast from the personal Gmail.

**Metrics that matter:** reply rate ≥3%, meeting/WhatsApp conversations ≥1
per 25 sends. If below, tighten the segment before increasing volume.
