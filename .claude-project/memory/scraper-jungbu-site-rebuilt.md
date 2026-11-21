---
name: scraper-jungbu-site-rebuilt
description: 중부CC는 「더 시에나 서울CC」(thesiena.co.kr)로 개명 — 옛 도메인 akdjbcc.co.kr 은 Cloudflare 530/1016, 새 사이트·API 는 Cloudflare 관리형 챌린지 + 로그인 필요라 서버 수집 불가(2026-11-21)
type: reference
created: 2026-03-29
updated: 2026-11-21
---

- 옛 도메인 `akdjbcc.co.kr`(→ `akdjbcc.greenit.cc`)은 사이트 전체가 HTTP 530 `error code: 1016`(Cloudflare 원본 DNS 오류). 2026-03 의 「로그인 404」는 그 전 증상.
- 같은 주소(경기 광주 곤지암읍 경충대로 451)는 「더 시에나 서울 컨트리클럽」(회원제)으로 개명 — 홈페이지가 「구, 곤지암 중부CC」라고 밝힌다. 예약 앱은 시에나 그룹 공용 SPA(`/app/booking/gateway?type=reserve`, API base `https://thesiena.co.kr/api/v2`, 티타임 `GET /golf/reservation-times/alt`·`/golf/guest/reservation-times/alt`, 로그인 `POST /auth/login`, 예약 단계 Turnstile `golf-vx/human-check`).
- 서버 요청(curl·node fetch)은 페이지·API 모두 HTTP 403 `cf-mitigated: challenge`(Cloudflare 관리형 챌린지). 실제 Chrome 으로만 열린다. 비로그인으로 예약 시작 시 「로그인 후 이용가능한 서비스입니다」.

**Why:** 코드 버그가 아니라 골프장 개명·사이트 이전·봇 차단이 원인. Vercel 스크래퍼(fetch)로는 챌린지를 못 넘는다(포천힐스와 같은 유형).
**How to apply:** jungbu 를 살리려면 서버 fetch 가 아니라 실제 브라우저(로그인된 세션)로 수집하는 별도 경로가 필요하다. 그 전까지 `golf_clubs.jungbu` 는 `is_active=false` 유지.
