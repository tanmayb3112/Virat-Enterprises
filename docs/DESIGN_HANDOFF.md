# Handoff: Virat Enterprises Website

## Overview
Design reference for the Virat Enterprises website — a print-ordering platform + franchise lead generator for a 6-branch printing/xerox business in Pune. Covers the 5 screens specified in §13 of `VIRAT_WEBSITE_SPEC.md` (bundled): Home, Order wizard, Staff dashboard, Daily report, Franchise landing. The full build spec (tech stack, data model, routes, phases) is in that file — **implement against it**; this handoff documents the visual design layered on top.

## About the Design Files
The files in this bundle are **design references created in HTML** — working prototypes showing intended look and behavior, not production code to copy directly. The task is to **recreate these designs in the target stack from the spec: Next.js 14+ (App Router) on Vercel, Supabase, Tailwind or CSS of your choice**. `Virat Enterprises Prototype v2.dc.html` is the authoritative design; ignore `v1` (superseded mobile-card exploration). The prototype is a single-file component with an internal screen switcher (top-nav tabs) standing in for the real routes `/`, `/order`, `/admin`, `/admin/reports`, `/franchise`.

## Fidelity
**High-fidelity.** Colors, type, spacing, and interaction states are final intent — recreate pixel-perfectly using the codebase's patterns. Two things are placeholders only: map boxes (implement with Leaflet + OpenStreetMap per spec) and the UPI QR (real per-branch QR image from the `branches` table).

## Design Language (applies everywhere)
- Minimal, typography-led, flat. Hairline rules instead of card shadows. No gradients, no emoji.
- Background `#FAFAF8`; surfaces `#FFFFFF`; ink `#1A1A1A`.
- Structural/brand color: deep blue `#1B3A6B` (hover `#142C51`). Orange `#F5821F` (hover `#E0741A`) is reserved for ONE primary CTA per screen plus small accents (section-number digits, active tick).
- Muted text `#55524A` (body) / `#8A8578` (labels) / `#B0AB9F` (hints). Hairlines `#E7E4DC`, lighter row rules `#F0EDE5`. Input borders `#D8D2C4`.
- Semantic: green `#1F6B3E`, red `#B23B3B`, amber `#8A5A22`.
- Fonts: **Plus Jakarta Sans** (400–800) for everything; **IBM Plex Mono** (400–600) for order numbers, amounts in tables, distances, step numerals, env label.
- Headlines: 800 weight, letter-spacing −0.025 to −0.035em. Section kickers: 11–12px, 700, letter-spacing 0.16–0.2em, uppercase, color `#8A8578`.
- Radii: 8px cards, 6px buttons/inputs/chips, 4px status pills. No larger.
- Accent pattern: 2px left border (blue = info, green = positive rule, orange = warning) + 14–16px left padding, instead of tinted boxes.
- Page container: max-width 1240px, 32px side padding. Header: 64px sticky, `#FAFAF8`, hairline bottom; active tab = 2px blue underline; right cluster holds env label (mono, truncates first), WhatsApp link, blue "Order now" button.
- INR formatting everywhere: Indian digit grouping (`₹1,00,000`).

## Screens

### 1. Home (`/`)
- **Hero**: 2-col grid `1.35fr / minmax(300px,420px)`, gap 72px, padding 88px top. Left: kicker "PRINTING & XEROX · 6 SHOPS ACROSS PUNE", 72px H1 "Upload. Print. Delivered." (orange full stop), 17px sub, CTA row (orange "Order prints now" + outlined "Find a branch"), then a hairline-separated 3-stat strip (6 shops / ₹2 per side / 3 km free delivery). Right: white "RATE CARD" panel — hairline-ruled rows (A4 B/W ₹2, 100+ sides ₹1.50, A4 colour ₹10, A3 colour ₹20, spiral ₹40, hard ₹150), footer note.
- **Delivery-rule strip**: full-width white band, hairlines top/bottom: orange "FREE DELIVERY" + rule sentence.
- **Services**: 4×2 grid with shared 1px borders (border-left/top on container, right/bottom per cell), name + price; hover turns cell white.
- **How it works**: 3 columns, mono orange numerals 01–03.
- **Our shops**: 3×2 grid, 1px gap on `#E7E4DC` background; each cell: name + mono "2.4 KM", orange uppercase brand label, address, phone. Footnote: 5 addresses pending owner confirmation.
- **Franchise band**: solid `#1B3A6B` block, orange kicker, 34px white headline "Own a Virat shop in your area — from ₹10 lakh.", white button "Calculate your ROI →".
- **Footer**: `#141414`, 4 columns (brand blurb / Order / Business / Legal links).

### 2. Order wizard (`/order`)
- **Header row**: kicker "NEW ORDER", 38px step title; right: 5-step rail — mono numerals 01–05 + labels (Files, Options, Preview, Branch, Pay). Current step: orange numeral, dark label; done: dark; upcoming: `#C9C4B8`. "Start over" link.
- **Body**: grid `1fr / 340px`, gap 56px. Right column is a **sticky (top 88px) order summary card**: "ORDER SUMMARY" header, per-file bill lines (`file — N sides × ₹rate`), binding/lamination/delivery lines, Total (26px, blue), caption ("X sheets · Y files · updates live"), full-width orange continue button (disabled = `#EFEEE9`/`#B0AB9F` until step valid), "← Back" link, footer rule note.
- **Step 1 Files**: dashed dropzone (`#B8B2A4`, hover orange); file rows separated by hairlines: 40px extension badge (outlined, PDF red/JPG green/DOC blue), name, meta ("24 pages · parsed by pdf.js"), Remove link. Office files show inline amber page-count prompt (number input + "shop will verify" note). Continue gated on all files having page counts.
- **Step 2 Options**: file-selector chips; 2-col grid of option groups (kicker label + chip row): Paper size (A4/A3/A5/Legal/Letter), Colour, Sides, Orientation, Copies stepper (− / count / +). Chips: 6px radius, selected = solid blue/white, idle = white with `#D8D2C4` border. "+ More options" underlined toggle reveals GSM (70/80/100 +₹1/Glossy +₹15), N-up (1/2/4), page range input, notes input. "WHOLE ORDER" section: Binding (None/Staple free/Spiral ₹40/Hard ₹150), Lamination (None / Per page ₹20).
- **Step 3 Preview**: settings summary line (blue left-border accent); thumbnail grid `auto-fill minmax(150px,1fr)`. Thumbs: fake page content, `filter:grayscale(1)` when B/W, height 190px portrait / 110px landscape, N-up splits cell grid, back sides get dashed border + "· back" label. Note explains pdf.js rendering.
- **Step 4 Branch**: flat map placeholder (grid-lines on `#EDEBE3`, numbered circular pins, selected pin orange) → Leaflet in production; 2-col branch cards (selected = blue border + 1px ring), name, mono distance, brand, address, hours · phone. Nearest pre-selected.
- **Step 5 Delivery & payment**: Home delivery / Pickup chips. Delivery: 2-col — address inputs + distance readout + slider (prototype stand-in for geocoding) | map-pin placeholder + rule callout (green left-border "FREE delivery" when ≤3km AND >₹500, else amber "Delivery charges at actuals… COD courier"). Pickup: blue left-border block with branch address + "Pickup is free". Below, 2-col: **PAY BY UPI** (manual mode: QR + UPI ID mono + "Open UPI app" outlined button + UTR input, note re pending verification) or **PAY SECURELY** (razorpay mode: Razorpay copy + method tags) | **YOUR DETAILS** (name, mobile — guest checkout note). Continue gated on UTR (≥6 chars, manual mode) + name + phone.
- **Confirmation**: green kicker "ORDER PLACED", 40px title ("Payment reference received." / "Payment successful."), order-number card (mono `VE-MUK-202607-0143` + total), vertical status tracker (green done dots), buttons to dashboard / new order.

### 3. Staff dashboard (`/admin`)
- Header: kicker, 34px branch name, "Live queue · Realtime on · email"; filter chips (All open / To verify / To print / To dispatch).
- Grid `minmax(280px,340px) / minmax(0,1fr)`, gap 28px. **Queue list**: flat rows, hairline bottom, selected row = white bg + 2px blue left border; mono order no + status pill, name + total, file summary, delivery · age.
- Status pills (10.5px, 800, 4px radius): Received blue on `#EDF2FA`; Payment pending `#8A5A22` on `#FBF0E2`; Paid green on `#EAF3EC`; Printing `#5B3FA8` on `#EFEAFB`; Ready `#1B6584` on `#E8F2F7`; Out for delivery `#B4610F` on `#FBF0E2`; Completed grey; Cancelled red on `#FAEDED`.
- **Detail card**: header (mono no, contact, pill, "Verify payment" green button when pending, blue "Advance → next status", outlined red Cancel). Body grid `auto-fit minmax(272px,1fr)`:
  - **Job ticket**: `#FCFCFA`, dashed `#B9BEC7` border, all IBM Plex Mono — A5 print slip with dotted dividers per file, finishing/handover/payment, TOTAL, brand footer line, "Print ticket" button (window.print → print stylesheet in production).
  - **Right column**: FILES rows (badge, name, spec, line total, Download signed-URL link); office-file reprice block (orange left border, number input + "Reprice & notify customer"); **BOOK DELIVERY**: rule callout (green "FREE delivery — Virat pays the courier" / amber "COD courier — customer pays the partner"), PICKUP & DROP address cards with Copy buttons ("Copied ✓" feedback), black "Open Uber parcel ↗" (m.uber.com universal link with lat/lng) + outlined "Open Rapido ↗", vendor chips (Uber/Rapido/Other) + tracking ID + courier fee inputs, orange "Mark out for delivery", green-outlined "Mark delivered".
  - **Audit trail** footer: mono time / status / note rows.

### 4. Daily report (`/admin/reports`)
- Header: kicker, 34px "Billed vs received", subline; date input + Day/Week/Month chips + blue "Export CSV" (working CSV download in prototype).
- **Metric strip**: 6 equal cells in one bordered card: Orders, Billed, Received (green), Gap (red), Delivery fees, Cancelled.
- **Per branch** (left, 1.4fr): legend (blue Billed / orange Received); per branch, two 12px horizontal bars on `#F0EDE5` track + mono amounts + right-aligned "matched" (green) or "gap ₹x" (red).
- **Top services** (right): label + mono amount + 8px bar (first blue `#1B3A6B`, rest `#9DAFC9`). Below: "MISMATCHES TO CHASE" — red left-border items.
- **Orders table**: overflow-x scroller, min-width 1020px, grid `64px 190px 140px minmax(220px,1fr) 90px 90px 180px` (TIME/ORDER/BRANCH/JOB/BILLED/RECEIVED/STATUS); mono for time/order/amounts; missing received = red "—"; header row has 1px `#1A1A1A` bottom rule.

### 5. Franchise (`/franchise`)
- **Hero**: kicker "FRANCHISE · FOFO MODEL · PUNE & BEYOND", 64px H1 "Own a Virat Enterprises franchise." (orange stop), sub, orange "Calculate your ROI" + outlined "Submit interest" (anchor scrolls), 4-stat hairline strip (6 shops / ₹1,00,000 avg monthly / ₹10,000 daily / ₹10 lakh min).
- **About** (white band): 2-col — "Naam hi Kaafi hai" heading | paragraph, service tag chips, blue left-border FOFO explainer.
- **Investment**: "Starts from ₹10 lakh" + 3 tier cards (STARTER ₹10 lakh / GROWTH ₹20 lakh "MOST CHOSEN" / PREMIUM ₹30 lakh; each "Includes ₹2 lakh franchise fee", bullet list, button "Use in ROI calculator" → selects tier; selected card = blue border ring + solid blue button).
- **Inclusions** (white band): 4×2 grid, hairline-top items (Brand & marketing, Shop layout design, Machinery guidance, Training, Supply chain, Online orders, Ongoing support, Legal documents) + orange left-border TODO note (fit-out X days, gallery pending).
- **7 steps**: single row `auto-fit minmax(150px,1fr)`, right hairline dividers, mono orange 01–07 + title + body.
- **ROI calculator**: full-width `#1B3A6B` band, 2-col. Left: tier chips (dark variant: selected orange fill, idle transparent + `#ffffff3d` border), 3 sliders (monthly sale 40k–400k step 5k default 100k; gross margin 15–60% default 30; net margin 5–45% default 20; `accent-color:#F5821F`), disclaimer. Right: bordered 2×2 result grid (gross/mo, net/mo, PAYBACK in orange 34px "N mo" spanning row); bar chart: 3 bars = cumulative net profit years 1–3 (year2 = y1 + 15% growth, year3 compounding), dashed horizontal investment line; bars orange once ≥ investment, else translucent white. Defaults from admin-editable `franchise_assumptions`.
- **Lead form** (white band): 2-col intro | form: 2×2 inputs (name, phone, email, city), budget chips (10L/20L/30L/Not sure), space chips (Yes/Not yet), textarea, orange "Request a call back". Validation: name required; Indian mobile `/^[6-9]\d{9}$/` on last 10 digits; inline red error. Success: green left-border thank-you + WhatsApp button. Note: fire Meta Pixel `Lead`, store UTM.
- **FAQ**: 2-col — heading | hairline accordion rows, orange "+" rotates 45° when open, one open at a time.

## Interactions & State
- Screen switching = routes in production; wizard state: `files[] {id,name,ext,kind,pages,prefs{size,color,sides,orient,gsm,nup,copies,range,notes}}`, `activeId`, `step`, order-level `binding`/`lamination`, `branchId`, `deliveryType`, `addr`, `distance`, `utr`, customer name/phone, `placed`.
- **Pricing** (mirror exactly): sidesPerCopy = ceil(pages/nup); totalSides = sidesPerCopy×copies; sheets = ceil(sidesPerCopy/(double?2:1))×copies; rate: A3 → colour ₹20 / B&W ₹5; A4-class → colour ₹10 / B&W (totalSides≥100 ? ₹1.5 : ₹2); surcharge per sheet: 100gsm +₹1, glossy +₹15; binding spiral ₹40/hard ₹150/staple free; lamination sheets×₹20; minimum order ₹20 top-up; optional GST 18%.
- Free delivery: `distance ≤ 3 km AND total > ₹500` (both admin-configurable).
- Staff: status flow RECEIVED → PAYMENT_PENDING_VERIFICATION → PAID → PRINTING → READY → OUT_FOR_DELIVERY → COMPLETED (+ CANCELLED); verify/advance/cancel/mark-out/mark-delivered mutate status; clipboard copy with 1.6s "Copied ✓" feedback.
- ROI: gross = sale×g%; net = sale×n%; payback = ceil(investment/net) months.
- Transitions are instant (no animation) except FAQ icon rotate 0.18s.

## Config flags (prototype tweaks → env/DB in production)
`paymentMode` (`manual`|`razorpay` — switches step-5 payment panel and confirmation copy; spec env `PAYMENT_MODE`), `gstEnabled`, `freeDeliveryMinOrder` (₹500), `freeDeliveryRadiusKm` (3), `defaultMonthlySale` (₹1,00,000).

## Assets
No image assets. Fonts from Google Fonts (Plus Jakarta Sans, IBM Plex Mono). Map + QR are placeholders (see Fidelity). Logo pending from owner (spec §14).

## Files
- `Virat Enterprises Prototype v2.dc.html` — authoritative design (all 5 screens; open directly in a browser)
- `Virat Enterprises Prototype.dc.html` — v1, superseded; ignore except for reference
- `VIRAT_WEBSITE_SPEC.md` — full product/engineering spec (build against this)
- `support.js` — prototype runtime; required only to open the HTML files, irrelevant to implementation
