---
name: teetimes-maxrows-pagination
description: Supabase max_rows 기본 1000 → 단일 select는 조용히 잘림. /api/tee-times는 페이지 순회로 전량 조회
type: project
created: 2026-07-04
---

Supabase(PostgREST) `max_rows` 기본값이 **1000**이라 `.range()`/`.limit()` 없는 `.select()`는 1000행에서 **조용히 잘림**. "정확히 1000건"이 보이면 진짜 개수가 아니라 상한에 걸린 것 — 초과분(늦은 시간·일부 클럽) 유실.

`GET /api/tee-times`는 1000개씩 `.range(from, from+999)`로 **페이지 순회**, 짧은 페이지(<1000) 나올 때까지 누적(안전캡 20페이지=20k행). 페이지 경계 안정성 위해 `teeoff` 정렬에 `id` 보조정렬 추가(tie 시 행 중복/누락 방지). 응답은 배열 그대로라 hook/컴포넌트 무변경, `ResultSummary count={teeTimes.length}`가 실제 건수.

**Why:** 결과 배지가 1000으로 고정되고 데이터가 잘려 보이던 버그
**How to apply:** 대량 행 반환 쿼리는 `.range()` 페이지 순회 필수. `max_rows` 상향은 대시보드 설정이라 코드로 못 함 → 페이지네이션이 코드-only 해법. count만 필요하면 `select('*',{count:'exact',head:true})`.
