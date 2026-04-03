# Product Sense — GolfShin

## Product Vision

GolfShin aggregates real-time tee-time availability across 34 Korean golf courses into a single searchable interface. The core value proposition: **save golfers hours of checking individual club websites**.

## Target Users

### Primary: Weekend Golfer (주말 골퍼)
- Age 30-60, plays 1-4 rounds/month
- Checks multiple clubs to find available times
- Price-sensitive, compares rates across clubs
- Mobile-first usage (checking while commuting)

### Secondary: Golf Group Organizer (조 편성자)
- Books for groups of 4
- Needs specific time slots (early morning preferred)
- Values region filtering (commute distance matters)
- Uses favorites to track preferred clubs

## Core User Journeys

### 1. Quick Search (80% of usage)
```
Open app → Select date tab (tomorrow/+2/+3) → Scan results → Tap club to book
```
- Must complete in <10 seconds
- Date tabs are the primary navigation (not calendar picker)
- Results sorted by time, filterable by region/club/price

### 2. Filtered Search
```
Open app → Select date → Filter by region → Filter by time range → Filter by price → Review results
```
- Region filter is most-used (경기북부 vs 경기남부 vs 강원)
- Price filter helps budget-conscious golfers

### 3. Weather Check
```
Open app → Navigate to weather → Check hourly forecast → Decide whether to book
```
- Weather affects booking decisions heavily
- 48-hour hourly forecast is the key data point

### 4. Favorite Clubs
```
Star favorite clubs → Next visit: filter by favorites only → Quick access to preferred clubs
```
- Anonymous users get device-based favorites (no login required)
- Logged-in users get synced favorites across devices

## Product Principles

1. **Speed over features** — Fast load, fast results. No unnecessary UI chrome.
2. **Korean-first** — All UI in Korean. Korean typography rules (`keep-all`). Korean date/time formats.
3. **Mobile-first** — Bottom navigation, touch-friendly targets, responsive tables.
4. **Data freshness** — Hourly scrape intervals (`0 * * * *`). Show `scraped_at` timestamp. Never serve stale data silently.
5. **Zero-friction start** — No login required for core search. Favorites work anonymously via device ID.

## Success Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| Time to first result | <3s | Users abandon after 3s |
| Search-to-booking rate | Track clicks to club URLs | Core conversion metric |
| Return rate (7-day) | >40% | Sticky product indicator |
| Mobile usage share | >70% | Confirms mobile-first bet |
