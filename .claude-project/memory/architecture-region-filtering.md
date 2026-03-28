---
name: architecture-region-filtering
description: 지역 필터는 selectedClubs에서 파생된 UI 상태, 별도 저장 안함
type: project
created: 2026-03-28
---

Region filtering은 "club selection shortcuts"로 구현. 지역은 selectedClubs 목록에서 파생된 UI 상태이며, 별도 필터 파라미터로 저장하지 않음. RALPLAN 합의 결정으로 URL 동기화 문제를 방지.

**Why:** 지역을 별도 state로 관리하면 region↔club 선택 간 URL sync 충돌 발생
**How to apply:** 클럽 필터링, 검색, URL 상태 관리 작업 시 별도 region 파라미터 추가하지 말 것
