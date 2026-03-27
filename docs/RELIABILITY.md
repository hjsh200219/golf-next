# Reliability — GolfShin

## Service Dependencies

| Service | Failure Mode | Impact | Mitigation |
|---------|-------------|--------|------------|
| Supabase | DB down | App non-functional | PWA offline page, Vercel status monitoring |
| OpenWeatherMap | API timeout | Weather unavailable | Supabase cache serves stale data |
| Golf club sites | Site changes/down | Individual club stale | Per-club error tracking in `scrape_club_results` |
| Google Maps | API quota | Map broken | Graceful fallback (hide map) |
| Vercel | Platform down | App offline | Service worker serves cached pages |

## Scraper Resilience

- Each scraper runs independently — one club failure doesn't affect others
- `scrape_jobs` tracks batch status with `failed_clubs` array
- `scrape_club_results` records per-club error messages and duration
- Cookie jar is per-request — no shared state between scraper runs
- `BaseScraper.run()` wraps `scrape()` in try/catch — always returns `ScraperResult`

## Caching Strategy

| Data | Cache Location | TTL | Refresh |
|------|---------------|-----|---------|
| Tee-times | Supabase `tee_times` | Until next scrape | Cron every 5 min |
| Weather | Supabase `weather_cache` | `expires_at` field | On-demand via API |
| Club list | Supabase `golf_clubs` | Rarely changes | Manual update |
| Static assets | Service worker | Build-time | On new deploy |
| API responses | SWR client cache | Configurable | Auto-revalidate |

## Known Reliability Gaps

1. **No health check endpoint** — cannot programmatically verify app health
2. **No alerting** — scraper failures are only visible in DB
3. **No retry logic** — failed scrapes wait for next cron cycle
4. **No circuit breaker** — scrapers will keep trying even if club site is consistently down
