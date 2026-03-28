# Project Memory Index

- [Region filtering architecture](architecture-region-filtering.md) — 지역 필터는 selectedClubs 파생 UI 상태, 별도 저장 안함
- [Scraper encoding map](scraper-encoding-map.md) — EUC-KR 4개(edenblue, pinestone, rainbowhills, tpcgolf), 나머지 UTF-8
- [SWR refresh pattern](swr-refresh-pattern.md) — isValidating 사용, dedupingInterval 5s로 수동 새로고침 지원
- [Supabase Auth redirect](supabase-auth-redirect-config.md) — Site URL은 대시보드에서만 변경 가능
- [Vercel deployment protection](vercel-deployment-protection.md) — SSO 보호가 내부 API 차단, 안정 alias 사용
- [Weather coordinates](weather-data-coordinates.md) — 좌표는 courses 테이블에 있음 (golf_clubs 아님)
- [scraped_at UPSERT](scraped-at-upsert-behavior.md) — UPSERT 시 scraped_at 명시적 포함 필수
