# Layer Dependency Rules

## Layer Hierarchy (top = most restricted)

```
1. Types         (lib/types/)        — pure type definitions
2. Constants     (lib/constants/)    — static data, may use Types
3. Utils         (lib/utils/)        — pure functions, may use Types + Constants
4. Supabase      (lib/supabase/)     — DB client, may use Types
5. Scrapers      (lib/scrapers/)     — server-only, may use Types + Utils
6. Hooks         (hooks/)            — client-only, may use Types + Utils + Supabase
7. Components    (components/)       — React UI, may use Types + Utils + Hooks
8. Pages         (app/**/page.tsx)   — compose Components
9. API Routes    (app/api/)          — server-only, may use Types + Utils + Supabase + Scrapers
```

## Forbidden Imports

| From → To | Why |
|-----------|-----|
| Types → anything | Types must be pure, no runtime dependencies |
| Constants → Hooks/Components | Constants are static data, not reactive |
| Utils → Hooks/Components | Utils are pure functions, no React dependency |
| Scrapers → Components/Hooks | Scrapers are server-only |
| Hooks → API routes | Hooks are client-only |
| Components → Scrapers | Components are client-side |
| API Routes → Hooks/Components | API routes are server-only |

## Allowed Cross-Domain Imports

| Pattern | Example | Allowed? |
|---------|---------|----------|
| Component imports hook | `SearchSection` → `useTeeTimes` | Yes |
| Hook imports util | `useWeather` → `geohash.ts` | Yes |
| API route imports scraper | `scrape/route.ts` → `SCRAPER_MAP` | Yes |
| Scraper imports util | `base.ts` → `cheerio` | Yes |
| Component imports scraper | `SearchSection` → `base.ts` | **No** |

## Lint Error Messages

When a layer violation is detected, the fix guidance should be:

- **"Component importing scraper"**: Move the data fetching to an API route. The component should call the API route via a hook.
- **"Hook importing API route"**: Hooks should call API routes via `fetch()`, not import them directly.
- **"API route importing component"**: API routes are server-side. Extract shared logic to `lib/utils/`.
