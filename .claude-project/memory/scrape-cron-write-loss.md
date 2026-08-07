---
name: scrape-cron-write-loss
description: 미해결 — /api/scrape/cron이 status=success로 ~2000건 보고해도 tee_times엔 1~15%만 기록됨. scrape_club_results.tee_time_count는 "기록량"이 아니다
type: project
created: 2026-08-07
---

**`scrape_club_results.tee_time_count`는 스크래퍼가 *발견한* 건수이지 `tee_times`에 *기록된* 건수가 아니다.** 둘이 자릿수 단위로 벌어진다.

2026-08-06~07 실측, `club_id=onetheclub`, Vercel cron 실행분:

| run | `tee_time_count` 합계 | `tee_times` 실제 행 | 기록률 |
|---|---|---|---|
| `20:01` | 1964 | 6 | 0.3% |
| `21:01` | 2121 | 332 | 16% |
| `22:01` | 2107 | 30 | 1.4% |
| `00:01` | 2060 | 14 | 0.7% |

전 실행 `status=success`. 에러도, 경고도 없다.

**왜 위험한가 — liveness invariant를 깬다.** 행은 `scraped_at >= 최근 성공 스크랩 시각`일 때만 "열림"으로 취급된다([[teetime-liveness-invariant]] 계열 규칙). 스크래퍼가 봤지만 기록에 실패한 슬롯은 **마감된 것처럼 보인다**. onetheclub D+1~D+7은 `:30`의 GitHub Actions 러너가 매시 덮어써서 실질 복구되지만, **다른 클럽에도 같은 손실이 있는지는 미확인**이다.

**원인 미파악.** 후보:
1. in-batch 중복으로 upsert 배치가 통째로 드롭 (`ON CONFLICT DO UPDATE cannot affect row a second time`) → [[postgrest-partial-index-upsert-trap]], [[scraper-upsert-dedup-encoding-trap]]
2. `/api/scrape/cron`의 `maxDuration = 60` 초과로 쓰기 도중 람다 종료
3. `waitUntil` 디스패치가 완료 전 kill → [[scrape-dispatch-waituntil]]

**조사 시작점:** `src/app/api/scrape/cron/route.ts`(60초 상한, 짝/홀수시 D+1~7 / D+8~14 분할), `src/app/api/scrape/route.ts`의 upsert 경로.

**Why:** "success + 큰 tee_time_count"를 보고 정상이라 판단하면 데이터 손실을 영원히 못 본다. 실제로 이 지표를 믿다가 "Vercel 람다는 본진을 못 가져온다"는 틀린 원인 진단까지 나왔다(진짜 원인은 응답이 아니라 쓰기).
**How to apply:** 스크랩 정상 여부를 볼 때 `tee_time_count` 말고 **`tee_times`에 그 `scraped_at`으로 실제 몇 행 들어갔는지** 대조하라. 관련 [[scrape-scheduler-attribution]], [[cron-scraping-interval]]
