---
name: scrape-scheduler-attribution
description: 어느 스케줄러가 만든 스크랩 행인지 scraped_at의 "분"으로 판별 — Vercel Cron은 :00~:01 정밀, GitHub Actions는 10~25분 드리프트
type: project
created: 2026-08-07
---

Vercel Cron과 GitHub Actions가 **같은 엔드포인트/같은 테이블**(`scrape_club_results`, `tee_times`)에 쓰면 행만 봐서는 출처를 알 수 없다. 행에 스케줄러 식별자 컬럼이 없다.

**판별자는 `scraped_at`의 분(minute)이다.**

- **Vercel Cron** — 예약 분에 **정밀**하게 발사. `0 * * * *`면 `:00`~`:01`에 착지.
- **GitHub Actions `schedule:`** — 러너 큐 대기 때문에 **10~25분 드리프트**. 실측(`0 * * * *`로 등록된 워크플로): `08:40`, `14:17`, `16:49`, `18:25`. GA의 cron은 "이 시각 이후 언젠가"에 가깝다.

**방법:** `scraped_at`을 분 단위(`scraped_at[:16]`)로 버킷팅해서 버킷별 행 수를 센다. 두 소스가 서로 다른 분대에 뭉치므로 눈으로 분리된다. 이걸로 "Vercel 크론이 GA 없이 몇 시간 연속 커버했는가"를 증명할 수 있다.

**주의 — 버킷 행 수를 "수집 성공량"으로 읽지 마라.** 버킷 행 수는 *기록된* 양이지 *수집된* 양이 아니다. 둘은 크게 다르다 → [[scrape-cron-write-loss]]. 2026-08-07에 이걸 혼동해서 "Vercel 람다는 onetheclub 본진을 못 가져온다"는 틀린 결론을 냈다(실제로는 21:01 실행이 본진 329행을 정상 기록). **단일 시각 표본으로 일반화하지 말고 최소 4~6개 버킷을 봐라.**

**주의 — 대시보드 로그를 신뢰하지 마라.** 발사 확인의 authoritative 소스는 `scrape_club_results` 테이블이다(cron 504는 cosmetic이라 HTTP status도 못 믿는다 → [[scrape-dispatch-waituntil]]).

**주의 — 버킷에 구멍이 보이면 먼저 truncation을 의심하라.** PostgREST 1000행 상한이 시간 구멍처럼 위장한다 → [[postgrest-adhoc-query-traps]].

**Why:** 스케줄러 이관/중복 제거를 판단하려면 "이 행을 누가 만들었나"를 증거로 확정해야 하는데, 스키마에 그 정보가 없다. 타이밍 특성이 유일한 지문이다.
**How to apply:** 크론 이관·중복 트리거 정리·"크론이 도는가" 검증 시. 현재 남은 이중 소스는 onetheclub(GA 러너 `30 * * * *`) 하나뿐이라 이 판별법은 여전히 유효하다. 관련 [[cron-scraping-interval]]
