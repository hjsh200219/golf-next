---
created: 2026-06-05T14:30:00+09:00
project: golf-next
summary: 남춘천CC 스크래퍼 구현·활성화 (미구현 4개 중 1개 마이그레이션, 3개 defer)
---

## Session Digest

미구현 골프장 4개(fortunehills, namchuncheon_new, lakeside_new, namyeoju) 스크래퍼 마이그레이션 시도. 라이브 프로브(실제 로그인+데이터 요청)로 실현 가능성 판정 → **남춘천CC(namchuncheon_new) 1개만 구현 성공**, 나머지 3개는 봇/로그인 차단으로 defer. 커밋 `20bd0de` push 완료(origin/main).

남춘천은 `holeinonecloud.com` 멀티테넌트 플랫폼 REST API 사용: `POST /api/v1/auth/login`(JSON `{userId,password}`, 헤더 `golfclubid:2`) → JWT(`contents.accessToken`) → `GET /api/v1/booking/list/token?bookingDate=YYYY.MM.DD&bookingQueryType=ALL`(Bearer). 할인가(`greenFeeDiscountAmt`) 저장. 라이브 18행 수집 검증 완료.

## Progress

**완료**
- `src/lib/scrapers/namchuncheon.ts` 구현 (clubId `namchuncheon_new`)
- TDD 테스트 `__tests__/lib/scrapers/namchuncheon.test.ts` (5 tests: 로그인/booking요청/파싱/throw 2종)
- `index.ts` SCRAPER_MAP + `regions.ts` CLUB_REGION_MAP(강원) 등록
- `base.test.ts` 스크래퍼 카운트 33→34
- **DB 활성화**: `golf_clubs` `namchuncheon_new` → `is_active=true, scraper_type=requests` (Supabase 프로덕션 PATCH 실행 완료)
- 검증: lint ✅ / tsc ✅ / test 564 ✅ / build ✅
- 라이브 실주행 검증: 셸 클래스로 실제 API 호출 → 18행 수집 확인
- 문서: `docs/UNIMPLEMENTED_CLUBS.md` 갱신(7→6), `docs/PLANS/2026-06-05-migrate-4-unimplemented-scrapers.md` 플랜, `AGENTS.md` 한글 응답 규칙
- 커밋·푸시 완료 (`20bd0de`)

**미완료 (defer)**
- fortunehills, lakeside_new, namyeoju — 구현 불가 판정, UNIMPLEMENTED_CLUBS.md에 근거 기록

## Next Steps

1. **남춘천 cron 실수집 확인** — 다음 정시(`0 * * * *`)부터 자동 수집. `tee_times` 테이블에 `club_id='namchuncheon_new'` 행이 실제로 upsert되는지, `scrape_club_results`에서 success인지 확인.
2. course명 영문 표기 검토 — 현재 `Victory`/`Challenge` 영문 그대로 저장됨. UI/다른 클럽과 일관성 위해 한글화 필요한지 판단.
3. (선택) CLAUDE.md/AGENTS.md 본문의 "33 club scrapers/websites" 문구 → 34로 갱신(문서 수치만).

## Blockers

- 없음. (남춘천 완료, 나머지 3개는 의도적 defer)

## Watch Out

- **남춘천 JWT 만료**: accessToken exp 24h. 스크래퍼는 매 실행 재로그인하므로 문제 없음. 로그인 실패 시 `throw`(liveness invariant 준수) → cron에서 failed 기록.
- **holeinonecloud 플랫폼 재사용 가능**: 다른 클럽이 같은 플랫폼이면 호스트(`<club>-hp-api.holeinonecloud.com`)+`golfclubid` tenantId만 교체. 메모리 `holeinonecloud-platform-scraper` 참고.
- **defer 3개는 "브라우저로도 클라우드 불가"**: fortunehills(Cloudflare), lakeside(reCAPTCHA+Imperva), namyeoju(비회원·빈사이트). bearcreek/bearsbest 동급. fetch로는 불가.
- 회원 정보: inter349 공유 계정 = fortunehills·lakeside·남춘천 회원, 남여주 비회원.

## Files Touched

- `src/lib/scrapers/namchuncheon.ts` (신규)
- `src/lib/scrapers/index.ts`
- `src/lib/constants/regions.ts`
- `__tests__/lib/scrapers/namchuncheon.test.ts` (신규)
- `__tests__/lib/scrapers/base.test.ts`
- `docs/UNIMPLEMENTED_CLUBS.md`
- `docs/PLANS/2026-06-05-migrate-4-unimplemented-scrapers.md` (신규)
- `AGENTS.md`
- (DB) `golf_clubs` 테이블 `namchuncheon_new` row UPDATE
