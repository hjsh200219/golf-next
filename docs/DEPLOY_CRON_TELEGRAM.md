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

## 4. onetheclub — keep on GitHub Actions (DECIDED: do NOT migrate)
`scrape-onetheclub.yml` scrapes onetheclub 본진 CCs (파주/신라/클럽72 4개 코스) directly on the GitHub runner and upserts to the SAME `tee_times` table. It is the only reliable source of D+1~D+7 본진 rows, so it stays on the runner.

> **Correction (2026-08-07).** An earlier revision of this section claimed "the Vercel lambda gets near-empty 본진 responses." That is **not** what the data shows — it was generalized from one unlucky hour. The Vercel lambda *does* retrieve 본진: the `21:01` run wrote 329 본진 rows. The real split is by date range, not by 본진/제휴.
>
> `club_id=onetheclub` rows actually written to `tee_times`, by run:
>
> | run | source | range | rows | 본진 |
> |---|---|---|---|---|
> | `20:01` | Vercel | D+1~D+7 | 6 | 6 |
> | `21:01` | Vercel | D+8~D+14 | 332 | 329 |
> | `22:01` | Vercel | D+1~D+7 | 30 | 26 |
> | `23:01` | Vercel | D+8~D+14 | 1000+ | 103 |
> | `00:01` | Vercel | D+1~D+7 | 14 | 10 |
> | `00:20` | GitHub runner | D+1~D+7 | 1000+ | 418 |
>
> Note: 듄스 is NOT an onetheclub 본진 CC (earlier drafts listed it). The two 듄스 courses in `tee_times` are `laviebell` (라비에벨CC 듄스) and `orangedunesyj` (오렌지듄스영종GC) — separate scrapers, both covered by Vercel cron.

### ⚠️ Open issue — Vercel cron reports success but writes ~1–15% of rows

Every Vercel `/api/scrape/cron` run records onetheclub as `status=success` with ~2000 tee times found, yet only a fraction reach `tee_times`:

| run | `scrape_club_results` 합계 | rows in `tee_times` |
|---|---|---|
| `20:01` | 1964 | 6 |
| `21:01` | 2121 | 332 |
| `22:01` | 2107 | 30 |
| `00:01` | 2060 | 14 |

Mechanism unknown — candidates: upsert batch dropped (`ON CONFLICT DO UPDATE cannot affect row a second time` on in-batch duplicates), the 60s `maxDuration` on `/api/scrape/cron` cutting the write short, or `waitUntil` dispatch being killed. **This matters for the liveness invariant**: a row is treated as open only while `scraped_at >= latest successful scrape`, so rows the scraper saw but failed to write look *closed*. For D+1~D+7 the `:30` runner repairs this every hour, which is why 본진 still works in practice. Not investigated — see HANDOFF.

**Why the runner stays regardless:** the Telegram bot and the watch-check cron only READ `tee_times` — they don't care which job produced a row. The runner reliably lands full D+1~D+7 본진 data (1000+ rows/run), and D+1~D+7 is the range users actually book.

- **KEEP `.github/workflows/scrape-onetheclub.yml`.** Do not delete it, do not migrate onetheclub to Vercel — not until the write-loss issue above is understood. It is the one intentional workflow in the repo, not a leftover.
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
