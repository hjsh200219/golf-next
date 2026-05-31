# Deploy notes — Vercel cron migration + Telegram watch bot

Implements `~/.claude/plans/golfshin-cron-telegram-plan.md`. Code is merged; the steps below are **manual prod actions** (require Vercel dashboard / prod env access the build agent can't do).

## 1. Env vars (Vercel project settings)
- `CRON_SECRET` — already set (Vercel auto-injects as `Authorization: Bearer <CRON_SECRET>` to both crons).
- `TELEGRAM_BOT_TOKEN` — already set.
- `TELEGRAM_WEBHOOK_SECRET` — **NEW. Add to Vercel env (and local `.env`).** Random ≥16 chars. Never commit `.env`.
- `ONETHECLUB_MEMBER_ID` — used only by the GitHub Actions onetheclub scraper (see §4). Not needed in Vercel env.

## 2. Migration (USER APPROVED)
Apply `supabase/migrations/011_telegram_watches.sql` to the Supabase project (table + active partial unique index + RLS service-role-only). Standard migration apply flow.

## 3. Crons → Vercel (Task 1a)
`vercel.json` now declares two crons (`/api/scrape/cron` @ `0 * * * *`, `/api/telegram/check` @ `50 * * * *`).
1. **Confirm the project is on Vercel Pro** (Hobby caps cron at 1/day — hourly would fail deploy). If NOT Pro, hourly crons are invalid; do not proceed with cron migration.
2. Deploy. In **Vercel → Settings → Cron Jobs**, confirm BOTH crons are registered.
3. **Observe `/api/scrape/cron` firing hourly** across ≥2 consecutive hours (function logs show `Cron triggered` / `Cron completed`). Do NOT rely on a single 200.
4. **Only after** hourly firing is confirmed: delete `.github/workflows/scrape-cron.yml`. (Sequenced → no coverage gap. The build did NOT delete it.)

## 4. onetheclub — keep on GitHub Actions (DECIDED: do NOT migrate)
`scrape-onetheclub.yml` scrapes onetheclub 본진 CCs (파주/신라/듄스/클럽72) directly on the GitHub runner and upserts to the SAME `tee_times` table. The Vercel lambda gets empty 본진 responses, so this stays on the runner.

**This is fine and requires no further work:** the Telegram bot and the watch-check cron only READ `tee_times` — they don't care which job produced a row. The runner keeps 본진 data fresh (verified: a recent run upserted 파주CC 252 / 신라CC 166 / 클럽72 320+ rows), so 본진 watches work normally.

- **KEEP `.github/workflows/scrape-onetheclub.yml`.** Do not delete it, do not migrate onetheclub to Vercel. Migrating would risk breaking working 본진 coverage for no benefit (the data already lands in `tee_times`).
- `ONETHECLUB_MEMBER_ID` lives only as a GitHub Actions secret (the runner injects it). No Vercel env entry needed.
- "Vercel cron 통합" therefore means migrating ONLY `scrape-cron.yml` (the endpoint-trigger cron, §3). onetheclub is the one intentional exception.

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
