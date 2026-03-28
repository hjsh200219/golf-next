---
name: ui-preferences-zustand-slice
description: viewMode는 필터 store가 아닌 별도 Zustand slice(useUIPreferences)에서 관리
type: project
created: 2026-03-28
---

viewMode (club/time 전환)는 useFilters store가 아닌 별도 useUIPreferences Zustand slice에서 관리 (src/hooks/useFilters.ts 하단). UI 프레젠테이션 상태와 데이터 필터 상태를 분리.

**Why:** viewMode를 filter store에 넣으면 뷰 전환 시 필터 관련 컴포넌트까지 리렌더링됨
**How to apply:** 새로운 UI-only 상태(정렬 방식, 레이아웃 모드 등) 추가 시 useUIPreferences에 추가할 것
