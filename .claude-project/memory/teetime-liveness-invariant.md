---
name: teetime-liveness-invariant
description: tee_times는 삭제하지 않음. 웹 /api/tee-times도 텔레그램과 같이 scraped_at >= S만 산 슬롯
type: project
created: 2026-08-23
---

`tee_times` 행은 절대 DELETE하지 않는다. 성공 스크랩은 아직 열린 슬롯만 `scraped_at`을 이번 런 시각으로 다시 찍고, 사이트에서 사라진 슬롯은 마지막 관측 시각에 얼어 남는다.

“지금 빈자리”는 `row.scraped_at >= S`. S는 그 club_id+날짜의 `scrape_club_results` 중 `status=success`인 `scraped_at` 최댓값. 성공 스크랩이 없는 클럽은 전부 숨긴다. 전 클럽 공통.

- 텔레그램: `src/lib/telegram/match.ts` `computeS` + `/api/telegram/check` `.gte('scraped_at', S)`
- 웹: 2026-08-23 전까지 필터 없이 전 이력을 내려줌. 8/24 실측 저장 3359 vs 산 슬롯 1058
- 웹 구현: `src/lib/utils/liveness.ts` → `/api/tee-times`. `scrape_jobs`/`scrape_club_results`는 anon RLS가 비우므로 service role

**Why:** 웹이 DB에 남은 마감 타임을 빈자리로 보여 줬다.
**How to apply:** 빈자리 API·UI·봇은 `tee_times`를 그대로 반환하지 말 것. S 조회는 scrape_club_results를 전량 페이지.
