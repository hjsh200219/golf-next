# GolfShin — Agent Rules

> Golf tee-time reservation aggregator for Korean golf courses.
> Real-time scraping from 26+ club websites, Supabase backend, Next.js 14 frontend.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript 5
- **DB**: Supabase (Postgres + Auth + RLS)
- **Styling**: Tailwind CSS 3.4 + Pretendard font
- **State**: SWR (server), Zustand (client)
- **Testing**: Vitest + Testing Library + MSW
- **Deploy**: Vercel

## Critical Rules

1. **Never commit `.env*` files** — secrets include Supabase keys, scraper credentials, API keys
2. **Never modify `supabase/migrations/` without explicit approval** — production DB schema
3. **All Supabase queries must use typed client** — `createClient()` from `@/lib/supabase/client` (browser) or `@/lib/supabase/server` (server)
4. **Scrapers extend `BaseScraper`** — see `src/lib/scrapers/base.ts` for interface contract
5. **Korean locale** — UI text in Korean, `lang="ko"`, Pretendard font, `word-break: keep-all`
6. **Run `tsc --noEmit` before marking work complete**

## Project Structure

```
src/
├── app/              # Next.js App Router pages + API routes
│   ├── api/          # REST endpoints (clubs, tee-times, scrape, weather, favorites)
│   └── (pages)       # Home, login, settings, weather, _offline
├── components/       # React components by domain
│   ├── auth/         # AuthGuard, LoginButton
│   ├── favorites/    # FavoriteClubList, FavoriteToggle
│   ├── layout/       # Header, MobileNav
│   ├── map/          # GolfMap, ClubMarker, MapTooltip
│   ├── results/      # TeeTimeCard, TeeTimeTable, ClubGroupView, ResultSummary
│   ├── search/       # SearchSection, FilterPanel, RegionFilter, etc.
│   └── weather/      # WeatherDashboard, HourlyChart, DailyChart
├── hooks/            # Custom React hooks (useTeeTimes, useClubs, useWeather, etc.)
├── lib/
│   ├── constants/    # Static data (regions, club-mappings)
│   ├── scrapers/     # 27 club-specific scrapers extending BaseScraper
│   ├── supabase/     # Supabase client helpers (client, server, middleware)
│   ├── types/        # TypeScript types (database, tee-time, weather)
│   └── utils/        # Utility functions (date, price, time, group, event, geohash, weather)
└── middleware.ts      # Supabase session + auth redirect
```

## Key Architecture Decisions

> Details: [ARCHITECTURE.md](./ARCHITECTURE.md)

- **Scraper Pattern**: Each golf club has a dedicated scraper class. All extend `BaseScraper` with cookie-jar session management, login flow, and HTML/JSON parsing.
- **Region System**: Static `CLUB_REGION_MAP` maps club IDs to 5 Korean regions (경기북부, 경기남부, 강원, 인천, 충청).
- **Favorites**: Dual system — `user_favorites` (authenticated) + `device_favorites` (anonymous via device UUID).
- **Weather**: OpenWeatherMap API with Supabase caching via geohash.
- **PWA**: next-pwa with offline fallback, service worker auto-registration.
- **View Mode**: `useUIPreferences` Zustand store (separate from filter store) provides club-grouped vs time-ordered view toggle.
- **Event Display**: `formatEventDisplay` in `utils/event.ts` classifies tee-time events into discount (할인) vs info categories, filtering garbage data.
- **Date Tabs**: 내일/모레/글피 (tomorrow-focused, not today). Golf reservations are typically booked 1+ days ahead.
- **Scrape Schedule**: Vercel Cron runs hourly (`0 * * * *`) at `/api/scrape/cron`.

## Design System

> Details: [docs/DESIGN.md](./docs/DESIGN.md)

- **Primary**: `#15803d` (green-700), **Accent**: `#4ade80`
- **Background**: `#f8faf9`, glassmorphism cards, noise texture overlay
- **Animations**: `fadeUp`, `shimmer` loading, spring-based hover transitions
- **Favicon**: `logo.webp` (transparent bg, shared with header logo)

## Docs Index

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture and layer rules |
| [AGENTS.md](./AGENTS.md) | Agent-specific work guide |
| [docs/DESIGN.md](./docs/DESIGN.md) | Design tokens and component rules |
| [docs/FRONTEND.md](./docs/FRONTEND.md) | Frontend patterns and components |
| [docs/SECURITY.md](./docs/SECURITY.md) | Auth, RLS, API security |
| [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md) | Product principles and user journeys |
| [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md) | Quality grades by domain |
| [docs/PLANS.md](./docs/PLANS.md) | Plans index |
| [docs/RELIABILITY.md](./docs/RELIABILITY.md) | Reliability standards |
| [docs/generated/db-schema.md](./docs/generated/db-schema.md) | Database schema reference |
