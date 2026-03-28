---
name: date-tabs-next-day-focused
description: 날짜 탭이 내일/모레/글피 기준 (당일 예약 불가, 익일 중심)
type: project
created: 2026-03-28
---

SearchBar 날짜 탭은 ['내일', '모레', '글피']로 구성 (오늘 제외). getNextNDays(3, tomorrow)으로 내일부터 3일간 표시. 기본 선택값도 내일(dates[0]).

**Why:** 골프장 예약은 당일 예약이 불가능하고 익일부터 가능, 오늘 탭은 빈 결과만 보여줌
**How to apply:** 날짜 관련 UI 또는 기본 날짜 로직 변경 시 당일 제외 원칙 유지
