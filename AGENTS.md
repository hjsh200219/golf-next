# GolfShin -- Agent Rules

> Golf tee-time reservation aggregator for Korean golf courses.
> Real-time scraping from 33 club websites, Supabase backend, Next.js 14 frontend.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript 5
- **DB**: Supabase (Postgres + Auth + RLS)
- **Styling**: Tailwind CSS 3.4 + Pretendard font
- **State**: SWR (server), Zustand (client)
- **Testing**: Vitest + Testing Library + MSW
- **Deploy**: Vercel

## Critical Rules

1. **Never commit `.env*` files** -- secrets include Supabase keys, scraper credentials, API keys, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
2. **Never modify `supabase/migrations/` without explicit approval** -- production DB schema
3. **All Supabase queries must use typed client** -- `createClient()` from `@/lib/supabase/client` (browser) or `@/lib/supabase/server` (server)
4. **Scrapers extend `BaseScraper`** -- see `src/lib/scrapers/base.ts` for interface contract
5. **Korean locale** -- UI text in Korean, `lang="ko"`, Pretendard font, `word-break: keep-all`
6. **Run `tsc --noEmit` before marking work complete**

## Project Structure

```
src/
  app/              # Pages + API routes (/api/clubs, /api/tee-times, /api/scrape, etc.)
  components/       # By domain: auth, favorites, layout, map, results, search, weather
  hooks/            # useTeeTimes, useClubs, useWeather, useFavorites, useAuth, useDeviceId, useFilters
  lib/
    constants/      # regions, club-mappings
    scrapers/       # 33 club scrapers extending BaseScraper + index registry
    supabase/       # client, server, middleware helpers
    types/          # database, tee-time, weather
    utils/          # date, price, time, group, event, geohash, uuid, weather
    telegram/       # Telegram bot: watches, match, keyboards, client, time helpers
    logger.ts       # Structured logger (JSON prod / human dev)
    schema.ts       # JSON-LD schema generation
  middleware.ts     # Supabase session + auth redirect
  types/            # Type declarations (ngeohash.d.ts)
```

## Key Architecture Decisions

> Details: [ARCHITECTURE.md](./ARCHITECTURE.md)

- **Scraper Pattern**: Each club has a dedicated scraper class extending `BaseScraper` with cookie-jar session, login flow, per-scraper SSL toggle.
- **Region System**: Static `CLUB_REGION_MAP` maps club IDs to 7 Korean regions.
- **Favorites**: Dual system -- `user_favorites` (authenticated) + `device_favorites` (anonymous via device UUID).
- **Weather**: OpenWeatherMap API with Supabase caching via geohash.
- **PWA**: next-pwa with offline fallback, service worker auto-registration.
- **Date Tabs**: Tomorrow-focused (not today). Golf reservations are booked 1+ days ahead.
- **SEO**: `src/lib/schema.ts` generates JSON-LD dynamically; `public/llms.txt` for LLM discovery.
- **Scrape Schedule**: Vercel Cron — scrape hourly (`0 * * * *`) at `/api/scrape/cron`; Telegram watch check (`50 * * * *`) at `/api/telegram/check`.

## Design System

> Details: [docs/DESIGN.md](./docs/DESIGN.md)

- **Primary**: `#15803d` (green-700), **Accent**: `#4ade80`
- **Background**: `#f8faf9`, glassmorphism cards, noise texture overlay

## Docs Index

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture and layer rules |
| [docs/DESIGN.md](./docs/DESIGN.md) | Design tokens and component rules |
| [docs/FRONTEND.md](./docs/FRONTEND.md) | Frontend patterns and components |
| [docs/SECURITY.md](./docs/SECURITY.md) | Auth, RLS, API security |
| [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md) | Product principles and user journeys |
| [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md) | Quality grades by domain |
| [docs/PLANS.md](./docs/PLANS.md) | Plans index |
| [docs/RELIABILITY.md](./docs/RELIABILITY.md) | Reliability standards |
| [docs/UNIMPLEMENTED_CLUBS.md](./docs/UNIMPLEMENTED_CLUBS.md) | Unimplemented club list |
| [docs/DEPLOY_CRON_TELEGRAM.md](./docs/DEPLOY_CRON_TELEGRAM.md) | Telegram bot + Vercel cron setup; GitHub Actions deletion checklist |
| [docs/generated/db-schema.md](./docs/generated/db-schema.md) | Database schema reference |

## Common Tasks

- **Add scraper**: Create `src/lib/scrapers/{club-id}.ts` extending `BaseScraper`, register in `index.ts`, add to `regions.ts`
- **Add page**: Create `src/app/{route}/page.tsx`, add nav link in `MobileNav.tsx` + `Header.tsx`
- **Add API route**: Create `src/app/api/{endpoint}/route.ts`, use `createServerClient()` for DB
- **Modify DB schema**: Requires explicit approval. Create migration, update `src/lib/types/database.ts`
- **Telegram bot**: Logic in `src/lib/telegram/`; webhook at `/api/telegram/webhook`; watch check at `/api/telegram/check`; DB table `telegram_watches` (migration 011)

## File Conventions

- Pages: `src/app/**/page.tsx` | API Routes: `src/app/api/**/route.ts`
- Components: `src/components/{domain}/{PascalCase}.tsx` | Hooks: `src/hooks/use{Name}.ts`
- Utils: `src/lib/utils/{camelCase}.ts` | Scrapers: `src/lib/scrapers/{kebab-case}.ts`

## Testing & Verification

- Run: `npm test` (Vitest, ~465 tests / 44 files)
- Build: `npm run build` (ignore `/login` prerender error -- expected without Supabase env vars)
- Lint: `npm run lint` (layer rules enforced via `import/no-restricted-paths`)

## Known Limitations

- Build always fails prerendering `/login` without Supabase env vars -- expected
- Scrapers depend on external golf club websites -- fragile by nature
- Weather cache expires based on `weather_cache.expires_at` -- stale data possible if cron misses

> Be concise. No filler. Straight to the point. Use fewer words.


## TDD 필수

모든 새 기능/로직 변경은 반드시 TDD로 개발한다.
1. Red: 실패하는 테스트 먼저 작성
2. Green: 테스트를 통과하는 최소 코드 작성
3. Refactor: 코드 정리
테스트 없는 코드 변경은 허용하지 않는다.

---

## Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

Tradeoff: These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

Touch only what you must. Clean up only your own mess.

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 세션 시작 시 Handoff 강제

세션을 시작할 때 프로젝트 루트에 `handoff.md` 파일이 있는지 먼저 확인한다.
- `handoff.md`가 존재하면 다른 어떤 작업보다 먼저 **반드시 전체를 읽고 인수인계 컨텍스트를 파악한 뒤 시작**한다.
- 파일이 없으면 정상 진행한다.

이 규칙은 이전 세션의 미완료 작업·결정 사항·주의사항을 놓치지 않기 위한 강제 사항이다.

**이 프로젝트의 handoff 위치**: `.claude-project/HANDOFF.md`
