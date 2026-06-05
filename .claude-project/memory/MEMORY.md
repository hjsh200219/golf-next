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

## Session 4 (2026-06-01)
- [Scraper credential env map](scraper-credential-env-map.md) — 클럽마다 다른 GOLF_LOGIN_PW* 슬롯, 소스가 authoritative
- [dategbn per club](scraper-dategbn-per-club.md) — ASP ajax_list dategbn 값 클럽별 상이 (yangju=2)
- [ASP.NET UpdatePanel postback](scraper-aspnet-updatepanel-postback.md) — postback 필요, GET은 빈 테이블, redirect:follow
- [golfzoncounty JSON API](scraper-golfzoncounty-json-api.md) — /login/userLogin + getList JSON, 구 endpoint 404
- [Upsert dedup + encoding trap](scraper-upsert-dedup-encoding-trap.md) — scrape success인데 DB 0행 = conflict 키 중복(테이블 2배 or 인코딩 깨짐)

## Session 5 (2026-06-01)
- [PostgREST partial-index upsert trap](postgrest-partial-index-upsert-trap.md) — 부분 유니크 인덱스에 .upsert는 42P10, INSERT+catch 23505 써야 함 (mock은 green/prod dead)
- [Vercel env quote trap](vercel-env-quote-trap.md) — .env.local 따옴표째 주입 시 키 손상 + env 변경은 재배포(scope=hjsh) 필요, "webhook 200인데 무응답" 진단법

## Session 6 (2026-06-02)
- [Yangju pw-expiry usable](yangju-pw-expiry-usable.md) — 양주 "비밀번호 변경기간 경과"는 로그인 실패 아님, 만료 PW로도 세션 발급·조회/예약 가능. login()은 통과+warn 처리

## Session 7 (2026-06-02)
- [Yangju bot allowlist](yangju-bot-allowlist.md) — 양주봇 사용자 추가법: username 불가, chat_id를 vercel logs warn에서 캡처→TELEGRAM_JK_ALLOWED_CHAT_IDS 콤마추가→재배포. jonnyjhkim(8407185514) 추가

## Session 8 (2026-06-05)
- [holeinonecloud platform scraper](holeinonecloud-platform-scraper.md) — 멀티테넌트 골프 플랫폼: JWT 로그인(golfclubid 헤더)→GET booking/list/token?bookingDate=Y.M.D, Bearer 필수(쿠키만으론 booking FM_AUTH_000). 남춘천=tenant 2. 같은 플랫폼 클럽 재사용 가능
