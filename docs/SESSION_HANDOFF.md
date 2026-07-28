# SESSION HANDOFF — Virat Enterprises website (read this first)

_Last updated: 28 Jul 2026. Written by the Claude session that built the site, for its successor._

## What this is
Print-ordering platform + franchise lead generator for Virat Enterprises (6 xerox shops, Pune).
Owner: Tanmay (GitHub `tanmayb3112`, admin email `tanmay.bhanushali@photonlegal.com`).
Spec: `VIRAT_WEBSITE_SPEC.md` (root). Design theme: `docs/THEME_DARK.md` (black/yellow xerox scheme).

## Live deployment
- **URL: https://virat-enterprises-cfq5.vercel.app** (Vercel project `virat-enterprises-cfq5`, owner's account; a duplicate broken project was deleted).
- **Production deploys from `main`.** Workflow used throughout: push to branch `claude/website-launch-m1ze7t` → open PR → squash-merge to main → auto-deploy (~2 min). After each merge, reset the branch: `git fetch origin main && git checkout -B claude/website-launch-m1ze7t origin/main && git push --force-with-lease -u origin claude/website-launch-m1ze7t`.
- GitHub pushes work via the git proxy; PRs/merges via the GitHub MCP tools (mcp__github__*). PRs #1–#7 all merged.

## Stack & architecture
Next.js 14 App Router + TS + Tailwind (but styling is INLINE styles per design handoff), Supabase (DB/auth/storage), Vercel. Everything **degrades gracefully**: with no env keys the site runs in "demo mode" (WhatsApp order handoff + manual UPI). `lib/config.ts` → `hasSupabase` drives demo/live. Pricing engine `lib/pricing.ts` is the single source of truth (unit-tested informally; A4 B/W: ₹2/side single, ₹2/SHEET double; jumbo A2/A1/A0 flat per side 30/40/60 BW, 60/80/120 colour; binding spiral 40 / blackbook(hard) 150 / rexine 350; bulk 100+ charged units → ₹1.5; min order ₹20).

Key routes: `/` `/order` (5-step wizard, uploads files to Supabase Storage bucket `print-files/{token}/`), `/order/[token]` tracker, `/branches` (+photo slots awaiting owner images, specialty rate list), `/franchise` (ROI calc + leads), `/admin` (staff queue — **STILL DEMO MOCK DATA**), `/admin/reports` (mock), `/admin/settings` (live, persists via `/api/admin/settings`, writes need `ADMIN_PASSCODE` env), `/login` (Supabase email-OTP), `/account` (customer profile+addresses), `/links`, `/legal/*`. APIs: `/api/orders` (POST create + Resend email notify + returns branch WhatsApp; GET by token), `/api/leads`, `/api/me` (role from `allowed_staff_emails`), `/api/cron/cleanup` (7-day file purge, vercel.json cron).

Auth: passwordless email OTP. Roles from `allowed_staff_emails` table (seeded: photonlegal email = admin). Header hides Staff/Reports tabs unless logged-in staff/admin (`lib/auth.tsx` AuthProvider + `components/AdminGate.tsx`). DB schema+RLS+seeds+storage bucket+auth trigger: `supabase/schema.sql` (idempotent, re-runnable).

Brand: SVG sticker-style Devanagari lockup `components/Logo.tsx` (विराट yellow + एंटरप्राइजेस white on red outline, Baloo 2 font). Owner may supply real PNG → swap in Logo.tsx (one line). GSTIN 27AFRPM4220Q1ZT in footer/terms. GST 18% NOT added to bills (assumed inclusive; owner hasn't confirmed otherwise).

## UPDATE — 28 Jul 2026 (login 500)
The login-error-surfacing commit **is merged to main**; owner then saw
`Could not send the login email (code 500)`. A 500 out of `signInWithOtp` has two
possible causes and the Supabase **Auth logs** are the only way to tell them apart:
mailer failure ("Error sending magic link email") vs the signup DB trigger
("Database error saving new user" → re-run `supabase/schema.sql`).

Rather than depend on Supabase's SMTP, login codes are now **sent by the site
itself**: `POST /api/auth/send-code` mints the 6-digit code with the service-role
key (`admin.createUser` + `admin.generateLink`, neither of which sends mail) and
delivers it via Resend (`sendLoginCode` in `lib/notify.ts`). The browser still
calls `verifyOtp`, so sessions/roles/RLS are untouched. Requires
`SUPABASE_SERVICE_ROLE_KEY` + `RESEND_API_KEY`; without both the route answers
`{fallback:true}` and `/login` reverts to Supabase's mailer. Failures name their
stage (`create_user` = trigger broken, `generate_code`, `send_email`), so the
error text on the login page now identifies the cause by itself.
`GET /api/auth/send-code` reports which env vars are present (booleans only) —
use it to confirm a deploy picked up the keys.
**Diagnosis, settled:** creating a user by hand in Authentication → Users
succeeded (so the trigger is fine) and Invite user failed with `Error sending
invite email` (so the mailer is not). Gmail SMTP was the whole problem — don't
spend more time on it, Google throttles/blocks relaying from Supabase's IPs.

**Resend sandbox limit (live constraint):** the owner's Resend account is
registered to `tanmaybhanushali151@gmail.com`, and until a domain is verified
Resend 403s any other recipient (`You can only send testing emails to your own
email address`). So `tanmaybhanushali151@gmail.com` was granted admin in
`allowed_staff_emails` and is the working login; `tanmay.bhanushali@photonlegal.com`
cannot receive codes yet. **To fix properly: buy/verify a domain at
resend.com/domains, set `RESEND_FROM` to an address on it, redeploy.** Customer
logins are impossible until then (guest checkout is unaffected — the order wizard
takes guest name/phone/email, so ordering never required login).

## CURRENT STATE / IN-FLIGHT (most important)
Owner is mid-launch, connecting Supabase. Timeline of debugging:
1. Owner created Supabase project, ran schema.sql (possibly needs RE-RUN for auth trigger + latest seeds — told to re-run; unconfirmed).
2. `NEXT_PUBLIC_SUPABASE_URL` was wrong (dashboard URL instead of `https://<ref>.supabase.co`) → "Invalid path specified in request URL" on login → fix instructed (correct URL + redeploy); apparently done.
3. Next login attempt errored with `{}` — my login page hid the real error. **Just fixed** (login page now surfaces err.status + hints); commit pushed to the branch but **PR NOT YET OPENED/MERGED — do this first thing** (branch `claude/website-launch-m1ze7t`, 1 commit ahead of main: "Login: surface real error message when the auth mailer fails" + this handoff file).
4. Likely root cause of the `{}` error: **SMTP misconfiguration** — owner was guided to set up Gmail custom SMTP in Supabase (host smtp.gmail.com, port 465, username = their gmail `tanmaybhanushali151@gmail.com`, password = Google App Password) so they could edit the Magic Link email template to include `{{ .Token }}` (6-digit code). Diagnosis path: Supabase → Logs → Auth logs shows the SMTP error; or "send test email" on the SMTP form. Also check Authentication → URL Configuration → Site URL = the vercel URL.
5. Owner switched admin email to photonlegal (gmail removed from seed; gave them 2-line SQL to apply live — unconfirmed if run).

## Owner env vars in Vercel (their side; believed set, verify)
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY / ADMIN_PASSCODE / ADMIN_EMAILS / NEXT_PUBLIC_SITE_URL (+ optional RESEND_API_KEY, CRON_SECRET). NEXT_PUBLIC_* vars require a redeploy to take effect. `.env.example` documents all.

## NEXT BUILD TASKS (in priority order)
1. **Merge the pending branch commit** (login error fix + this file).
2. **Get owner's login working** (SMTP debug per above), verify: env:live header, login → admin sees Staff/Reports, test order → row in `orders`, file in Storage, tracker live, settings persist.
3. **BIG ONE: live staff dashboard** — replace `/admin` mock with real orders from Supabase (realtime subscription, signed-URL file downloads via service role API, status buttons persisting to DB + order_events, verify-payment flow, branch scoping by role/branchIds from /api/me). Same for `/admin/reports` (aggregate real orders). This was promised to the owner as "next".
4. Checkout prefill from customer account (profiles/addresses into order wizard).
5. Pending owner inputs: branch photos + Google Maps links (Branch type has photoUrl/mapsUrl), real UPI IDs + QR images (placeholder QR in wizard), Meta Pixel ID, dad's answer sheet (rates/franchise numbers — see docs in repo), Razorpay later (PAYMENT_MODE flag exists, checkout not implemented).

## Marketing assets (done, in repo)
`docs/marketing/`: MARKETING_STRATEGY.md, FACEBOOK_ADS_GUIDE.md, EMAIL_CAMPAIGN.md, pune_prospects.csv (35 researched leads + summary). 3 template drafts sit in owner's Gmail ("[TEMPLATE — …]"). Meta Pixel events wired site-wide (needs NEXT_PUBLIC_META_PIXEL_ID).

## Gotchas learned
- Sandbox egress blocks fetching vercel.app/supabase.co pages — cannot verify the live site directly; rely on owner screenshots + Vercel bot comments on PRs.
- `pkill -f "next start"` kills your own shell (exit 144) — use a distinct port per test server instead.
- Images pasted in chat do NOT land as files (only file-attachments reach `/root/.claude/uploads/...`).
- Stop-hook demands commit+push on the designated branch every turn.
- Playwright CLI (`playwright screenshot`) + Read on the PNG = visual verification loop; rebuild Next before screenshotting and restart the server (fresh port).
