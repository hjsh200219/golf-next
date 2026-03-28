# GolfShin — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                       │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐  │
│  │  Search   │ │ Weather  │ │ Favorites │ │ Settings │  │
│  │  + Map    │ │Dashboard │ │           │ │ + Login  │  │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └────┬─────┘  │
│       │ SWR        │ SWR         │ SWR        │         │
└───────┼────────────┼─────────────┼────────────┼─────────┘
        ▼            ▼             ▼            ▼
┌─────────────────────────────────────────────────────────┐
│                 Next.js API Routes                        │
│  /api/tee-times  /api/weather  /api/favorites  /api/auth │
│  /api/clubs      /api/scrape   /api/refresh              │
└───────┬────────────┬─────────────────────────┬──────────┘
        │            │                         │
        ▼            ▼                         ▼
┌──────────────┐ ┌────────────┐      ┌────────────────────┐
│   Supabase   │ │OpenWeather │      │  Golf Club Sites   │
│  (Postgres)  │ │  Map API   │      │   (27 scrapers)    │
└──────────────┘ └────────────┘      └────────────────────┘
```

## Layer Architecture

```
Types → Constants → Utils → Supabase Client → Hooks → Components → Pages
  ↑                                                                   │
  └───────────── API Routes (server-only) ←──────────────────────────┘
```

### Layer Rules

| Layer | Directory | May Import From | May NOT Import |
|-------|-----------|-----------------|----------------|
| Types | `lib/types/` | (nothing) | Any layer |
| Constants | `lib/constants/` | Types | Utils, Hooks, Components |
| Utils | `lib/utils/` | Types, Constants | Hooks, Components |
| Supabase | `lib/supabase/` | Types | Hooks, Components |
| Scrapers | `lib/scrapers/` | Types, Utils, Supabase | Hooks, Components |
| Hooks | `hooks/` | Types, Utils, Supabase | Components (except via hooks) |
| Components | `components/` | Types, Utils, Hooks | API routes, Scrapers |
| Pages | `app/**/page.tsx` | Components, Hooks | Scrapers directly |
| API Routes | `app/api/**/route.ts` | Types, Utils, Supabase, Scrapers | Components, Hooks |

### Cross-Cutting Concerns

- **Auth**: Supabase Auth via middleware (`src/middleware.ts`) — auto-refreshes session on every request
- **Error Handling**: API routes return `{ error: string }` with appropriate HTTP status; client hooks handle via SWR `error` state
- **Logging**: Structured logger in `src/lib/logger.ts`

## Domain Map

### 1. Tee-Time Search (Core Domain)

The primary feature. Users search for available golf tee times across 26+ clubs.

**Data flow**: Cron trigger → `/api/scrape/cron` → `BaseScraper.run()` per club → upsert into `tee_times` table → Client fetches via `/api/tee-times` with filters → `SearchSection` renders results

**Key files**:
- `src/lib/scrapers/base.ts` — Abstract scraper with login, parsing, cookie management
- `src/lib/scrapers/index.ts` — Registry of all 27 scrapers
- `src/app/api/tee-times/route.ts` — Query endpoint with date/club/time/price filters
- `src/components/search/SearchSection.tsx` — Main search UI orchestrator

### 2. Golf Club Registry

Static + dynamic club data. Clubs are stored in `golf_clubs` table with metadata (URL, coordinates, scraper type).

**Key files**:
- `src/lib/constants/regions.ts` — Region mapping (5 regions, 30+ clubs)
- `src/lib/constants/club-mappings.ts` — Display name mappings
- `src/app/api/clubs/route.ts` — Club list endpoint

### 3. Favorites

Dual favorite system supporting both authenticated and anonymous users.

**Key files**:
- `src/app/api/favorites/route.ts` — User favorites (auth required)
- `src/app/api/favorites/device/route.ts` — Device-based favorites (anonymous)
- `src/hooks/useFavorites.ts` — Unified favorites hook

### 4. Weather

Golf-focused weather dashboard with hourly/daily/minutely charts.

**Key files**:
- `src/app/api/weather/route.ts` — Proxies OpenWeatherMap with Supabase caching
- `src/components/weather/WeatherDashboard.tsx` — Dashboard orchestrator
- `src/lib/utils/geohash.ts` — Geohash-based cache key generation

### 5. Authentication

Supabase Auth with session management via middleware.

**Key files**:
- `src/middleware.ts` — Session refresh + auth code redirect
- `src/lib/supabase/middleware.ts` — `updateSession()` helper
- `src/app/api/auth/callback/route.ts` — OAuth callback handler

## Database Schema

> Full reference: [docs/generated/db-schema.md](./docs/generated/db-schema.md)

**9 tables**: `golf_clubs`, `golf_club_courses`, `tee_times`, `user_profiles`, `user_favorites`, `device_favorites`, `scrape_jobs`, `scrape_club_results`, `weather_cache`

**Key relationships**:
- `tee_times.club_id` → `golf_clubs.id`
- `user_favorites.user_id` → `auth.users.id`
- `scrape_club_results.job_id` → `scrape_jobs.id`
- `weather_cache` — standalone, keyed by geohash

## External Dependencies

| Service | Purpose | Failure Impact |
|---------|---------|----------------|
| Supabase | DB + Auth | App non-functional |
| OpenWeatherMap | Weather data | Weather page unavailable |
| Golf club websites (27) | Tee-time data | Individual club data stale |
| Google Maps | Map visualization | Map component broken |
| Vercel | Hosting + Cron | App offline |
