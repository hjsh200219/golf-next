# Plan: Migrate 4 Unimplemented Scrapers (probe-gated)

> Status: **pending approval** · Created 2026-06-05 · Mode: ralplan (consensus) non-interactive

Implement scrapers for `fortunehills`, `namchuncheon_new`, `lakeside_new`, `namyeoju` —
the 4 "Python → Next.js not migrated" clubs in [UNIMPLEMENTED_CLUBS.md](../UNIMPLEMENTED_CLUBS.md).

## ⚡ LIVE-PROBE VERDICT (2026-06-05, ranking inverted from first draft)

Ran 3 live probe rounds with the shared `inter349` credential. User confirmed membership at
fortunehills + namchuncheon + lakeside (NOT namyeoju). **Cannot deliver all 4.** Per-club:

| Club | Verdict | Evidence (live probe + user browser capture) |
|---|---|---|
| **namchuncheon_new** | 🟢 **VIABLE — ship this one** | API base = `https://namchuncheoncc-hp-api.holeinonecloud.com` (AWS Seoul, multi-tenant golf platform). `POST /api/v1/auth/login` `{userId,password}` + header `golfclubid:2` → 200, JWT at `contents.accessToken`, also `Set-Cookie accessToken=...; Domain=holeinonecloud.com`. Courses: 793 Victory / 794 Challenge. **Remaining:** capture the exact 실시간예약 (real-time booking) request (path+params) — booking endpoints need the JWT sent as **Cookie** (browser uses `cookie: accessToken=`, not Bearer). 1 capture from shipping. |
| **fortunehills** | 🔴 **DEFER (Cloudflare + no login-free path)** | Member ✓, login is standalone `Member/Login.aspx` (`__EVENTTARGET=...lbtLogin`, `txtLoginID/Password`, `rbtLoginType=I`) — but page is **Cloudflare-challenged** (`cf_clearance`, `cf-ray`); server fetch can't pass it. Data only via ASP.NET postback (no public XHR — `commonT01` filled by `__doPostBack`/`btnUp`). Even if cracked locally, Vercel datacenter IP likely blocked (cf. bearcreek "local-only"). |
| **lakeside_new** | 🔴 **DEFER (reCAPTCHA + bot-challenge)** | Member ✓, but login form has reCAPTCHA + `recaptchaToken`; data `.do` siblings (`ajax_real_timeinfo_list_golf*.do`) all **bounce to login** and serve an Imperva/Incapsula JS challenge (`<script defer src='/<uuid>/'>`). No login-free path. Same-host-samsunggolf argument void. |
| **namyeoju** | 🔴 **DEFER (not a member + dead site)** | NOT a member. Site ~1.7 KB empty shell, no reservation links, Python source is an unfinished stub. Drop. |

**FINAL: only namchuncheon_new is deliverable** (1 booking-request capture away). fortunehills + lakeside + namyeoju stay in UNIMPLEMENTED_CLUBS with the evidence above. So: **1 of 4**, not 4.

> Sections below are the original consensus draft; the table above is the live-evidence override.

## TL;DR — this is NOT "build 4 scrapers"

The load-bearing variable is **empirical, not architectural**: does each site return tee-time
data to plain `fetch`, or is it a client-rendered SPA whose data comes from a background API
we haven't found? golf-next has **no headless browser** in the Vercel cron runtime — every
scraper is `fetch` + cheerio. The Python originals for 3 of these 4 use Playwright; that path
**cannot be ported as-is.**

So the plan is **per-club PROBE → go/no-go gate → implement only what's viable.** Promising "4
working scrapers" up front would be dishonest. Realistic expected delivery: **2 solid
(fortunehills, lakeside), 1 stretch (namchuncheon), 1 likely-defer (namyeoju).**

## Evidence gathered (read-only probes, already run)

| Club | Python ref | Probe result | Verdict |
|---|---|---|---|
| `fortunehills` | OLD `fortunehills_list` is **pure requests/ASP.NET POST** (golf.py:958) | GET reservation page → HTTP 200, `commonT01` table + `__VIEWSTATE` present; rows arrive via POST | **HIGH** — pure-fetch ASP.NET, no login needed for `_new` path (`?SelectedDate=`) |
| `lakeside_new` | Playwright | Login form fields `usrId`/`usrPwd`/`bt_login` **identical to samsunggolf** (same host lakeside.kr); reservation page refs `ajax_real_modal_info.do`; reqs login (302) | **MED-HIGH** — samsunggolf already pure-fetches this host; risk = `recaptchaToken` field + finding day-data endpoint |
| `namchuncheon_new` | Playwright, parses hashed styled-component classes | **Next.js SPA** (`/_next/static/chunks`), 14KB empty shell, zero data in HTML | **MED** — must find backing JSON/XHR API; parsing rendered HTML is a guaranteed future break |
| `namyeoju` | **stub** — opens browser, `wait_for_timeout(10000)`, no parse, `headless=False` | not probed (no working reference to replicate) | **LOW** — original author never finished it |

## Key facts (constrain the design)

1. **Shared single credential.** One `GOLF_LOGIN_ID`/`GOLF_LOGIN_PW` (+`PW3`) across ALL clubs
   ([route.ts:10-25](../../src/app/api/scrape/club/route.ts)). No new env keys.
   **Open risk:** is that shared account a *member* at namchuncheon & lakeside? If not, no data
   regardless of scraper quality. fortunehills/namyeoju `_new` use no login (public page).
2. **Liveness invariant.** Scraper MUST `throw` on failure, never return `success` with 0 rows
   (memory: teetime-liveness-invariant). A login that silently fails must throw.
3. **TDD mandatory** (CLAUDE.md). Probe-captured HTML/JSON IS the test fixture. vitest + cheerio.
4. **Price = discount tier** (memory: scraper-price-tier-convention). Reuse `processPrice`.
5. **Date param fit.** fortunehills `?SelectedDate`, lakeside `pointDate` (samsunggolf pattern) —
   map to per-date scrape contract, no calendar-clicking.

## Principles

1. **Probe before promise** — never write a scraper before a captured live response proves the data path.
2. **Match the architecture** — `fetch`+cheerio only; if a club is genuinely SPA-only with no
   discoverable API, **defer it**, do not bolt in Playwright.
3. **Lead with confidence** — ship fortunehills + lakeside first (highest probe confidence);
   treat namchuncheon/namyeoju as gated stretch goals.
4. **Honest scope** — each club is independently go/no-go; partial delivery is the expected, correct outcome.

## Decision drivers (top 3)

1. Runtime has no browser → fetch-only is a hard constraint, not a preference.
2. Discovery (does an API exist / does login work) dominates design effort.
3. Per-club independence → parallelizable, and one club's failure doesn't block others.

## Options considered

- **(A) Implement all 4 monolithically, pure-fetch, from Python source.** ❌ Rejected — assumes
  all 4 have a fetchable data path; probes already disprove this for namchuncheon (SPA) and
  namyeoju (no working source).
- **(B) Add Playwright to golf-next for SPA clubs.** ❌ Rejected — Vercel cron has no headless
  browser; contradicts the whole architecture; UNIMPLEMENTED_CLUBS already documents WAF clubs
  deferred for exactly this reason.
- **(C) Probe-gated per-club pipeline.** ✅ **Chosen** — matches the diagnostic-playbook memory
  ("live-probe, don't trust docs"), delivers the viable clubs now, defers the rest with evidence.

## Execution plan (per-club, TDD, independent)

Each club is the same loop: **probe live → capture fixture → write failing test → implement → tsc/test/lint → register → doc.**

### Phase 0 — Membership probe (blocks lakeside + namchuncheon only)
- Run samsunggolf-style login with the shared cred against lakeside.kr; confirm authenticated
  session (not bounced to login). Same for namchuncheon once its login endpoint is found.
- **Gate:** if login fails → mark that club "deferred: no membership," skip its implementation.

### Phase 1 — fortunehills (HIGH) → `src/lib/scrapers/fortunehills.ts`
- Port OLD Python `fortunehills_list` (golf.py:958): GET `Reservation.aspx?SelectedDate=YYYYMMDD`,
  extract `__VIEWSTATE`/`__VIEWSTATEGENERATOR`/`__EVENTVALIDATION` via existing
  `extractAspNetTokens`, POST the ASP.NET async payload, split response on `|`, parse
  `grdList*` tables → `commonT01` rows (teeoff/course/price).
- TDD: capture the POST response as fixture; test parses N rows.
- Region: 경기북부 (포천).

### Phase 2 — lakeside_new (MED-HIGH) → `src/lib/scrapers/lakeside.ts`  *(clubId `lakeside_new`)*
- Reuse samsunggolf login (`usrId`/`usrPwd` → `setLoginCheck.do`). Then **discover the day-data
  endpoint** (the `real_reservation` analogue of `ajax_real_timeinfo_list_golf_samsung.do`) by
  inspecting the network trace / page JS — capture real rows.
- Parse table like samsunggolf (tds 1/2/4/5 → teeoff/course/price/event).
- **Risk gate:** if `recaptchaToken` blocks programmatic login, or no JSON/HTML data endpoint
  exists (calendar-click only) → defer with evidence.
- Region: 경기남부 (용인). ⚠️ Avoid clobbering existing samsunggolf (same host, different path).

### Phase 3 — namchuncheon_new (MED, stretch) → `src/lib/scrapers/namchuncheon.ts`
- It's Next.js. **Find the data API** the SPA calls (inspect `_next` chunks / XHR for a JSON
  endpoint keyed by date). Do NOT parse hashed `sc-*` classnames.
- **Gate:** if no callable API found without a browser → defer.
- Region: 강원 (춘천).

### Phase 4 — namyeoju (LOW, likely defer) → `src/lib/scrapers/namyeoju.ts`
- No working Python reference. Probe `namyeoju.co.kr` reservation page fresh for a server-rendered
  table or JSON API. ASP.NET `Reservation.aspx` per config → maybe fortunehills-like.
- **Gate:** implement only if a clean data path appears; otherwise document as deferred.
- Region: 경기남부 (여주).

### Phase 5 — Registration & docs (per viable club only)
- `src/lib/scrapers/index.ts`: import + add to `SCRAPER_MAP`.
- `src/lib/constants/regions.ts`: add to `CLUB_REGION_MAP` with region above.
- `docs/UNIMPLEMENTED_CLUBS.md`: move shipped clubs out; update the 7→N summary; keep deferred
  ones with the probe evidence for *why*.
- Confirm `golf_clubs` DB row exists for each new clubId (else it won't be scheduled/scraped).

## Acceptance criteria (per club)

- [ ] Live probe captured a real response containing ≥1 tee-time row (or club marked deferred w/ evidence).
- [ ] Vitest test parses the captured fixture → expected rows; passes.
- [ ] Scraper `throw`s on login/HTTP failure (no silent `success:0`).
- [ ] `tsc --noEmit` clean, `npm test` green, `npm run lint` green (layer rules).
- [ ] Registered in `index.ts` + `regions.ts`; `golf_clubs` row confirmed.
- [ ] `UNIMPLEMENTED_CLUBS.md` updated (shipped → removed, deferred → evidence kept).

## Pre-mortem (why this could fail)

1. **Shared cred isn't a member** at lakeside/namchuncheon → login "succeeds" (200) but data page
   is empty → silent 0 rows. *Mitigation:* Phase 0 explicit membership assertion; throw on empty-after-login.
2. **lakeside reCAPTCHA** on login → programmatic login impossible → defer (don't fake tokens).
3. **namchuncheon API is server-action/RSC** (cf. memory scraper-server-action-rsc) with a fragile
   build hash → implement only with throw-on-miss, or defer.

## ADR

- **Decision:** Probe-gated, per-club pure-fetch migration; deliver viable clubs, defer SPA/no-data clubs with evidence.
- **Drivers:** No browser in runtime; discovery dominates; per-club independence.
- **Alternatives:** (A) monolithic all-4, (B) add Playwright — both rejected above.
- **Why chosen:** Honest, matches existing architecture + diagnostic-playbook memory, ships value immediately.
- **Consequences:** "4 scrapers" likely becomes "2–3 shipped + 1–2 documented-deferred." UNIMPLEMENTED_CLUBS stays the source of truth.
- **Follow-ups:** SPA-only clubs (namchuncheon, maybe namyeoju) join bearcreek/bearsbest as "needs browser" — revisit only if a serverless-browser path is ever added.

## Suggested execution

`/oh-my-claudecode:team` — 4 clubs are independent → parallel agents, one per club, each running
the probe→TDD→implement→register loop. fortunehills + lakeside as primary; namchuncheon + namyeoju
as gated/best-effort.
