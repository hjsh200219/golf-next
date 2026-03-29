# Project Memory Index

## Session 1 (2026-03-27)
- [Region filtering architecture](architecture-region-filtering.md) — 지역 필터는 selectedClubs 파생 UI 상태
- [Scraper encoding map](scraper-encoding-map.md) — EUC-KR 4개, 나머지 UTF-8
- [SWR refresh pattern](swr-refresh-pattern.md) — isValidating 사용, dedupingInterval 5s
- [Supabase Auth redirect](supabase-auth-redirect-config.md) — Site URL은 대시보드에서만 변경
- [Vercel deployment protection](vercel-deployment-protection.md) — SSO 보호가 내부 API 차단
- [Weather coordinates](weather-data-coordinates.md) — 좌표는 courses 테이블에 있음
- [scraped_at UPSERT](scraped-at-upsert-behavior.md) — UPSERT 시 scraped_at 명시 필수

## Session 2 (2026-03-28)
- [UI preferences Zustand slice](ui-preferences-zustand-slice.md) — viewMode는 별도 slice에서 관리
- [Event display filtering](event-display-filtering-logic.md) — 할인/정보/쓰레기 분류 로직
- [Date tabs next-day focused](date-tabs-next-day-focused.md) — 내일/모레/글피 (당일 제외)
- [Cron scraping interval](cron-scraping-interval.md) — 1시간 간격 (0 * * * *)
- [PWA icon iOS transparency](pwa-icon-ios-transparency.md) — iOS 아이콘 흰색 배경 flatten 필수
- [Env file unified](env-file-unified.md) — .env 단일 파일 사용

## Session 3 (2026-03-29)
- [WAF/Cloud IP blocking](scraper-waf-cloud-ip-blocking.md) — bearcreek/bearsbest WAF + Railway 해외IP 차단
- [GA Korea TLS+params](scraper-gakorea-tls-params.md) — SSL 우회 + API 파라미터 필수
- [OrangeDunesYJ auth](scraper-orangedunesyj-auth.md) — device헤더 + 쿠키세션 + month=현재월
- [LassaGC Spring Boot](scraper-lassagc-spring-boot.md) — ASP→Spring Boot 재구축, 계정 재등록 필요
- [Jungbu site rebuilt](scraper-jungbu-site-rebuilt.md) — 사이트 재구축, 로그인 404
