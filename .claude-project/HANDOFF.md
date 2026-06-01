---
created: 2026-06-01T14:00:00+09:00
project: golf-next
summary: prod에서 0건 긁히던 broken 스크래퍼 9종 전부 해결(7종 수리·owners 정상·sungmoon 제거). 코드 완료·push. 남은 건 Vercel env 등록 + pinestone pw 로테이션뿐.
---

## Session Digest

prod에서 0건 반환하던 골프 티타임 스크래퍼를 진단·수리한 멀티커밋 세션. 사용자가 브라우저 네트워크 캡처를 제공 → 각 클럽 실제 엔드포인트 라이브 프로빙 → 원인 분류 → TDD(Red→Green) → 라이브 검증 방식. 3개 커밋(`f3d757e`·`5b9886b`·`68aa7f8`)으로 최초 지목된 broken 9종 전부 해결: 7종 수리, owners 정상 확인, sungmoon 제거(중복). 진단 서브에이전트 라벨은 거의 100% 오답 — 실제 원인은 전부 라이브 프로빙으로 규명. lint·tsc clean, 481 tests pass(+1 skip), build ok.

## Progress

### 완료 (9/9 — 원래 broken 클럽 전부 해결)
| 클럽 | 원인 → 수정 | 커밋 |
|------|------------|------|
| **hilldeloci** | API 이전 → `api.hilldeloci.co.kr` JSON, EMPTY 필터, course 1→Birch/2→Pine, promtnPrice | f3d757e |
| **skyvalley** | 로그인 경로 `/hilldeloci/`→`/skyvalley/member/loginChk`, price td[5]→td[6](인터넷회원) | f3d757e |
| **tpcgolf** | 엔드포인트 이전 `/Inc/Time_Remaining_TimeTable_amt.asp`, dashed date, 멀티탭 dedup | f3d757e |
| **yangju** | 단일세션 무증상실패 → login-redirect 시 throw, **재시도 금지** | f3d757e |
| **pinestone** | Next.js SPA → `/api/v1` JSON + JWT Bearer, dotted date, availablePerson>0 | 5b9886b |
| **purunsol** | 잘못된 POST body + cheerio bare-`<tr>`→`<table>` 래핑, 공개(로그인 불필요) | 5b9886b |
| **taekwang** | Next.js SPA → `/api/auth/login`(env 정적 암호화 blob) + `/reservation/realtime` Server Action RSC, M+P 2콜, courseCode 11/22/33/44 매핑, stale action-ID throw | 68aa7f8 |
| **owners** | **정상**(당일 빈자리 0/cron gap). 조치 불필요 | — |
| **sungmoon** | **제거**(oakvalley S1 성문안CC와 동일 데이터, golf_clubs 미등록, prod 결과 0) | 68aa7f8 |

### 미완료
- 코드 없음. 단 prod 운영 설정 2건 미반영(Next Steps).

## Next Steps (우선순위)

1. **[P0] Vercel 운영 env 추가** — `TAEKWANG_ENC_ID`, `TAEKWANG_ENC_PW`(암호화 자격증명 blob)를 Vercel production env에 등록. `.env.local`엔 있으나 Vercel 별도 필요. **없으면 taekwang 스크래퍼가 prod에서 throw → 해당 클럽 0건.**
2. **[P1] pinestone 비밀번호 로테이션(보안)** — 이번 세션 채팅에 pinestone 평문 비밀번호 + 라이브 JWT 노출됨. 로테이션 권장.

## Blockers

- 코드 레벨 블로커 없음(전부 push 완료).
- taekwang prod 동작은 Next Steps #1(Vercel env) 완료 전까지 차단.

## Watch Out

- **taekwang next-action ID = build hash** — taekwang 재배포 시 스크래퍼 throw(가시적 실패, silent 아님). 발생 시 브라우저에서 next-action ID 재캡처. ([[scraper-server-action-rsc]])
- **taekwang 암호화 blob = 정적**(replay-safe, nonce 없음). 단 사용자가 taekwang 비밀번호 변경 시 무효 → 재캡처. ([[scraper-replay-client-crypto]])
- **보안** — 이번 세션 pinestone 평문 pw + 여러 JWT 채팅 노출. pinestone pw 로테이션 권장.
- **yangju 단일세션** — 즉시 재시도 금지(세션충돌 악화). cold cron 재시도에 맡김. ([[yangju-single-session]])
- **scraper 실패 계약** — 에러 시 throw, success:0 금지. ([[teetime-liveness-invariant]])
- **가격 컨벤션** — 할인가 저장(discountPrice/promtnPrice/인터넷회원가/greenFeeDiscountAmt), 정상가 X. ([[scraper-price-tier-convention]])
- **cheerio bare-`<tr>`** — fragment 파싱 시 `<table>` 래핑 필수. ([[cheerio-bare-tr-trap]])
- **live-verify 방식** — `.env.local` 크리덴셜 + 일회용 `_live-*.test.ts`(정리 완료, 커밋 금지). ([[scraper-live-probe-vitest-trick]])
- **성문안 데이터 경로** — oakvalley S1(`cc_name='성문안CC'`)로 흐름. oakvalley 봇 watch가 커버.
- `.env*` 절대 커밋 금지.

## Files Touched

3개 커밋 누계:
- `src/lib/scrapers/{hilldeloci,skyvalley,tpcgolf,yangju,pinestone,purunsol,taekwang}.ts` (수정)
- `src/lib/scrapers/sungmoon.ts` (삭제)
- `src/lib/scrapers/index.ts`, `src/lib/constants/regions.ts` (sungmoon 등록 해제)
- `__tests__/lib/scrapers/{hilldeloci,skyvalley,tpcgolf,yangju,pinestone,purunsol,taekwang}.test.ts` (신규/수정)
- `__tests__/lib/scrapers/{base,scraper-registry}.test.ts` (scraper count 34→33)
- `AGENTS.md`(=CLAUDE.md 심볼릭), `docs/UNIMPLEMENTED_CLUBS.md` (33개 반영)
- `.env.local` (TAEKWANG_ENC_ID/PW — 로컬만, 커밋 안 됨)
