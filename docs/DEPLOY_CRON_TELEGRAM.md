# Deploy notes — Vercel cron migration + Telegram watch bot

Implements `~/.claude/plans/golfshin-cron-telegram-plan.md`. Code is merged; the steps below are **manual prod actions** (require Vercel dashboard / prod env access the build agent can't do).

## 1. Env vars (Vercel project settings)
- `CRON_SECRET` — already set (Vercel auto-injects as `Authorization: Bearer <CRON_SECRET>` to both crons).
- `TELEGRAM_BOT_TOKEN` — already set.
- `TELEGRAM_WEBHOOK_SECRET` — **NEW. Add to Vercel env (and local `.env`).** Random ≥16 chars. Never commit `.env`.
- `ONETHECLUB_MEMBER_ID` — used only by the GitHub Actions onetheclub scraper (see §4). Not needed in Vercel env.

## 2. Migration (USER APPROVED)
Apply `supabase/migrations/011_telegram_watches.sql` to the Supabase project (table + active partial unique index + RLS service-role-only). Standard migration apply flow.

## 3. Crons → Vercel (Task 1a) — ✅ DONE (2026-08-07)
`vercel.json` declares three crons (`/api/scrape/cron` @ `0 * * * *`, `/api/telegram/check` @ `50 * * * *`, `/api/telegram/yangju/check` @ `55 * * * *`).
1. ✅ Vercel Pro confirmed (Hobby caps cron at 1/day — hourly would fail deploy).
2. ✅ All three crons registered (`vercel crons ls`).
3. ✅ Hourly firing verified in `scrape_club_results`: runs land at `:00`–`:01` UTC every hour, 18+ consecutive hours with no gap.
4. ✅ `.github/workflows/scrape-cron.yml` deleted. It only `curl`ed `/api/scrape/cron`, which Vercel cron now does — pure duplicate. Its remaining runs were also failing on GitHub's side (`The job was not acquired by Runner of type hosted`).

**Do not re-add it.** If Vercel cron ever stops firing, fix the Vercel cron (check plan tier + `CRON_SECRET`) rather than restoring a second trigger — two triggers double-scrape every club.

## 4. onetheclub — single-session member account (resolved 2026-10-17)
`scrape-onetheclub.yml` scrapes onetheclub (본진 파주/신라/클럽72 + 제휴) on the GitHub runner at `:30` and upserts to the SAME `tee_times` table. Since 2026-10-17 it is a backup; Vercel cron is the primary source again.

### Root cause of the old "write-loss" (1–15% of rows)
It was never a write problem. The onetheclub **member account keeps one live session**. `/api/scrape` fanned out one `/api/scrape/club` function per date, so 7 functions logged in with the same account at once; each login kicked the previous session. Kicked sessions get a 본진 time list with a **blank company heading** (`span.company_name` empty), a `302`, or an empty body — parsed as "no slots". The scraper swallowed per-course errors and still reported `success` with partner rows only, so `scrape_club_results.scraped_at` (S) advanced and the liveness filter hid every 본진 row written earlier (including the runner's). Measured 2026-10-17: 7 parallel dates → 6 kicked; same dates run sequentially → all fine (신라CC 10-18: site 39 open, prod showed 0).

### Fix
- `src/lib/scrapers/onetheclub.ts`: a 본진 response with a non-200 status or blank company heading throws `onetheclub session invalid …`; 본진 errors are no longer swallowed, so the whole scrape fails and S does not advance. A genuinely closed day still carries the heading (`신라CC [ 마감 ]`) and stays a success.
- `src/app/api/scrape/route.ts`: `SINGLE_SESSION_CLUBS = {onetheclub}` dates are dispatched one after another inside `waitUntil` (`maxDuration = 800`, project has fluid compute on; ~25s/date × 7). Other clubs still fan out in parallel.

### Runner
- **Keep `.github/workflows/scrape-onetheclub.yml`** as a backup (GitHub drops many scheduled runs — observed gaps of 2–5h, so it cannot be the primary). It does not write `scrape_club_results`, so its rows only show while they are newer than the last Vercel S. If a runner run overlaps the Vercel chain, the kicked side now fails loudly instead of writing empty 본진 data.
- GitHub delays the `:30` schedule (run `40647118121` started 06:58 UTC; its 07:00:57 date was kicked by the Vercel chain, which runs :00:48–:01:39 UTC per `scrape_club_results` 2026-10-26~28). Since 2026-10-28 the runner (`src/lib/scrapers/onetheclub-runner.ts`) does not start a date between :59:20 and :02:30 UTC, and retries a `session invalid` date once with a fresh login after 60s. A second kick still fails the run.
- `ONETHECLUB_MEMBER_ID` is set in **both** GitHub Actions secrets and Vercel Production env (checked `vercel env ls production`, 2026-10-17).

> Note: 듄스 is NOT an onetheclub 본진 CC. The two 듄스 courses in `tee_times` are `laviebell` (라비에벨CC 듄스) and `orangedunesyj` (오렌지듄스영종GC) — separate scrapers, both covered by Vercel cron. (`J5A 듄스` in onetheclub has only ever returned `[ 오픈전 ]`.)

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
