# Frontend Guide — GolfShin

## 공통 금지 사항

- **이모지를 UI 아이콘으로 사용 금지.** OS/브라우저마다 렌더링이 다르고, 텍스트와 간격이 맞지 않음. SVG 아이콘 또는 Remixicon 사용.
- **미구현 페이지로 링크 금지.** 페이지가 없으면 disabled 처리 + "준비 중" 태그 표시.
- **E2E 테스트는 로그인/비로그인 두 상태 모두 검증.**
- **디자인 리뷰 시 모든 상태의 스크린샷 확인 필수.**


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
