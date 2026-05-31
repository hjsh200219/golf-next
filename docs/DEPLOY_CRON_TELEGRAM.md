# Deploy notes — Vercel cron migration + Telegram watch bot

Implements `~/.claude/plans/golfshin-cron-telegram-plan.md`. Code is merged; the steps below are **manual prod actions** (require Vercel dashboard / prod env access the build agent can't do).

## 1. Env vars (Vercel project settings)
- `CRON_SECRET` — already set (Vercel auto-injects as `Authorization: Bearer <CRON_SECRET>` to both crons).
- `TELEGRAM_BOT_TOKEN` — already set.
- `TELEGRAM_WEBHOOK_SECRET` — **NEW. Add to Vercel env (and local `.env`).** Random ≥16 chars. Never commit `.env`.
- `ONETHECLUB_MEMBER_ID` — **verify it exists in Vercel prod env** (see step 4).

## 2. Migration (USER APPROVED)
Apply `supabase/migrations/011_telegram_watches.sql` to the Supabase project (table + active partial unique index + RLS service-role-only). Standard migration apply flow.

## 3. Crons → Vercel (Task 1a)
`vercel.json` now declares two crons (`/api/scrape/cron` @ `0 * * * *`, `/api/telegram/check` @ `50 * * * *`).
1. **Confirm the project is on Vercel Pro** (Hobby caps cron at 1/day — hourly would fail deploy). If NOT Pro, hourly crons are invalid; do not proceed with cron migration.
2. Deploy. In **Vercel → Settings → Cron Jobs**, confirm BOTH crons are registered.
3. **Observe `/api/scrape/cron` firing hourly** across ≥2 consecutive hours (function logs show `Cron triggered` / `Cron completed`). Do NOT rely on a single 200.
4. **Only after** hourly firing is confirmed: delete `.github/workflows/scrape-cron.yml`. (Sequenced → no coverage gap. The build did NOT delete it.)

## 4. onetheclub spike (Task 1b) — env-check FIRST, then decide
`scrape-onetheclub.yml` runs onetheclub on the GitHub runner because 본진 CCs returned empty on Vercel lambda. **Do NOT delete that workflow until the gate below passes.**
1. **Step 0 — env check:** confirm `ONETHECLUB_MEMBER_ID` is set in Vercel prod. `src/lib/scrapers/onetheclub.ts` SILENTLY SKIPS home courses when it's unset — the "empty 본진" may simply be a missing env var, not a session bug. If missing → set it, redeploy, re-test.
2. **Step 1 — diagnose (only if env present and 본진 still empty):** run the onetheclub home path in Vercel prod and capture raw response bodies + cookie state for the 4 home request codes. Classify: code-fixable (fetchCookie/undici cookie-jar on lambda, or the per-scraper undici Agent TLS dispatcher in `base.ts`) vs not-code-fixable (Vercel egress IP treated differently → needs proxy; surface to user, keep workflow).
3. **Deletion gate (per-request-code parsed-row count — NOT cc_name literals):** the gate must assert that EACH of the 4 home request codes `{J53 신라CC, J54 파주CC, J5A 듄스코스, D01 클럽72CC/J57}` yields ≥1 parsed row in a Vercel-run scrape. Key on the request codes (a fixed source invariant in `onetheclub.ts` HOME_COURSES), NOT on observed `cc_name` strings — `tee_times` rows carry only `cc_name` (no code), and gating on observed cc_names is circular (vacuously passes when home courses return 0 rows) and non-computable. Partners always populate and would mask a home-course failure, so assert each home code individually.
4. **Only after** all 4 home codes verified non-empty from a **Vercel** run: delete `.github/workflows/scrape-onetheclub.yml`. Otherwise keep it and report the spike outcome.

## 5. Telegram webhook (one-time)
After deploy + `TELEGRAM_WEBHOOK_SECRET` set:
```
APP_URL=https://<app>.vercel.app \
TELEGRAM_BOT_TOKEN=<token> \
TELEGRAM_WEBHOOK_SECRET=<secret> \
npx tsx scripts/set-telegram-webhook.ts
```
Then in Telegram: `/watch` → pick club → date → time-range; `/list`; `/stop`.

## Known limitations (v1)
- **onetheclub watches are club-level** — a 본진 watch fires on any onetheclub course in range (incl. partners); can't isolate "본진 파주 only." cc_name-level is a future follow-up.
- **BACKSTOP = 180min:** if a club's scrape fails for >180min the watch goes silent until the next success (safe failure; never false-positives).
- **No slot-level dedup:** notifies every hour a slot is open; only `/stop` halts.
- **Cron correctness invariant:** the watch match relies on Task 0's shared-timestamp fix in `scrape/club/route.ts` (`tee_times.scraped_at == scrape_club_results.scraped_at` per run). Don't reintroduce two `new Date()` calls there.
