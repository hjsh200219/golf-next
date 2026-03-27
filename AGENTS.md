# GolfShin — Agent Work Guide

How to navigate and contribute to this repository as an AI agent.

## Quick Start

1. Read [agent.md](./agent.md) for project rules and structure
2. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
3. Run `tsc --noEmit` to verify TypeScript before completing work
4. Run `npm run build` to verify production build (ignore `/login` prerender error — missing Supabase env vars at build time is expected)

## Common Tasks

### Add a New Scraper

1. Create `src/lib/scrapers/{club-id}.ts` extending `BaseScraper`
2. Implement `get clubId()` and `scrape()` methods
3. Register in `src/lib/scrapers/index.ts` → `SCRAPER_MAP`
4. Add club to `src/lib/constants/regions.ts` → `CLUB_REGION_MAP`
5. Insert club row into `golf_clubs` table (ask user for DB access)

### Add a New Page

1. Create `src/app/{route}/page.tsx` (server component by default)
2. Client interactivity → separate client component or `'use client'` directive
3. Add navigation link in `src/components/layout/MobileNav.tsx` and `Header.tsx`

### Add a New API Route

1. Create `src/app/api/{endpoint}/route.ts`
2. Use `createServerClient()` from `@/lib/supabase/server` for DB access
3. Validate request inputs, return typed JSON responses
4. API routes requiring auth: check session via Supabase middleware

### Modify Database Schema

**Requires explicit user approval.**
1. Create new migration in `supabase/migrations/`
2. Update `src/lib/types/database.ts` to match
3. Test with `supabase db push` (local) before production

## File Conventions

- **Pages**: `src/app/**/page.tsx` — Server components by default
- **API Routes**: `src/app/api/**/route.ts` — Next.js route handlers
- **Components**: `src/components/{domain}/{ComponentName}.tsx` — PascalCase
- **Hooks**: `src/hooks/use{Name}.ts` — camelCase with `use` prefix
- **Utils**: `src/lib/utils/{name}.ts` — camelCase
- **Types**: `src/lib/types/{name}.ts` — interface/type exports
- **Scrapers**: `src/lib/scrapers/{club-id}.ts` — kebab-case matching club ID

## Testing

- Unit tests: `__tests__/` mirror source structure
- Run: `npm test` (Vitest)
- Test setup: `__tests__/setup.ts`

## Environment Variables

See `.env.example` for required variables. Key groups:
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Maps**: `NEXT_PUBLIC_GOOGLE_MAP_API_KEY`
- **Weather**: `OPENWEATHERMAP_API_KEY`
- **Scraping**: `SCRAPE_API_KEY`, `GOLF_LOGIN_*` credentials

## Known Limitations

- Build always fails prerendering `/login` without Supabase env vars — this is expected
- Scrapers depend on external golf club websites — fragile by nature
- Weather cache expires based on `weather_cache.expires_at` — stale data possible if cron misses
