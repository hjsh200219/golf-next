---
created: 2026-06-01T13:05:00+09:00
project: golf-next
summary: prod에서 0행/실패하던 골프장 스크래퍼 9개 중 4개(hilldeloci/skyvalley/tpcgolf/yangju) 진단·수리·push 완료(f3d757e). 남은 4개 미진단.
---

## Session Digest

prod에서 0건 반환/실패하던 골프장 티타임 스크래퍼를 진단·수리했다. prod `scrape_club_results` 쿼리로 문제 클럽 9개를 찾고(최신 스크래프 2026-06-01 02:00 UTC), 각 broken 클럽의 실제 엔드포인트를 cold 라이브 프로빙해 "사이트 이동" vs "조용한 실패(silent zero)"를 구분하는 방식으로 원인을 좁혔다. 4개 수리 완료, 전부 TDD(Red→Green) + 라이브 사이트 검증. 커밋 `f3d757e` push 완료.

## Progress

**완료 (커밋 `f3d757e`, push 완료)** — 9개 문제 클럽 중 4개 수리, 전부 TDD + 라이브 검증:
- **hilldeloci** — 사이트 이전(skyvalley.co.kr/hilldeloci HTML → `api.hilldeloci.co.kr` 공개 JSON API). 캘린더 API로 재작성, `timeStatus==EMPTY` 필터, `resveCourse` 1→Birch/2→Pine 매핑, 할인가(`promtnPrice`) 저장, courseClass P+B union+timeId dedup. 라이브 34행.
- **skyvalley** — 사이트 이전 아님, **로그인 경로 버그**. J35 로그인이 hilldeloci 경로로 돼 세션이 skyvalley 예약 컨텍스트에 안 붙어 silent-zero. 로그인 `/skyvalley/member/loginChk`로 수정, 가격 td[5] 정상가 → td[6] 인터넷회원가(할인). 라이브 마운틴 08:50 170000.
- **tpcgolf** — 백엔드 다운 아님, **엔드포인트 이전**. 구 `/Reservation/Inc/TimeTable_Amt.asp`(500) → 신 `/Inc/Time_Remaining_TimeTable_amt.asp`(dashed date YYYY-MM-DD 요구). 응답 4탭(All=union), 5-cell 행만 파싱 + course+time dedup. 라이브 7행.
- **yangju** — 스크래퍼 로직 정상, prod 0은 **silent failure**. 단일세션 정책으로 재로그인 시 500→login.asp 리다이렉트를 0행으로 오인하고 success:0 보고. 이제 로그인 리다이렉트 응답에 throw → prod가 scrape failed로 마킹(liveness invariant 준수), 다음 cron이 cold 재시도. login-OK-but-empty는 여전히 `[]`.

검증: lint clean, tsc clean, 474 tests pass(+1 skip), build ok. 공유 스크래퍼 코드 미변경 → 정상 25개 클럽 무영향.

**조사 결과 조치 불필요**: **owners** — broken 아님. 해당 일자 cron gap/빈 결과였을 뿐. 라이브 로그인 검증 시 2건 정상 조회. 액션 없음.

**미완료** — 남은 broken 클럽 4개(Next Steps). 모두 진단/수리 전.

## Next Steps

전제: 아래 의심 진단은 **전부 미검증**. tpcgolf가 "백엔드 다운"으로 의심됐다가 실제론 엔드포인트 이전이었듯, 진단 서브에이전트 오류율 ~50%. 각 클럽은 **단정 전 cold live-probe부터** 할 것 (방법: [[scraper-live-probe-vitest-trick]]).

1. **pinestone** (`src/lib/scrapers/pinestone.ts`) — 의심: SITE_MOVED (Next.js SPA 재구축, 구 ASP 엔드포인트 404). 미검증.
2. **purunsol** (`src/lib/scrapers/purunsol.ts`) — 의심: SITE_MOVED (AJAX `.asmx` deprecated, 302→에러페이지). 미검증.
3. **taekwang** (`src/lib/scrapers/taekwang.ts`) — 의심: SITE_MOVED (도메인 301 redirect loop). 미검증.
4. **sungmoon** (`src/lib/scrapers/sungmoon.ts`) — 의심: EMPTY-legit 또는 만료 PT_SIGNATURE + cron gap(48h 기록 없음). 미검증.

각 클럽 플로우: cold live-probe → 실제 원인 확정 → 실패 테스트(Red) → 최소 수정(Green) → 라이브 검증 → tsc/lint/test → 커밋.

## Blockers

- 코드 측 블로커 없음.
- 진단 서브에이전트 신뢰 불가(오류율 ~50%) — 의심 라벨을 근거로 삼지 말 것. 매 클럽 직접 live-probe 필수.
- 라이브 검증은 외부 사이트 가용성/변경에 취약(스크래퍼 본질적 취약성).

## Watch Out

- **yangju 단일세션 정책**: 활성 세션 중 재로그인 → 서버 500(`80040e14`). 수정본은 로그인 리다이렉트에 throw. **즉시 재시도(immediate retry) 절대 추가 금지** — 세션 충돌 악화. cold cron 재시도에 맡긴다. ([[yangju-single-session]])
- **scraper 실패 계약**: 에러 시 throw, success:0 금지 — silent-zero가 liveness invariant 깨뜨림. login-OK-empty만 `[]`. ([[teetime-liveness-invariant]])
- **라이브 검증 방식**: `.env.local` 실제 크리덴셜 + 일회용 throwaway vitest 파일(`_live-*.test.ts`). 임시 파일 정리 필수 — 커밋 금지. ([[scraper-live-probe-vitest-trick]])
- **가격 티어**: 할인가 저장(인터넷회원가/promtnPrice), 정상가 X. ([[scraper-price-tier-convention]])
- `.env*` 절대 커밋 금지.

## Files Touched

커밋 `f3d757e` (8 files):
- `src/lib/scrapers/hilldeloci.ts` (재작성)
- `src/lib/scrapers/skyvalley.ts` (로그인 경로 + price col)
- `src/lib/scrapers/tpcgolf.ts` (endpoint + dashed date + dedup)
- `src/lib/scrapers/yangju.ts` (login-redirect throw)
- `__tests__/lib/scrapers/hilldeloci.test.ts` (신규)
- `__tests__/lib/scrapers/skyvalley.test.ts` (신규)
- `__tests__/lib/scrapers/tpcgolf.test.ts` (재작성)
- `__tests__/lib/scrapers/yangju.test.ts` (redirect 테스트 추가)

다음 작업 대상(미수정): `src/lib/scrapers/{pinestone,purunsol,taekwang,sungmoon}.ts`
