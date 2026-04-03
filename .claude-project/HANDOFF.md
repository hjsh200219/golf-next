---
created: 2026-03-28T22:00:00+09:00
project: golf-next
summary: WAF-blocked 스크래퍼 제거, 고장난 스크래퍼 3개 수리, SSOT 리팩터, 린트 정리, gstack 업그레이드
---

## Session Digest

5 commits (d465ab5..1b40108), 27 files changed (+391/-479 lines). WAF-blocked 스크래퍼 3개 삭제, 고장난 스크래퍼 3개(ga-korea, lassagc, orangedunesyj) 수리, 하네스 GC 문서 갱신, eslint inline-disable 제거(overrides 이동), SSOT 강제(DESIGN.md 통합, schema.ts 동적 카운트, regions.ts cities SSOT, `as any` 14→0개), Railway Playwright 시도→포기(WAF), gstack 0.12.11→0.13.2 업그레이드.

## Progress

### Session 3 (2026-03-28 evening)
- [x] **WAF-blocked 스크래퍼 제거**: bearcreek, bearsbest, jungbu — 파일 삭제 + index.ts 정리
- [x] **ga-korea 수리**: SSL rejectUnauthorized=false + 파라미터 수정
- [x] **lassagc 수리**: 새 API 엔드포인트 발견 및 적용
- [x] **orangedunesyj 수리**: device 헤더 + cookie session + pw4 적용
- [x] **하네스 GC 문서**: 스크래퍼 수 27→34, 테스트 수 갱신, schema.ts 5분→매시간, utils 목록, UNIMPLEMENTED_CLUBS.md 신규
- [x] **Lint 정리**: OG image eslint rules를 .eslintrc.json overrides로 이동 (inline disable 제거)
- [x] **SSOT 리팩터**: 루트 DESIGN.md → docs/DESIGN.md 통합, schema.ts SCRAPER_COUNT 동적, regions.ts cities SSOT, `as any` 14→0
- [x] **gstack 업그레이드**: 0.12.11 → 0.13.2
- [x] **Railway Playwright 시도**: 클라우드 IP WAF 차단으로 포기

### Session 2 (2026-03-28 afternoon)
- [x] Pack 스킬 + 하네스 GC + Cron 1시간 + 앱 아이콘 + .env 통일
- [x] 클럽 그룹 뷰 + 스마트 이벤트 + 날짜 탭 내일/모레/글피 + UI/UX 개선

### Session 1 (2026-03-27)
- [x] Streamlit → Next.js 마이그레이션, 27개 스크래퍼, 285개 테스트 통과, Vercel 배포

## Next Steps

1. **`/plan-design-review`** — 디자인 리뷰 실행하여 UI/UX 품질 점검
2. **미이관 스크래퍼 4개** — fortunehills, namchuncheon, lakeside, namyeoju (Python→TS 마이그레이션)
3. **lassagc 계정 재등록** — 현재 계정으로 로그인은 되지만 full data 수집 불가, 재등록 필요
4. ~~**Supabase Auth Site URL**~~ → golfshin.vercel.app 변경 완료 (2026-03-29)
5. **골프장 딥링크** — 예약 사이트 연결
6. **즐겨찾기 필터** — 즐겨찾기 골프장만 보기
7. **SCRAPE_API_KEY 프로덕션 값** 변경

## Blockers

- **클라우드 IP WAF 차단**: Railway/Render 등 클라우드 환경에서 Playwright 스크래핑 불가 — Vercel Cron + fetch 기반만 가능
- ~~**Supabase Auth Site URL**~~: golfshin.vercel.app 으로 변경 완료 (2026-03-29)

## Watch Out

- **EUC-KR 복원 스크래퍼 7개** — 건드리지 말 것 (인코딩 깨짐 위험)
- **ga-korea**: `rejectUnauthorized: false` 사용 중 — 인증서 갱신되면 제거 가능
- **orangedunesyj**: pw4 하드코딩 — 비밀번호 변경 시 깨짐
- **lassagc**: 새 API 구조 (`/json/get_*`) — 계정 재등록 전까지 일부 데이터만 수집
- **에덴블루 가격 이상치** (139만원)
- **cron 1시간 간격** — 데이터 신선도 트레이드오프
- **`as any` 제로 달성** — 새 코드에서 재발 방지

## Files Touched

### Deleted
- `src/lib/scrapers/bearcreek.ts`, `bearsbest.ts`, `jungbu.ts` — WAF-blocked

### Modified (scrapers)
- `src/lib/scrapers/ga-korea.ts` — SSL fix + params
- `src/lib/scrapers/lassagc.ts` — new API endpoints
- `src/lib/scrapers/orangedunesyj.ts` — device headers + cookie session + pw4
- `src/lib/scrapers/index.ts` — removed deleted scrapers
- `src/lib/scrapers/base.ts` — improved typing

### Modified (SSOT/lint)
- `.eslintrc.json` — OG image overrides
- `src/app/opengraph-image.tsx` — inline disable 제거
- `src/lib/schema.ts` — dynamic SCRAPER_COUNT
- `src/lib/constants/regions.ts` — cities SSOT
- `src/lib/supabase/server.ts` — as any 제거
- `src/app/api/**/*.ts` (6 route files) — as any 제거

### Modified (docs)
- `ARCHITECTURE.md`, `AGENTS.md` — 수치 갱신
- `docs/DESIGN.md` — 루트 DESIGN.md 흡수 통합
- `docs/QUALITY_SCORE.md` — 점수 갱신
- `docs/UNIMPLEMENTED_CLUBS.md` (NEW) — 미구현 클럽 목록

### Deleted (docs)
- `DESIGN.md` (root) — docs/DESIGN.md로 통합
