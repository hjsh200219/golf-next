---
name: scraper-orangedunesyj-auth
description: orangedunesyj는 device-* 커스텀 헤더 + 쿠키 세션 필수 (Bearer 불가), month=현재월
type: reference
created: 2026-03-29
---

orangedunesyj API 인증 특이사항:
- Authorization Bearer 토큰 사용 시 INTERCEPTED_ID 에러 → 쿠키 기반 세션 사용
- device-browser, device-os, device-platform, device-user-agent 헤더 필수
- reservation-calender의 month 파라미터: 조회 대상월이 아닌 현재월 전달
- 비밀번호: credentials.pw4 사용

**Why:** 일반적인 JWT Bearer 패턴과 다른 구현, 디버깅 시간 절약용
**How to apply:** orangedunesyj 스크래퍼 수정 또는 디버깅 시
