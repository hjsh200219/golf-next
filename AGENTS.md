# GolfShin -- Agent Rules

> Golf tee-time reservation aggregator for Korean golf courses.
> Real-time scraping from 34 club websites, Supabase backend, Next.js 14 frontend.

> **응답 언어: 한국어** — 사용자에게는 항상 한글로 답변한다. (코드/커밋/PR/식별자는 영문 유지)

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
    scrapers/       # 34 club scrapers extending BaseScraper + index registry
    supabase/       # client, server, middleware helpers
    types/          # database, tee-time, weather
    utils/          # date, price, time, group, event, geohash, uuid, weather
    telegram/       # Main bot (33+ clubs): watches, match, keyboards, client, time helpers
    telegram-yangju/ # Yangju-only bot (@jonnyjhkimbot): watch + book/reserve flow
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
- **SEO/GEO**: `src/lib/schema.ts` generates JSON-LD dynamically; `public/llms.txt` for LLM discovery; `src/app/sitemap.ts` → `/sitemap.xml` (indexable pages only); `src/app/robots.ts` → `/robots.txt` (prod allow-all + sitemap ref, Vercel preview blocked). Sync all on content/feature changes (or run `/sh:geo-update`).
- **Scrape Schedule**: Vercel Cron (`vercel.json`, 3개) — scrape hourly (`0 * * * *`) at `/api/scrape/cron`; Telegram watch check (`50 * * * *`) at `/api/telegram/check`; Yangju watch check (`55 * * * *`) at `/api/telegram/yangju/check`. **예외 1개**: onetheclub 본진(파주/신라/클럽72)은 Vercel 람다에서 빈 응답이 와서 GitHub Actions `scrape-onetheclub.yml`(`30 * * * *`)이 러너에서 직접 스크레이핑 → 같은 `tee_times`에 upsert. 이 워크플로는 삭제 금지. 상세: [docs/DEPLOY_CRON_TELEGRAM.md](./docs/DEPLOY_CRON_TELEGRAM.md).

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
| [docs/harness/llm-coding-principles.md](./docs/harness/llm-coding-principles.md) | LLM coding behavioral guidelines |

## Common Tasks

- **Add scraper**: Create `src/lib/scrapers/{club-id}.ts` extending `BaseScraper`, register in `index.ts`, add to `regions.ts`
- **Add page**: Create `src/app/{route}/page.tsx`, add nav link in `MobileNav.tsx` + `Header.tsx`
- **Add API route**: Create `src/app/api/{endpoint}/route.ts`, use `createServerClient()` for DB
- **Modify DB schema**: Requires explicit approval. Create migration, update `src/lib/types/database.ts`
- **Telegram bots (2개)**:
  - **Main bot** — 전 골프장 빈자리 알림(watch-only). Logic `src/lib/telegram/`; webhook `/api/telegram/webhook`; watch check `/api/telegram/check`; DB `telegram_watches` (migration 011). Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`.
  - **Yangju bot** (@jonnyjhkimbot) — 양주CC 전용. 알림(`/watch`) + **실예약**(`/book`→슬롯→`r|` 예약 flow). Logic `src/lib/telegram-yangju/`; webhook `/api/telegram/yangju/webhook`; check `/api/telegram/yangju/check`; migration 012. Env: `TELEGRAM_JK_BOT_TOKEN`, `TELEGRAM_JK_WEBHOOK_SECRET`, `TELEGRAM_JK_ALLOWED_CHAT_IDS`(allowlist). 공유 키보드는 `telegram/keyboards.ts`(`chunk`/`dateKeyboard`/`timeRangeKeyboard`) 위임.
  - **운영 스크립트** (`scripts/`): 슬래시 커맨드 자동완성은 `set-telegram-commands.ts`(setMyCommands), 웹훅 등록은 `set-telegram-webhook.ts`. 둘 다 멱등 — 명령어/문구 또는 웹훅 변경 시 해당 토큰 env 주입 후 `npx tsx scripts/<file>` 재실행. 핸들러에 명령어 추가/제거 시 `set-telegram-commands.ts`의 목록도 함께 갱신.

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


## TDD & 코딩 원칙

- **TDD 필수**: 모든 새 기능/로직 변경은 Red(실패 테스트 먼저) → Green(통과 최소 구현) → Refactor 순서로 개발한다. 테스트 없는 코드 변경 불가.
- **LLM 코딩 행동 원칙**: Think Before Coding · Simplicity First · Surgical Changes · Goal-Driven Execution. 상세는 [docs/harness/llm-coding-principles.md](docs/harness/llm-coding-principles.md).

## 세션 시작 시 Handoff 강제

새 세션 시작 시 `.claude-project/HANDOFF.md`를 다른 작업보다 먼저 반드시 읽어 이전 세션 컨텍스트(미완료 작업·결정·주의사항)를 파악한 뒤 시작한다. 파일이 없으면 정상 진행.
