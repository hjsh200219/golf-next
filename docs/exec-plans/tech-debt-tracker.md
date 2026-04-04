# Tech Debt Tracker — GolfShin

## Active Debt

| ID | Area | Severity | Description | Impact |
|----|------|----------|-------------|--------|
| ~~TD-001~~ | ~~Observability~~ | ~~High~~ | ~~No structured logging in API routes or scrapers~~ | ✅ Resolved 2026-03-28 |
| ~~TD-002~~ | ~~Testing~~ | ~~High~~ | ~~Low test coverage — scrapers, hooks, API routes lack unit tests~~ | ✅ Resolved 2026-03-28 |
| TD-003 | Error Handling | Medium | No React error boundaries — unhandled errors crash entire page | Poor user experience on failure |
| TD-004 | Security | Medium | No rate limiting on public API endpoints | Vulnerable to abuse |
| TD-005 | Accessibility | Medium | Missing ARIA labels, no keyboard navigation testing | Excludes users with disabilities |
| TD-006 | Performance | Low | Recharts + Google Maps loaded eagerly — no code splitting | Larger initial bundle than necessary |
| TD-007 | Build | Low | `/login` page fails prerender without Supabase env vars | Build output always shows error (cosmetic) |
| TD-008 | Scrapers | Low | User-Agent string hardcoded to Chrome 133 — will become outdated | May trigger bot detection over time |

## Resolved Debt

| ID | Area | Resolution | Date |
|----|------|------------|------|
| TD-R001 | PWA | Added next-pwa, manifest, offline fallback, icons | 2026-03-27 |
| TD-R002 | Documentation | Harness setup — full docs structure | 2026-03-27 |
| TD-R003 | Observability | Structured logger (`createLogger`) in all 11 API routes | 2026-03-28 |
| TD-R004 | Testing | 343 tests / 27 files — scrapers, hooks, components, utils | 2026-03-28 |
