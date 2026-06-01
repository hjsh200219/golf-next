---
created: 2026-06-01T13:25:00+09:00
project: golf-next
summary: prod에서 0건 긁히던 스크래퍼 6개(hilldeloci/skyvalley/tpcgolf/yangju/pinestone/purunsol) 진단·TDD 수리·push 완료. 남은 2개(taekwang/sungmoon) 미진단.
---

## Session Digest

프로덕션에서 0건만 반환하던 골프 티타임 스크래퍼들을 진단·수리한 세션. 사용자가 제공한 브라우저 네트워크 캡처로 각 클럽 실제 엔드포인트를 라이브 프로빙하여 실패 원인을 분류하고 TDD(Red→Green)로 고친 뒤 라이브 검증. 총 6개 클럽을 2개 커밋으로 수리: hilldeloci(API 이전)·skyvalley(로그인 경로 버그)·tpcgolf(엔드포인트 이전)·yangju(단일세션 무음실패→throw)는 f3d757e, pinestone(Next.js SPA, JSON API+Bearer)·purunsol(잘못된 POST 바디 + cheerio 단독 `<tr>` 파싱 버그)는 5b9886b. lint·tsc clean, 478 통과(+1 skip), build ok, 공용 스크래퍼 코드 무수정.

## Progress

### 완료 (FIXED + PUSHED) — 6개
- **hilldeloci** — API 이전 → `api.hilldeloci.co.kr` JSON. EMPTY 필터, course 1→Birch/2→Pine, promtnPrice(할인). (f3d757e)
- **skyvalley** — 로그인 경로 버그 `/hilldeloci/`→`/skyvalley/member/loginChk`, price td[5]→td[6](인터넷회원). (f3d757e)
- **tpcgolf** — 엔드포인트 이전 `/Inc/Time_Remaining_TimeTable_amt.asp`, dashed date, 멀티탭 dedup. *원래 "백엔드 다운=수정불가"로 오진했으나 엔드포인트 이전이었음.* (f3d757e)
- **yangju** — 단일세션 무음실패. 로그인 리다이렉트 시 throw. **retry 추가 금지.** (f3d757e)
- **pinestone** — Next.js SPA. `/api/v1/auth/login`(golfclubid:40, JWT body) → `/api/v1/booking/list/token`(Bearer), dotted date `YYYY.MM.DD`, availablePerson>0, greenFeeDiscountAmt(할인). (5b9886b)
- **purunsol** — 2버그: 잘못된 POST body(`p_golfgbn`/`p_date`dashed/`p_rmode:h`) + cheerio bare-`<tr>` 드롭(→`<table>` 래핑). 공개 페이지, 로그인 불필요. (5b9886b)

### 검증됨 (정상, 액션 불필요)
- **owners** — 깨진 게 아님. 해당일 빈자리 0/cron gap.

### 미완료 (REMAINING BROKEN — 2개, 미진단)
- **taekwang** (`src/lib/scrapers/taekwang.ts`)
- **sungmoon** (`src/lib/scrapers/sungmoon.ts`)

## Next Steps (우선순위)

1. **taekwang 진단** (P1) — 의심: SITE_MOVED(도메인 301 루프). **미검증.** live-probe 필수.
2. **sungmoon 진단** (P1) — 의심: legit-empty 또는 PT_SIGNATURE 만료 + cron gap. **미검증.** live-probe 필수.
3. **pinestone 비밀번호 로테이션** (P0 보안) — 이번 세션 채팅에 실제 pw + live JWT 노출됨.

> tpcgolf 선례: "백엔드 다운=수정불가"로 오진됐으나 실제론 엔드포인트 이전. taekwang/sungmoon 의심도 회의적으로 — live-probe로 검증 전엔 단정 금지. 진단 서브에이전트 오류율 ~50%.

각 클럽 플로우: 유저 캡처 또는 cold live-probe → 원인 확정 → 실패 테스트(Red) → 최소 수정(Green) → 라이브 검증 → tsc/lint/test → 커밋.

## Blockers

- taekwang/sungmoon 의심 진단 미검증 — 브라우저 네트워크 캡처 또는 cold live-probe 필요.
- 외부 사이트 가용성/변경 의존(스크래퍼 본질적 취약성).

## Watch Out

- **yangju 단일세션** — retry 로직 추가 금지. 재시도가 세션충돌 재유발. ([[yangju-single-session]])
- **보안 (긴급)** — 이번 세션 채팅에 pinestone 실제 비밀번호 + live JWT 붙여넣어짐. **pinestone 비밀번호 로테이션 권장.**
- **live-verify 방식** — `.env.local` 크리덴셜 + 일회용 vitest 파일(`_live-*.test.ts`). 검증 후 정리 완료. **커밋 금지.** ([[scraper-live-probe-vitest-trick]])
- **scraper 실패 계약** — 에러 시 throw, success:0 금지. ([[teetime-liveness-invariant]])
- **가격 컨벤션** — 할인가 저장(인터넷회원가/promtnPrice/greenFeeDiscountAmt), 정상가 X. ([[scraper-price-tier-convention]])
- **cheerio bare-`<tr>` 트랩** — fragment 파싱 시 `<table>` 래핑 필수. ([[cheerio-bare-tr-trap]])
- **날짜 포맷 상이** — dashed(tpcgolf/purunsol) vs dotted(pinestone). 이전된 엔드포인트는 포맷부터 확인.
- `.env*` 절대 커밋 금지.

## Files Touched

f3d757e + 5b9886b (수정·push 완료):
- `src/lib/scrapers/{hilldeloci,skyvalley,tpcgolf,yangju,pinestone,purunsol}.ts`
- `__tests__/lib/scrapers/{hilldeloci,skyvalley,tpcgolf,yangju,pinestone,purunsol}.test.ts`

다음 진단 대상(미수정): `src/lib/scrapers/{taekwang,sungmoon}.ts`
