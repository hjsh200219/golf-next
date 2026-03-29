---
name: scraper-lassagc-spring-boot
description: lassagc 사이트 ASP→Spring Boot 재구축, 새 API 엔드포인트 사용, 계정 재등록 필요
type: reference
created: 2026-03-29
---

lassagc 골프장 사이트가 ASP에서 Spring Boot로 전환됨.
- 새 로그인: POST /api/open/member/login (JSON)
- 캘린더: GET /api/open/booking/calendar?yearMonth=YYYYMM (공개)
- 티타임: GET /api/booking/time?date=YYYYMMDD (인증 필요)

현재 기존 계정이 새 시스템에서 작동하지 않아 잔여팀 수만 조회 가능.
계정 재등록 후 상세 티타임 데이터 확보 가능.

**Why:** 스크래퍼 재작성 시 새 API 구조 참조
**How to apply:** lassagc 스크래퍼 개선 작업 시
