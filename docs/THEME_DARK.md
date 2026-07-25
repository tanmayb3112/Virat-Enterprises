# Virat Enterprises — Dark "Xerox" Theme Spec (yellow & black)

Owner-requested rebrand: **black background, yellow + white text** — the classic
xerox-shop colour language. This file is the single source of truth for the
palette swap. Every hex below maps old → new; apply contextually (not blind
find/replace) and obey the contrast rules.

## Core mapping

| Role | OLD | NEW |
|------|-----|-----|
| Page background | `#FAFAF8` | `#121210` |
| Surface / cards / inputs bg | `#FFFFFF` / `#fff` (as background) | `#1C1C18` |
| Subtle alt surface (steppers etc.) | `#F5F3EC` | `#26261F` |
| Primary text (ink) | `#1A1A1A` (as text) | `#F2F0E9` |
| Body text | `#55524A` | `#C9C6BC` |
| Label text | `#8A8578` | `#9A968A` |
| Hint text | `#B0AB9F` | `#6E6B62` |
| Hairline | `#E7E4DC` | `#2E2E29` |
| Row rule | `#F0EDE5` | `#26261F` |
| Input border | `#D8D2C4` | `#3E3E36` |
| Upcoming-step text | `#C9C4B8` | `#57544B` |
| Outlined-button border | `#C9C4B8` | `#57544B` (hover → `#F2F0E9`) |
| **Accent (was orange CTA)** | `#F5821F` | **`#FFC400`** |
| Accent hover | `#E0741A` | `#E6B000` |
| **Structural (was blue)** | `#1B3A6B` | **`#FFC400`** |
| Structural hover | `#142C51` | `#E6B000` |
| Green (positive) | `#1F6B3E` | `#6FCF8E` |
| Red (negative) | `#B23B3B` | `#F08A8A` |
| Amber (warning) | `#8A5A22` | `#E8B25C` |
| Footer bg | `#141414` | `#000000` |
| Footer links | `#C9C4B8` | `#B9B6AC` |
| Map placeholder bg | `#EDEBE3` | `#23231E` |
| Map gridlines | `#ffffff8a` | `#ffffff12` |
| Dropzone dashed border | `#B8B2A4` | `#55524A` |
| Disabled button bg/text | `#EFEEE9` / `#B0AB9F` | `#26261F` / `#6E6B62` |
| Selection bg | `#F5821F2e` | `#FFC4002e` |

## CRITICAL contrast rules

1. **Text on yellow is always near-black `#111`.** Every place that had white
   text on a blue or orange background (`background:#1B3A6B` or `#F5821F` with
   `color:#fff`) becomes `background:#FFC400; color:#111`. Buttons, selected
   chips, pills, pins — no exceptions.
2. Selected chips: bg `#FFC400`, text `#111`, border `#FFC400`. Idle chips:
   bg `#1C1C18`, text `#F2F0E9`, border `#3E3E36`.
3. Links: base `#FFC400`, hover `#FFFFFF` (flip of the old blue→orange).
4. Yellow used AS TEXT on dark surfaces (amounts, mono order numbers, links,
   totals) is fine — keep it `#FFC400`.

## Solid bands (home franchise band, franchise ROI band)

Backgrounds that were solid blue `#1B3A6B` blocks become **solid yellow
`#FFC400` with black content** — the boldest xerox statement on the site:
- Headline & kicker text on band: `#111`
- Sub/secondary text on band (was `#B7C5DB`): `#4A3E00`
- Buttons on band: bg `#111`, text `#FFC400` (hover bg `#000`)
- Tier chips on ROI band: selected = bg `#111` text `#FFC400`; idle =
  transparent, border `#00000066`, text `#111`
- Translucent white borders `#ffffff3d` on band → `#00000042`
- Chart: bars that reached investment = `#111`; not yet = `#00000040`;
  dashed investment line `#111`; slider `accent-color:#111`; value labels `#111`
- Result-grid payback number (was orange): `#111`, keep 34px/800

## Deliberate exceptions (do NOT dark-theme these)

- **Job ticket** in /admin: it represents a physical A5 paper slip. Keep it
  light (`#FCFCFA` bg, dark mono text, dashed `#B9BEC7` border) — it reads as
  paper against the dark UI and stays print-accurate.
- **QR placeholder** block in the order wizard: QR codes must stay
  light/scannable — keep the white inset and conic pattern.
- Print stylesheets / CSV exports: unaffected.

## Status pills (admin + reports) — dark variants

| Status | text | bg |
|--------|------|----|
| Received | `#9DC1F0` | `#1C2836` |
| Payment pending | `#E8B25C` | `#33270E` |
| Paid | `#7ED09A` | `#152B1C` |
| Printing | `#C4B1F5` | `#241D38` |
| Ready | `#8FD0E8` | `#132831` |
| Out for delivery | `#F5C173` | `#33240D` |
| Completed | `#B9B6AC` | `#26261F` |
| Cancelled | `#F09A9A` | `#331717` |

## File-badge outline colours (PDF/JPG/DOC)

PDF `#F08A8A`, image `#6FCF8E`, office `#FFC400` — outlined on dark surface.

## Tinted light boxes → dark equivalents

`#EDF2FA→#1C2836`, `#EAF3EC→#152B1C`, `#FBF0E2→#33270E`, `#EFEAFB→#241D38`,
`#E8F2F7→#132831`, `#FAEDED→#331717`, `#EFEEE9→#26261F`.

## Reports specifics

- Bar tracks `#F0EDE5` → `#26261F`; billed bar `#1B3A6B` → `#FFC400`;
  received bar `#F5821F` → `#FFFFFF` (white — the pair must stay
  distinguishable; legend swatches update to match: Billed = yellow,
  Received = white).
- Secondary service bars `#9DAFC9` → `#6E6B62`; first bar `#FFC400`.
- Table header underline `#1A1A1A` → `#F2F0E9`.

## Header / global

- Sticky header bg `#FAFAF8` → `#121210`, hairline per table.
- Brand wordmark + nav active text `#F2F0E9`; nav idle `#9A968A`, hover
  `#F2F0E9`; active underline `#FFC400`.
- "Order now" header button: bg `#FFC400`, text `#111`.
- Logo note: the wordmark stays text-only for now — owner will supply the
  shop-board logo image; leave a `{/* LOGO: replace with owner image */}`
  comment at the brand element.
