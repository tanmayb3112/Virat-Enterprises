# Pune B2B Prospect Database — Summary (checked 2026-07-25)

CSV: `pune_prospects.csv` (same folder) — 35 rows, 10 categories, 25 rows with a publicly listed email.

## Counts per category

| Category | Rows | With email |
|---|---|---|
| Coaching classes | 4 | 4 |
| Colleges | 6 | 3 |
| Schools | 1 | 1 |
| Law firms | 3 | 2 |
| CA / accounting firms | 4 | 2 |
| Architecture & engineering | 3 | 3 |
| Real estate developers | 3 | 3 |
| Hospitals & diagnostic labs | 5 | 4 |
| NGOs | 3 | 2 |
| Event management | 2 | 1 |
| Co-working | 1 | 0 |
| **Total** | **35** | **25** |

## Verification method & caveat

Direct page fetching (WebFetch/curl) is blocked by this environment's egress policy
(HTTP 403 on all outbound hosts), so every contact was captured from web-search
results that quote the organization's own official website or its official contact
page (the `source_url` column). Emails that sites display obfuscated (e.g.
S.P. College, ILS Law College, Garware College) were deliberately left blank
rather than guessed. Recommend a quick phone confirmation before any email blast.

## 5 highest-value targets

1. **Chanakya Mandal Pariwar (Sadashiv Peth)** — office@chanakyamandal.org.
   Large UPSC/MPSC academy literally around the corner from the Appa Balwant Chowk
   branch; competitive-exam institutes consume study material, mock-test booklets
   and spiral binding weekly, year-round. Recurring high-volume B/W work.

2. **Deenanath Mangeshkar Hospital (Erandwane)** — info@dmhospital.org.
   1,000+ bed hospital: case papers, consent forms, registers, patient leaflets —
   continuous forms printing is a steady annuity contract, and they are near the
   Deccan/JM Road catchment.

3. **Kolte-Patil Developers (Boat Club Road)** — info.kpdl@koltepatil.com.
   Listed developer with many live Pune projects; brochures, floor plans, RERA
   agreement sets and site-office stationery are high-margin colour work with
   large one-time orders per project launch.

4. **Fergusson College / BMCC (Deccan Education Society)** — principal@fergusson.edu,
   office.bmcc@despune.org. Two flagship DES colleges within 1–2 km of the JM Road
   branch; admission season (prospectus, forms) plus exam printing gives seasonal
   spikes; winning one DES institution opens the whole society (NES Tilak Road etc.).

5. **AVA Architects (off JM Road, Shivajinagar)** — info@avaarchitects.in.
   Architecture studio next door to the JM Road branch; CAD/large-format plotting
   is a specialty service with few local competitors and weekly repeat orders;
   also a referral gateway to the structural consultants they work with (Soman
   Engineering, Strucpro — both in the CSV).

## Suggested next steps
- Phone-verify the 10 rows without emails during a branch-area canvassing round
  (Workplex Bibwewadi and Sahyadri Deccan are on existing branch routes).
- Lead with a category-specific sample kit: bound mock-test booklet for coaching
  classes, A1 CAD plot sample for architects, forms bundle for hospitals.
