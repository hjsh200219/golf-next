# GolfShin -- Agent Rules

> Golf tee-time reservation aggregator for Korean golf courses.
> Real-time scraping from 34 club websites, Supabase backend, Next.js 14 frontend.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript 5
- **DB**: Supabase (Postgres + Auth + RLS)
- **Styling**: Tailwind CSS 3.4 + Pretendard font
- **State**: SWR (server), Zustand (client)
- **Testing**: Vitest + Testing Library + MSW
- **Deploy**: Vercel

## Critical Rules

1. **Never commit `.env*` files** -- secrets include Supabase keys, scraper credentials, API keys
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
- **Scrape Schedule**: Vercel Cron runs hourly (`0 * * * *`) at `/api/scrape/cron`.

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
| [docs/generated/db-schema.md](./docs/generated/db-schema.md) | Database schema reference |

## Common Tasks

- **Add scraper**: Create `src/lib/scrapers/{club-id}.ts` extending `BaseScraper`, register in `index.ts`, add to `regions.ts`
- **Add page**: Create `src/app/{route}/page.tsx`, add nav link in `MobileNav.tsx` + `Header.tsx`
- **Add API route**: Create `src/app/api/{endpoint}/route.ts`, use `createServerClient()` for DB
- **Modify DB schema**: Requires explicit approval. Create migration, update `src/lib/types/database.ts`

## File Conventions

- Pages: `src/app/**/page.tsx` | API Routes: `src/app/api/**/route.ts`
- Components: `src/components/{domain}/{PascalCase}.tsx` | Hooks: `src/hooks/use{Name}.ts`
- Utils: `src/lib/utils/{camelCase}.ts` | Scrapers: `src/lib/scrapers/{kebab-case}.ts`

## Testing & Verification

- Run: `npm test` (Vitest, 359 tests / 27 files)
- Build: `npm run build` (ignore `/login` prerender error -- expected without Supabase env vars)
- Lint: `npm run lint` (layer rules enforced via `import/no-restricted-paths`)

## Known Limitations

- Build always fails prerendering `/login` without Supabase env vars -- expected
- Scrapers depend on external golf club websites -- fragile by nature
- Weather cache expires based on `weather_cache.expires_at` -- stale data possible if cron misses

> Be concise. No filler. Straight to the point. Use fewer words.
