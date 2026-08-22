---
name: scrape-club-results-maxrows-pagination
description: 날짜당 scrape_club_results는 수천 행. 미페이지 select는 S를 이른 스크랩에 고정
type: project
created: 2026-08-23
---

`scrape_club_results`는 날짜 하나만 봐도 수천 행(시간당 잡 × 클럽). PostgREST max_rows 기본 1000이라 `.range()` 없는 select는 앞 1000행에서 잘린다. `/api/tee-times`는 id 오름차순이라 잘린 창이 가장 이른 스크랩이다.

그 잘린 집합으로 S를 잡으면 liveness(`scraped_at >= S`)가 마감 슬롯을 다시 살린다. `tee_times`만 페이지해도 소용없다.

웹 `GET /api/tee-times`는 `fetchAllPages`로 scrape_jobs와 scrape_club_results를 tee_times와 같이 1000행 순회한다. 텔레그램 check는 club_id로 좁혀 보통 1000 아래라 같은 함정이 잘 안 드러난다.

원인(1000 상한)은 `teetimes-maxrows-pagination`과 같고 대상 테이블·실패 증상이 다르다. 진단 REST `limit=10000`도 1000에서 잘린다.

**Why:** tee_times 페이지만 고치고 scrape_club_results를 한 방에 읽으면 liveness 필터가 반대로 동작한다.
**How to apply:** S를 계산하는 조회는 success 행을 `.range()`로 전량 모은 뒤 클럽별 max scraped_at.
