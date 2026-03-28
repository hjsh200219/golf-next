---
name: weather-data-coordinates
description: 날씨 좌표는 courses 테이블에 있음 (golf_clubs 아님)
type: reference
created: 2026-03-28
---

golf_clubs 테이블에는 lat/lon 컬럼이 없음. 지리 좌표(위도/경도)는 courses 테이블에 저장. 골프장 좌표가 필요하면 firstCourse?.lat, firstCourse?.lon 사용.

**Why:** 잘못된 테이블에서 좌표를 찾는 시간 낭비 방지
**How to apply:** 날씨 기능 또는 위치 기반 쿼리 구현 시
