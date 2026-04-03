# Security — GolfShin

## Authentication

- **Provider**: Supabase Auth (OAuth)
- **Session**: Managed via `@supabase/ssr` middleware
- **Refresh**: Auto-refreshed on every request via `middleware.ts`
- **Callback**: `/api/auth/callback` handles OAuth code exchange

## Authorization

### API Route Protection

| Route | Auth Required | Notes |
|-------|--------------|-------|
| `GET /api/tee-times` | No | Public data |
| `GET /api/clubs` | No | Public data |
| `GET /api/weather` | No | Public data |
| `GET /api/favorites` | Yes | User-specific |
| `GET /api/favorites/device` | No | Device UUID based |
| `GET /api/scrape/cron` | Bearer token | `CRON_SECRET` via Authorization header |
| `POST /api/scrape/club` | API key | `SCRAPE_API_KEY` header |
| `GET /api/scrape/status` | No | Scrape job status |
| `POST /api/refresh` | No | Manual scrape trigger (rate-limited) |

### Row-Level Security (RLS)

RLS policies are defined in `supabase/migrations/001_initial_schema.sql`:

- **`user_favorites`**: Users can only CRUD their own favorites (`auth.uid() = user_id`)
- **`user_profiles`**: Users can only read/update their own profile
- **`tee_times`**: Public read, service-role insert/update/delete
- **`golf_clubs`**: Public read, service-role write
- **`device_favorites`**: No RLS (anonymous access by device UUID)

## Secrets Management

### Environment Variables (`.env.example`)

| Variable | Sensitivity | Exposure |
|----------|------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Low | Client-side (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Low | Client-side (public, RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Critical** | Server-only |
| `SCRAPE_API_KEY` | High | Server-only |
| `GOLF_LOGIN_*` | **Critical** | Server-only (club login credentials) |
| `OPENWEATHERMAP_API_KEY` | Medium | Server-only |
| `NEXT_PUBLIC_GOOGLE_MAP_API_KEY` | Low | Client-side (domain-restricted) |
| `CRON_SECRET` | High | Server-only (Vercel Cron auth) |
| `APP_URL` | Low | Server-only (internal API base URL) |

### Rules

1. **Never log credentials** — `GOLF_LOGIN_*` vars contain real user accounts
2. **Never expose service role key** — bypasses all RLS
3. **API key validation** — scrape endpoints must validate `SCRAPE_API_KEY`
4. **Supabase anon key is safe client-side** — RLS enforces access control

## Middleware Security

```
Middleware matcher excludes: _next/static, _next/image, favicon, static assets
All other routes: Supabase session refresh + auth code redirect
```

## Scraper Security Considerations

- Scrapers use real golf club login credentials — handle with extreme care
- Cookie jars are per-request (not shared between scrapers)
- User-Agent spoofing is intentional (mimics Chrome browser)
- Rate limiting: scrape cron runs on schedule, not user-triggered
