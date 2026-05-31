---
name: scraper-dategbn-per-club
description: ASP real_timelist_ajax_list.asp 계열의 dategbn 파라미터 값은 클럽마다 다름 (브라우저 캡처로 확인)
type: reference
created: 2026-06-01
---

ASP 기반 `real_timelist_ajax_list.asp` 계열 엔드포인트는 `dategbn` 파라미터를 요구하며, 올바른 값이 클럽마다 다르다. 잘못된 값이면 로그인 성공해도 빈 결과를 반환한다.

**검증된 클럽별 값** (소스코드 확인):
- yangju = 2 (5에서 수정, 라이브 24 rows로 확인)
- ferrum = 3, rainbowhills = 3, sunningpoint = 3
- pinestone = 4, laviebell = 4

**Why:** 값을 추측하면 빈 테이블을 받고도 원인을 못 찾음. yangju가 dategbn=5(잘못)로 0 rows였다가 2로 고치니 24 rows.
**How to apply:** 신규/수정 시 실제 브라우저로 네트워크 요청을 캡처해 dategbn 값 확인. 인벤토리 있는 날짜(주말)로 테스트. [[scraper-site-migration-fragility]] 참조.
