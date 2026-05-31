---
name: scraper-aspnet-updatepanel-postback
description: ASP.NET UpdatePanel 비동기 postback으로 그리드 로드 (philosgc 등). 평범한 GET은 빈 테이블
type: reference
created: 2026-06-01
---

일부 ASP.NET 클럽(philosgc 확인, taekwang 유사)은 UpdatePanel 비동기 postback으로 티타임 그리드를 채운다. `?SelectedDate=` 같은 평범한 GET은 헤더 행만 있는 빈 테이블을 반환한다.

**postback 요청 형태** (philosgc 검증):
- `__EVENTTARGET` = `ctl00$ContentPlaceHolder1$btnUpdate`
- 헤더 `X-MicrosoftAjax: Delta=true`, `Content-Type: ...; charset=UTF-8`
- ScriptManager 필드 + 예약 페이지 GET에서 수집한 모든 hidden input + htbArgs(`LIST|today|target|Y|1`)

**중요 — redirect:** `BaseScraper.postForm`은 `redirect:'manual'`이라 postback이 깨진다. `this.fetch`에 `redirect:'follow'`로 직접 호출할 것.

**Why:** GET만 보면 빈 테이블 → 셀렉터 문제로 오인. 실제로는 postback 누락.
**How to apply:** 해당 클럽 작성/수정 시 philosgc.ts를 참조 구현으로. [[scraper-credential-env-map]] (philosgc는 mobile+pw6).
