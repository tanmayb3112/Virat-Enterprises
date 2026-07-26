# Facebook/Instagram Ads — Step-by-Step (minimum budget)

Two separate campaigns, run from one Meta Business account:
**A) Print jobs** (local customers) and **B) Franchise leads** (investors).

> Honest note on automation: Meta has no free API/automation path Claude can
> drive for you — campaign setup is clicks in Ads Manager (below, exact
> clicks). What IS automated already: the website fires Pixel events
> (PageView / ViewContent / Lead / Purchase with order value) and stores UTM
> tags on every lead & order, so your Ads Manager shows real conversions and
> the admin dashboard shows which ad each order came from.

---

## Part 0 — One-time setup (~30 min, free)

1. **Facebook Page**: facebook.com/pages/create → "Virat Enterprises" →
   category *Printing Service*. Add the yellow/black logo, cover photo of a
   shop, WhatsApp number, website link.
2. **Instagram**: create @viratenterprises (or your handle), switch to
   Business account, link to the Page. Put `<your-site>/links` in the bio.
3. **Meta Business Manager**: business.facebook.com → Create account → add
   the Page + Instagram.
4. **Ad account**: Business Settings → Ad accounts → Add → currency INR,
   payment method (UPI/card). No spend until a campaign is live.
5. **Meta Pixel**: Business Settings → Data sources → Datasets → Add →
   name "Virat Website". Copy the **Dataset/Pixel ID** (15-16 digits).
   → Give this ID to Claude / put it in Vercel env
   `NEXT_PUBLIC_META_PIXEL_ID` and redeploy. Done — the site already fires
   PageView, ViewContent (franchise), Lead (franchise form) and Purchase
   (order value) events.
6. Verify: install "Meta Pixel Helper" Chrome extension → open your site →
   it should show PageView firing.
7. **WhatsApp**: connect your WhatsApp Business number to the Page
   (Page settings → WhatsApp). Lets ads open straight into WhatsApp chat.

## Part A — Print-jobs campaign (₹100–200/day)

Goal: orders + WhatsApp messages from people within ~2 km of each branch.

1. Ads Manager → **Create** → Objective: **Engagement → Messaging apps →
   WhatsApp** (cheapest local action) — or **Sales → Website** with the
   Purchase event once order volume grows.
2. Campaign name: `print-jobs-pune`. Advantage+ budget OFF (manual control).
3. **Ad set** (start with ONE, covering your 2 busiest branches):
   - Budget: **₹150/day**.
   - Location: *Pin drop* on Mukund Nagar shop + radius **2 km**; add a
     second pin on ABC Chowk + 2 km. (Ads Manager → Locations → drop pin.)
   - Age 18–45, all genders. Detailed targeting: leave broad (small radius
     beats interest targeting for local).
   - Placements: Advantage+ (auto) — Meta finds cheap Instagram Reels slots.
4. **Ad creative** (make 2, Meta rotates the winner):
   - Creative 1 (students): photo/reel of a spiral-bound stack. Text:
     *"Assignments से थीसिस तक — ₹2/side B/W. Upload online, ready in hours.
     FREE delivery within 3 km on ₹500+."* CTA button: **Send WhatsApp message**.
   - Creative 2 (offices): job ticket + neat files photo. Text: *"Bulk
     printing for offices & classes — monthly account, daily pickup, one
     invoice. 6 shops across Pune."*
   - Yellow/black brand colours; big price; the website URL with UTM:
     `https://<your-site>/order?utm_source=facebook&utm_medium=cpc&utm_campaign=print-jobs-pune`
5. Publish. Meta reviews in ~24h.
6. **Daily check (2 min):** Cost per messaging conversation ≤ ₹30 → good.
   After 5–7 days, duplicate the ad set for the other 4 branch pins, kill the
   weaker creative, keep budget ≤ ₹200/day until orders prove out.

## Part B — Franchise campaign (₹150–300/day, 2-week bursts)

Goal: qualified leads into the /franchise form (already fires the Lead event).

1. Create → Objective: **Leads → Website** (conversion event: **Lead**).
   Using the website form (not Instant Forms) filters for serious prospects —
   they see the ROI calculator before submitting.
2. Campaign name: `franchise-leads-mh`.
3. **Ad set**:
   - Budget **₹200/day**, schedule a 14-day burst.
   - Location: Maharashtra (or Pune +50 km to start).
   - Age 28–55. Detailed targeting: *Small business owners*, *Investment*,
     *Franchising*, *Entrepreneurship* (any match).
   - Placement: Advantage+.
4. **Creative**:
   - Image/reel: shop front (yellow/black board) or the 3-tier card graphic.
   - Text: *"Own a Virat Enterprises print franchise — from ₹10 lakh
     (includes ₹2 lakh fee). 6 shops running in Pune. Online orders routed
     to your counter. Calculate your ROI in 30 seconds."*
   - CTA: **Learn more** →
     `https://<your-site>/franchise?utm_source=facebook&utm_medium=cpc&utm_campaign=franchise-leads-mh`
5. Publish, review after 3 days: cost per Lead ≤ ₹500 is healthy for this
   ticket size. Every lead also lands in your `franchise_leads` table + email.

## Budget summary

| Campaign | Daily | Monthly (~) | Kill/scale rule |
|----------|-------|-------------|-----------------|
| Print jobs | ₹150 | ₹4,500 | scale the branch pins that hit ≤₹30/conversation |
| Franchise | ₹200 (14-day bursts) | ₹2,800/burst | pause if >₹800/lead after 5 days |

Total minimum: **≈ ₹7,300/month** while testing. Start with Part A only if
budget is tight — it pays back fastest.

## What to send Claude when ready

1. The **Pixel ID** → wired into the site env in one minute.
2. Ad creative requests — Claude can generate the ad copy variants and
   image-layout specs (yellow/black) for your designer or Canva.
