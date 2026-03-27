# Database Schema — GolfShin

> Auto-generated from `supabase/migrations/001_initial_schema.sql`

## Tables

### `golf_clubs`
Primary registry of golf courses.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT | PK | — | Club identifier (e.g., `ga`, `skyvalley`) |
| `name` | TEXT | NOT NULL | — | Internal name |
| `display_name` | TEXT | YES | NULL | User-facing display name |
| `url` | TEXT | YES | — | Club website URL |
| `origin` | TEXT | YES | NULL | Origin header for scraping |
| `referer_login` | TEXT | YES | NULL | Referer for login requests |
| `referer_reservation` | TEXT | YES | NULL | Referer for reservation pages |
| `login_path` | TEXT | YES | NULL | Login endpoint path |
| `reservation_path` | TEXT | YES | NULL | Reservation page path |
| `address` | TEXT | YES | NULL | Physical address |
| `lat` | DOUBLE PRECISION | YES | NULL | Latitude |
| `lon` | DOUBLE PRECISION | YES | NULL | Longitude |
| `scraper_type` | TEXT | NOT NULL | `'requests'` | Scraper implementation type |
| `is_active` | BOOLEAN | NOT NULL | `true` | Whether club is actively scraped |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last update time |

### `golf_club_courses`
Individual courses within a club.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | PK | auto | Auto-increment ID |
| `club_id` | TEXT | NOT NULL | — | FK → `golf_clubs.id` (CASCADE) |
| `course_name` | TEXT | NOT NULL | — | Course name |
| `course_code` | TEXT | YES | NULL | Internal course code |
| `lat` | DOUBLE PRECISION | YES | NULL | Latitude |
| `lon` | DOUBLE PRECISION | YES | NULL | Longitude |
| `address` | TEXT | YES | NULL | Course address |
| `is_active` | BOOLEAN | NOT NULL | `true` | Active flag |

### `tee_times`
Core data table — scraped tee-time slots.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGSERIAL | PK | auto | Auto-increment ID |
| `club_id` | TEXT | NOT NULL | — | FK → `golf_clubs.id` (CASCADE) |
| `cc_name` | TEXT | YES | — | Club display name at scrape time |
| `date` | DATE | NOT NULL | — | Tee-time date |
| `teeoff` | TIME | NOT NULL | — | Tee-off time |
| `course` | TEXT | YES | NULL | Course name |
| `price` | INTEGER | YES | NULL | Green fee in KRW |
| `event` | TEXT | YES | NULL | Special event/promotion text |
| `scraped_at` | TIMESTAMPTZ | NOT NULL | `now()` | When data was scraped |

**Unique constraint**: `(club_id, date, teeoff, course)` — prevents duplicate slots.

### `user_profiles`
Authenticated user profile data.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | PK | — | FK → `auth.users.id` (CASCADE) |
| `display_name` | TEXT | YES | NULL | User display name |
| `phone` | TEXT | YES | NULL | Phone number |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Profile creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last update |

### `user_favorites`
Authenticated user favorite clubs.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | PK | auto | Auto-increment ID |
| `user_id` | UUID | NOT NULL | — | FK → `auth.users.id` (CASCADE) |
| `club_id` | TEXT | NOT NULL | — | FK → `golf_clubs.id` (CASCADE) |

**Unique constraint**: `(user_id, club_id)`

### `device_favorites`
Anonymous device-based favorites.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | PK | auto | Auto-increment ID |
| `device_id` | TEXT | NOT NULL | — | Client-generated UUID |
| `club_id` | TEXT | NOT NULL | — | FK → `golf_clubs.id` (CASCADE) |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | When favorited |
| `last_accessed_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last access time |

**Unique constraint**: `(device_id, club_id)`

### `scrape_jobs`
Tracks scraping batch runs.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | PK | auto | Job ID |
| `date` | DATE | NOT NULL | — | Target scrape date |
| `status` | TEXT | NOT NULL | `'pending'` | Job status |
| `total_clubs` | INTEGER | NOT NULL | `0` | Total clubs to scrape |
| `completed_clubs` | INTEGER | NOT NULL | `0` | Clubs completed |
| `failed_clubs` | TEXT[] | YES | NULL | Array of failed club IDs |
| `started_at` | TIMESTAMPTZ | YES | NULL | Job start time |
| `completed_at` | TIMESTAMPTZ | YES | NULL | Job completion time |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Record creation |

### `scrape_club_results`
Per-club scrape results within a job.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | PK | auto | Result ID |
| `job_id` | INTEGER | NOT NULL | — | FK → `scrape_jobs.id` |
| `club_id` | TEXT | NOT NULL | — | Club identifier |
| `status` | TEXT | NOT NULL | `'pending'` | Scrape status |
| `error_message` | TEXT | YES | NULL | Error details if failed |
| `tee_time_count` | INTEGER | NOT NULL | `0` | Number of tee-times found |
| `duration_ms` | INTEGER | YES | NULL | Scrape duration in ms |
| `scraped_at` | TIMESTAMPTZ | NOT NULL | `now()` | Scrape timestamp |

### `weather_cache`
Cached weather API responses.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | PK | auto | Cache entry ID |
| `geohash` | TEXT | NOT NULL | — | Location geohash key |
| `lat` | DOUBLE PRECISION | NOT NULL | — | Latitude |
| `lon` | DOUBLE PRECISION | NOT NULL | — | Longitude |
| `data_type` | TEXT | NOT NULL | — | Weather data type |
| `data` | JSONB | NOT NULL | — | Weather API response |
| `cached_at` | TIMESTAMPTZ | NOT NULL | `now()` | When cached |
| `expires_at` | TIMESTAMPTZ | NOT NULL | — | Cache expiration |

## Entity Relationships

```
auth.users ──1:1──→ user_profiles
auth.users ──1:N──→ user_favorites ──N:1──→ golf_clubs
golf_clubs ──1:N──→ golf_club_courses
golf_clubs ──1:N──→ tee_times
golf_clubs ──1:N──→ device_favorites
scrape_jobs ──1:N──→ scrape_club_results
weather_cache (standalone, keyed by geohash)
```

## Extensions

- `uuid-ossp` — UUID generation
- `pg_trgm` — Trigram text search
