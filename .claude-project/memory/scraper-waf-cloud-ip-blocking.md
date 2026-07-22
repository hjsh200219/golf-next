---
name: scraper-waf-cloud-ip-blocking
description: bearcreek/bearsbest WAF(_fec_sbu)가 fetch+cheerio 및 클라우드 IP 차단, Railway 등 해외 클라우드 호스팅 불가
type: reference
created: 2026-03-29
---

bearcreek/bearsbest는 _fec_sbu WAF 사용. fetch+cheerio 방식과 클라우드 IP(Railway 싱가포르 등)를 모두 차단.
Playwright stealth 모드(webdriver=false, plugins override)로 로컬 한국 IP에서는 작동 확인 (bearcreek 11건, bearsbest 19건).

Railway 프로젝트 시도 결과: Docker+Playwright 환경 정상 작동하나 WAF가 클라우드 IP 자체를 차단.

**Scrapling 재검증 (2026-07-22)**: Scrapling(Python) StealthyFetcher(camoufox 실브라우저 지문) → bearcreek 200 통과. 일반 HTTP Fetcher/curl → 406. camoufox는 브라우저 지문만 위장(IP는 못 바꿈) → 로컬 한국 IP만 통과, 클라우드 배포는 여전히 차단. 로그인은 표준 ASP.NET WebForms(`/Member/Login.aspx`, `txtMemNo`+`txtPassword1` + VIEWSTATE postback), page_action으로 자동화 검증됨. **결론: WAF 차단 클럽 미구현은 스크레이핑 기술 문제 아님 — 배포 IP + (Scrapling은 Python이라) TS 스택 분리 두 벽.** 사용자 결정: 로컬 PoC/프로덕션 통합 모두 보류, 검토만.

**Why:** 스크래퍼 배포 환경 결정 시 핵심 제약 조건. "스텔스 강화로 풀 수 있나?" 재검토에 시간 낭비 방지
**How to apply:** WAF 차단 골프장(bearcreek/bearsbest/fortunehills) 스크래핑은 한국 IP(로컬 Mac, 한국 리전 VPS, residential proxy) 필요. 로컬은 이미 풀림 — residential proxy 예산/스택 결정이 선행 안 되면 구현 무의미
