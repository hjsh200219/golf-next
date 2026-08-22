---
created: 2026-08-23T03:20:00+09:00
project: golf-next
summary: 바로가기는 origin 홈, 웹 tee-times는 전 클럽 liveness(S) 필터. scrape_club_results 1000행 페이지. 2725f82 main push.
---

## Session Digest

라비에벨 올드가 마감 타임을 그대로 보여 주고, 바로가기가 스크래퍼 AJAX 경로로 열리는 문제를 고쳤다. `/api/tee-times`는 텔레그램과 같이 `scraped_at >= S`로 전 클럽을 거르고, `scrape_club_results`는 PostgREST 1000행 상한을 페이지로 넘긴다. 테스트 611, lint/tsc/build 통과. `2725f82`를 `main`에 push했다.

## Progress

**완료**
- 바로가기 = `golf_clubs.origin` 홈페이지. `reservation_path` AJAX는 UI 링크에 쓰지 않음
- `/api/tee-times` liveness 필터 전 클럽 공통 (`scraped_at >= S`)
- `scrape_club_results` 1000행 캡을 `.range()` 페이지 순회로 돌파
- tests 611, lint/tsc/build 통과
- 커밋·푸시 `2725f82`

**미완료**
- `2725f82` Vercel prod 배포 이 세션에서 미확인
- scrape cron write-loss 미해결 (onetheclub 1–15%)
- WAF 클럽 / residential proxy 결정 대기

## Next Steps

1. 배포 후 `golfshin.vercel.app`에서 라비에벨 올드 내일이 실사이트와 같은 타임 수인지 확인
2. write-loss 조사 (이전 HANDOFF: upsert 배치 드롭 / `maxDuration=60` / `waitUntil` kill)

## Blockers

- write-loss는 Vercel 함수 로그가 실시간 스트림만이라 재현 관측 또는 계측 추가 필요
- residential proxy 예산·스택 결정 대기 (WAF 클럽)

## Watch Out

- `tee_times`는 절대 삭제하지 않는다. 웹도 S 필터를 써야 한다
- `scrape_club_results`도 1000행 캡. 단일 select면 S가 이른 스크랩에 고정되고 마감 타임이 다시 산다
- `CLAUDE.md`는 `AGENTS.md` 심볼릭 링크 — 편집·staging은 `AGENTS.md`
- 이번 `main` push는 Vercel 프로덕션 배포를 트리거한다. `deploy/prod` 슬롯 swap은 별도 지시 없이 하지 말 것
- `scrape_club_results.tee_time_count`는 발견 건수이지 기록 건수가 아니다
- `.github/workflows/scrape-onetheclub.yml` leftover 아님 — 삭제 금지

## Files Touched

- `src/lib/utils/clubLink.ts`, `__tests__/lib/utils/clubLink.test.ts`
- `src/components/results/ClubGroupView.tsx`, `__tests__/components/club-group-view.test.tsx`
- `src/lib/utils/liveness.ts`, `__tests__/lib/utils/liveness.test.ts`
- `src/app/api/tee-times/route.ts`, `__tests__/api/tee-times.test.ts`
- `ARCHITECTURE.md`, `AGENTS.md`
- `.claude-project/` (pack)
