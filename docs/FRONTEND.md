# Frontend Guide — GolfShin

## Component Inventory

### Layout (`components/layout/`)
| Component | Type | Description |
|-----------|------|-------------|
| `Header` | Server | Top navigation bar with logo |
| `MobileNav` | Client | Bottom tab navigation (mobile only, hidden on `md:`) |

### Search (`components/search/`)
| Component | Type | Description |
|-----------|------|-------------|
| `SearchSection` | Client | Main search orchestrator — date tabs, filters, results |
| `FilterPanel` | Client | Collapsible filter container |
| `RegionFilter` | Client | Region-based club filtering (5 regions) |
| `ClubFilter` | Client | Individual club selection |
| `TimeFilter` | Client | Time range slider |
| `PriceFilter` | Client | Price range slider |
| `SearchBar` | Client | Text search input |

### Results (`components/results/`)
| Component | Type | Description |
|-----------|------|-------------|
| `TeeTimeTable` | Client | Main results table (uses @tanstack/react-table) |
| `TeeTimeCard` | Client | Mobile card view for tee-time result |
| `ResultSummary` | Client | Count + filter summary bar |
| `LoadingState` | Server | Shimmer loading skeleton |

### Map (`components/map/`)
| Component | Type | Description |
|-----------|------|-------------|
| `GolfMap` | Client | Google Maps with club markers |
| `ClubMarker` | Client | Individual club pin |
| `MapTooltip` | Client | Hover tooltip for club info |

### Weather (`components/weather/`)
| Component | Type | Description |
|-----------|------|-------------|
| `WeatherDashboard` | Client | Weather page orchestrator |
| `HourlyChart` | Client | 48h hourly temperature/precipitation (Recharts) |
| `DailyChart` | Client | 7-day forecast chart |
| `HourlyTable` | Client | Detailed hourly data table |
| `MinutelyChart` | Client | 1-hour minutely precipitation |

### Auth (`components/auth/`)
| Component | Type | Description |
|-----------|------|-------------|
| `AuthGuard` | Client | Protected route wrapper |
| `LoginButton` | Client | Supabase OAuth trigger |

### Favorites (`components/favorites/`)
| Component | Type | Description |
|-----------|------|-------------|
| `FavoriteClubList` | Client | User's favorite clubs list |
| `FavoriteToggle` | Client | Star/heart toggle button |

## Custom Hooks

| Hook | Purpose | Data Source |
|------|---------|-------------|
| `useTeeTimes` | Fetch filtered tee-times | `/api/tee-times` via SWR |
| `useClubs` | Fetch club list | `/api/clubs` via SWR |
| `useWeather` | Fetch weather data | `/api/weather` via SWR |
| `useFavorites` | Manage favorites (auth + device) | `/api/favorites` via SWR |
| `useAuth` | Auth state + user session | Supabase client |
| `useDeviceId` | Anonymous device UUID | localStorage |
| `useFilters` | Search filter state | Zustand store |

## Data Fetching Pattern

```
SWR hook → API route → Supabase query → Response
```

- **SWR** for all client data fetching (auto-revalidation, cache, error handling)
- **Zustand** for client-only UI state (filters, preferences)
- **No SSR data fetching** on dynamic pages — all data loaded client-side via SWR

## Layout Structure

```
<html lang="ko">
  <body>
    <Header />                    ← Sticky top nav
    <main max-w-6xl px-4>         ← Content area
      {children}
    </main>
    <MobileNav />                 ← Fixed bottom nav (mobile)
  </body>
</html>
```

- `pb-24` on main for mobile bottom nav clearance
- `md:pb-8` on desktop (no bottom nav)
