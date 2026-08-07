---
name: cron-scraping-interval
description: Vercel Cron이 유일한 스케줄러 (vercel.json 크론 3개). 스크랩 1시간 간격, 중복 트리거 금지
type: project
created: 2026-03-28
updated: 2026-08-07
---

`vercel.json`에 크론 **3개**. Vercel Cron이 이 프로젝트의 **유일한 스케줄러**다.

| path | schedule |
|---|---|
| `/api/scrape/cron` | `0 * * * *` (매시 정각, 1시간 간격 — 초기 5분에서 변경) |
| `/api/telegram/check` | `50 * * * *` |
| `/api/telegram/yangju/check` | `55 * * * *` |

**중복 트리거 금지.** 예전엔 GitHub Actions `scrape-cron.yml`이 같은 `/api/scrape/cron`을 `curl`해서 매시 2번 스크랩됐다. 2026-08-07 삭제. Vercel 크론이 안 도는 것 같으면 **두 번째 트리거를 만들지 말고** Vercel 쪽을 고쳐라(플랜 등급 — Hobby는 크론 1일 1회 상한이라 hourly 배포 자체가 실패 / `CRON_SECRET`).

**유일한 예외**는 `.github/workflows/scrape-onetheclub.yml`(`30 * * * *`). 엔드포인트 트리거가 아니라 러너에서 직접 스크랩해 같은 `tee_times`에 upsert하므로 중복이 아니다. 삭제 금지 — 이유는 [[scrape-cron-write-loss]].

**발사 여부는 대시보드 로그 말고 `scrape_club_results`로 확인한다.** 판별법은 [[scrape-scheduler-attribution]].

**Why:** 골프장 서버 부담·Vercel 리소스 고려(1시간 간격), 그리고 트리거 이중화는 안정성이 아니라 더블 스크랩이라는 비용만 만든다
**How to apply:** 스크랩 빈도·스케줄 변경 시 `vercel.json` 단일 소스만 수정. 관련 [[scrape-dispatch-waituntil]], [[scrape-scheduler-attribution]], [[scrape-cron-write-loss]]
