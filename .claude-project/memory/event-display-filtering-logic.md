---
name: event-display-filtering-logic
description: formatEventDisplay 이벤트 필터링 — 가격 중복/쓰레기 코드/할인가 판별
type: project
created: 2026-03-28
---

src/lib/utils/event.ts의 formatEventDisplay 분류 로직:
- 단위 없는 숫자(125,000) → price 컬럼과 중복이므로 null
- P코드 패턴(P0015,,B,) → 내부 코드 쓰레기, null
- "원" 접미사 + price보다 낮은 금액 → discount 타입 (할인가 표시)
- 한글 텍스트 → info 타입 (프로모션/비고)

**Why:** 스크래핑 데이터에 의미 없는 가격 중복/내부 코드가 혼재
**How to apply:** 이벤트 표시 로직 수정 또는 새 골프장 스크래퍼의 이벤트 데이터 파싱 시
