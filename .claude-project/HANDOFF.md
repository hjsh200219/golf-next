---
created: 2026-07-22T22:35:00+09:00
project: golf-next
summary: Scrapling(Python) 설치·검증 완료 + 베어크리크 로그인/조회 실현가능성 검토(로컬 YES·프로덕션 NO). 사용자 결정으로 검토만 종료, 코드 미작성.
---

## Session Digest

Scrapling(https://github.com/D4Vinci/Scrapling) 설치 요청으로 시작 → 베어크리크 스크레이핑 실현가능성 검토로 확장.

1. **Scrapling 설치** — `pip install scrapling[fetchers]` + `scrapling install`(Playwright/camoufox 브라우저). `scrapling 0.4.11`, Python 3.11.6(pyenv). Fetcher/DynamicFetcher/StealthyFetcher 3종 라이브 fetch 동작 확인. 주의: `Response`는 `css()` 리스트 반환, `css_first` 없음(page-adaptor에만 존재).
2. **베어크리크 검토(라이브)** — bearcreek는 미구현(WAF `_fec_sbu` 406). 실측: `StealthyFetcher`(camoufox 실브라우저) → 200 통과, 일반 HTTP `Fetcher`/curl → 406. 로그인은 표준 ASP.NET WebForms(`/Member/Login.aspx`, `txtMemNo`+`txtPassword1` + VIEWSTATE postback), `page_action`으로 fill→click→postback 자동화 검증(더미 계정). 예약 페이지 무로그인 200.
3. **결론** — 로컬 로그인·조회 = 기술적 가능(유효 계정 필요). 프로덕션 배포 = 불가(2벽): ①클라우드 IP 차단(camoufox는 지문만 위장, IP 못 바꿈) ②Scrapling=Python vs 프로젝트 스크레이퍼=TS 스택 분리. bearcreek 미구현 근본 사유는 스크레이핑 기술 아니라 배포 IP.
4. **사용자 결정** — "검토만 종료". 코드 미작성.

## Progress

**완료**
- Scrapling 설치·3-fetcher 검증
- 베어크리크 WAF 통과/로그인 폼/예약 페이지 라이브 검토
- 결론 메모리 반영: `scraper-waf-cloud-ip-blocking.md` 업데이트(Scrapling 재검증 절 추가) + repo MEMORY.md Session 13

**미완료 (사용자 보류)**
- 로컬 PoC(유효 계정으로 실제 tee-time 조회 Python 스크립트)
- residential proxy + Python 서비스 프로덕션 통합

## Next Steps

1. (재개 시) WAF 차단 클럽 진짜 벽은 배포 IP — residential proxy 예산/스택 결정이 선행. 스텔스 강화 재검토는 무의미(로컬 이미 풀림).
2. 로컬 PoC 원하면 `.env.local`에 베어크리크 유효 회원번호/비번 주입 후 StealthyFetcher `page_action` 로그인 흐름 완성.

## Blockers

- 베어크리크 유효 회원 자격증명 부재 → 실제 로그인·데이터 조회 검증 불가(더미 계정으로 postback 메커니즘만 확인).
- 프로덕션: residential proxy(비용) + Python/TS 스택 통합 아키텍처 결정 필요.

## Watch Out

- Scrapling `Response`에 `css_first` 없음 — `css()`(리스트) 사용. page-adaptor(page_action 인자)에만 css_first.
- `StealthyFetcher` = camoufox(브라우저 지문만 위장). IP 우회 아님 — 클라우드 배포는 여전히 WAF 차단.
- Scrapling은 Python 전역 pip 설치(pyenv 3.11.6). 이 repo는 TS — 통합 시 별도 서비스 필요.

## Files Touched

- (없음, repo 코드) — Scrapling은 시스템 pip 설치
- .claude-project/memory/scraper-waf-cloud-ip-blocking.md (Scrapling 재검증 절 추가)
- .claude-project/memory/MEMORY.md (Session 13 인덱스)
- (외부) ~/.claude/projects/-Users-hoshin-workspace-golf-next/memory/scrapling-waf-ip-not-fingerprint.md (auto-memory)
