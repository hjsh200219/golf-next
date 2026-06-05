---
name: holeinonecloud-platform-scraper
description: holeinonecloud.com 멀티테넌트 골프 플랫폼 — JWT 로그인 + booking/list/token. 같은 플랫폼 클럽에 재사용 가능
type: reference
created: 2026-06-05
---

여러 한국 골프장이 `holeinonecloud.com` 멀티테넌트 플랫폼 위에서 돈다. 프론트 SPA = `www.<club>.co.kr`(Next.js), 데이터 API = `<club>-hp-api.holeinonecloud.com`(별도 호스트, AWS 서울). 남춘천CC(`namchuncheon_new`)가 첫 구현 — `src/lib/scrapers/namchuncheon.ts`.

**플로우 (fetch + JWT, 브라우저 불필요):**
1. `POST /api/v1/auth/login` JSON `{userId, password}` + 헤더 `golfclubid:<tenantId>` → 200, JWT는 `contents.accessToken`. (남춘천 tenantId=2)
2. `GET /api/v1/booking/list/token?bookingDate=YYYY.MM.DD&bookingQueryType=ALL` + `Authorization: Bearer <jwt>` + `golfclubid` 헤더. 날짜 **점 구분**(`2026.06.12`).
3. 응답: `contents.reservationTimeInfoList[]` — `bookingTime`(HH:MM), `courseName`, `greenFeeDiscountAmt`(할인가 저장), `eventRemark`.
4. `result.resultCode`: `SN_COMMON_000`=성공, `FM_AUTH_000`=로그인필요, `FN_COMMON_001`=파라미터오류. 비-성공 → throw.

**핵심 함정:**
- 토큰은 **Bearer 헤더**로 보내야 booking 통과. 쿠키만으론 `hole-course`(공개 메타)만 통과하고 booking은 `FM_AUTH_000`.
- `golfclubid` 헤더 필수. `Origin/Referer = www.<club>.co.kr` 필요(CORS allow-origin이 이 값).

**Why:** SPA가 JS chunk에서 plain JSON API 호출 → 브라우저 없이 fetch로 재현 가능. Playwright 미마이그레이션 클럽도 이런 식이면 fetch로 전환 가능.
**How to apply:** 다른 클럽이 같은 플랫폼이면 호스트(`<club>-hp-api.holeinonecloud.com`)+`golfclubid` tenantId만 교체. tenantId는 login 요청 캡처서 확인.
