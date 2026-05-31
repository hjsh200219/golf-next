---
created: 2026-06-01T00:05:00+09:00
project: golf-next
summary: 빈 골프장 13개 라이브 진단 → 7개 스크래퍼 크롤링 버그 수정 + 빈 클럽 UI 노출, origin/main 푸시 완료
---

## Session Digest

prod에서 "예약 가능 시간 없음"으로 뜨던 13개 골프장 스크래퍼를 라이브 사이트 대조 진단. 7개(yangju, tpcgolf, cascadia, thecrosby, philosgc, ferrum, golfzoncounty)를 크롤링 버그 수정 후 라이브 검증 완료. tee-time 없는 클럽도 결과 화면에 "예약 가능 시간 없음"으로 노출하는 UI 추가. 388 tests 통과, 커밋 2건(`bebc1ce`, `2c1dda7`) origin/main 푸시 완료.

## Progress

**완료 (라이브 검증)**
- yangju: dategbn 5→2 + 비번 pw→pw6 → 24 rows
- tpcgolf: origin http→https → 38 rows
- cascadia: teeoff selector tds[2]→tds[4] (부 컬럼 추가) + HH:MM 가드 → 25 rows
- thecrosby: ASP.NET 로그인 필드명 + 테이블 선행 index 컬럼 remap → 53 rows
- philosgc: /Member/Login.aspx(mobile+pw6) + UpdatePanel async postback + 5컬럼 파싱 전면 재작성 → 186 rows
- ferrum: 비번 pw→pw6 + euc-kr 인코딩 → 29 rows
- golfzoncounty: 사이트 마이그레이션 전면 재작성 — POST /login/userLogin(form, pw1) + GET /reserve/multiple/teetime/getList JSON API (golfclubSeqArr=64,53,2,68) → 43 rows
- UI: getEmptyClubs() + ClubGroupView/TeeTimeTable/SearchSection 연동
- base.ts LoginCredentials에 pw6 추가, scrape/club route에서 GOLF_LOGIN_PW6 주입

**prod 검증 완료 (job 6113, date=2026-06-07 DB row)**
- yangju=14, philosgc=93, cascadia=25, thecrosby=53, ferrum=29, golfzoncounty=342 → 6개 정상
- 근본 수정: yangju euc-kr 인코딩(가짜 conflict 키 중복 해소) + dedupeTeeTimeRows(philosgc 186→93 테이블 중복) + upsert 에러 표면화. 커밋 e936c17.

**prod 미해결**
- tpcgolf: 코드 정상(로컬 38 rows). Vercel 서버 IP에서 tpcgolf.co.kr `fetch failed` = 해외 IP 차단 추정. 인프라 이슈, 코드 외. [[scraper-waf-cloud-ip-blocking]] 동일 패턴.
- taekwang: terminated. Next.js SPA 마이그레이션 → 재작성 필요.

**재작성 필요 (사이트 마이그레이션)**
- pinestone: utf-8 SPA로 전환, 모든 .asp 404/500
- taekwang: Next.js SPA로 전환, /Member/Login.aspx 301→오류
- hilldeloci: /hilldeloci/ 네임스페이스가 skyvalley로 통합, 신규 계정 필요

## Next Steps (우선순위 순)

1. **prod Vercel env var `\n` 점검** — ehscc 등 로컬 정상인데 prod 0 rows. GOLF_LOGIN_* 값에 리터럴 \n 잔존 의심. 이게 수정본들의 prod 반영도 막을 수 있음. 가장 높은 우선순위.
2. **pinestone/taekwang/hilldeloci 재작성** — 각 사이트 신규 API/로그인 캡처 후 TDD 재작성.
3. golfzoncounty cc_name 매핑 확인 — 스크래퍼가 golfclubName(이글몬트/골프존카운티 안성H 등) 그대로 사용. DB clubs 테이블 cc_name과 일치하는지 점검.

## Blockers

- **prod env var 오염 의심**: 로컬↔prod 동작 불일치(ehscc). 정확 원인(literal \n) 미확정. Vercel 대시보드 직접 점검 필요.
- pinestone/taekwang/hilldeloci: 신규 사이트 네트워크 캡처 없이는 재작성 불가.

## Watch Out

- 클럽마다 로그인 비번 env 슬롯이 다름: yangju/ferrum/philosgc=pw6, philosgc는 id 대신 mobile, taekwang=pw4, purunsol/golfzoncounty=pw1, 나머지 대부분=pw.
- 스크래퍼 라이브 검증은 인벤토리 있는 날짜(주말 등)로. 월요일은 매물 적어 "빈 결과"와 "고장" 구분 어려움. 단 yangju는 월요일도 매물 있음 — "월요일 휴장" 일반화 금지.
- 한국 골프장 사이트 자주 마이그레이션(컬럼 추가/SPA 전환/로그인 endpoint 변경) → selector·endpoint 깨짐.
- BaseScraper.postForm은 redirect:'manual'. ASP.NET UpdatePanel postback 등 리다이렉트 추적 필요 시 this.fetch + redirect:'follow' 직접 사용.

## Files Touched

스크래퍼: src/lib/scrapers/{yangju,tpcgolf,cascadia,thecrosby,philosgc,ferrum,golfzoncounty}.ts
공통/주입: src/lib/scrapers/base.ts, src/app/api/scrape/club/route.ts
UI: src/lib/utils/group.ts(getEmptyClubs), src/components/results/{ClubGroupView,TeeTimeTable}.tsx, src/components/search/SearchSection.tsx
테스트: __tests__/lib/scrapers/{yangju,tpcgolf,cascadia,thecrosby,philosgc,ferrum,golfzoncounty}.test.ts, __tests__/components/club-group-view.test.tsx, __tests__/lib/utils/group.test.ts
재작성 대상(미수정): src/lib/scrapers/{pinestone,taekwang,hilldeloci}.ts
