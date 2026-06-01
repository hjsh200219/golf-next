---
created: 2026-06-01T09:30:00+09:00
project: golf-next
summary: Telegram 빈자리 알림 봇 — 배포·E2E 검증 완료, /help·/cancel·목록삭제·콜백 견고성 추가(PR#2 머지). 봇 라이브 운영 중
---

## 현재 상태: 라이브 운영 중 ✅
- 봇 @golfshinbot 배포 완료. webhook 등록, prod env(`TELEGRAM_WEBHOOK_SECRET`,`TELEGRAM_BOT_TOKEN`) 설정, migration 011 적용.
- PR#1(봇 본체) + PR#2(/help·/cancel·삭제·견고성·README) 둘 다 main 머지.
- E2E prod 검증 완료: `/watch` 흐름·`/list`·삭제·check cron 매칭→알림발송(`sent:1`)·/help·/cancel·견고성(가짜 query id에도 watch 생성/삭제) 전부 실제 동작 확인.
- onetheclub은 GitHub Actions 유지(봇은 tee_times 읽기만 → 출처 무관).
- 디버깅 교훈: [vercel-env-quote-trap](memory/vercel-env-quote-trap.md) — env 따옴표 오염 + 재배포 필요로 "200인데 봇 무응답" 겪음.


## Session Digest

Telegram 인라인키보드 기반 티타임 알림 봇(`/watch → 클럽 → 날짜 → 시간대 → 알림`)을 TDD로 구현 완료. Vercel cron 2개(`/api/scrape/cron`, `/api/telegram/check`)를 `vercel.json`에 선언하고, Task 0에서 스크레이퍼의 타임스탬프 버그(tee_times와 scrape_club_results의 `scraped_at`가 서로 다른 `new Date()`를 사용)를 수정해 봇 매칭의 근본 전제를 확립했다. 465개 테스트 통과(+1 skip), `tsc`+lint 클린, 브랜치 `feat/vercel-cron-telegram-bot` push 완료(`4ca5b40`).

## Progress

완료:
- **Task 0 — 타임스탬프 공유 픽스** (`src/app/api/scrape/club/route.ts`): 단일 `const now`로 `tee_times.scraped_at` == `scrape_club_results.scraped_at` 보장. 회귀 테스트 Red→Green.
- **DB 마이그레이션** (`supabase/migrations/011_telegram_watches.sql`): `telegram_watches` 테이블 + 부분 유니크 인덱스(`WHERE status='active'`) + RLS(서비스 롤 전용). 사용자 승인됨.
- **Telegram 라이브러리** (`src/lib/telegram/`): `client.ts`, `time.ts`(kstToday), `keyboards.ts`(인라인 키보드 + callback_data 코덱), `match.ts`(computeS/matchWatch, BACKSTOP=180분), `watches.ts`(INSERT+23505 catch, 20-cap).
- **API 라우트**: `webhook/route.ts`(secret 검증, /watch·/list·/stop, answerCallbackQuery 항상), `check/route.ts`(CRON_SECRET, 과거 날짜 만료, S 2-step, S-null 쇼트서킷, 구조적 로그).
- **인프라**: `vercel.json` cron 2개, `scripts/set-telegram-webhook.ts`, `docs/DEPLOY_CRON_TELEGRAM.md`.
- **검증**: 465 통과 +1 skip, tsc+lint 클린, Architect APPROVED. push 완료.
- **PR #1 생성**: https://github.com/hjsh200219/golf-next/pull/1 (`feat/vercel-cron-telegram-bot` → `main`)
- **onetheclub 결정**: GitHub Actions 유지 확정 (Vercel 이전 안 함 — 본진 데이터는 runner가 이미 같은 tee_times에 upsert, 봇은 출처 무관 읽기). `f8d75f9`
- **PRD 이동**: `.omc/prd.json` → `docs/exec-plans/active/telegram-cron-prd.json` (git 추적). `87b9b66`

## Next Steps

1. **PR #1 머지**: https://github.com/hjsh200219/golf-next/pull/1 (이미 생성됨 — 리뷰 후 머지).
2. **Vercel env + Supabase 마이그레이션**: `TELEGRAM_WEBHOOK_SECRET` Vercel env 추가(랜덤 ≥16자, 커밋 금지); `011_telegram_watches.sql` Supabase 적용.
3. **Vercel Pro 확인 + cron 관찰 후 `scrape-cron.yml`만 삭제**: Pro 여부 확인 → 대시보드에서 두 cron 등록 확인 → `/api/scrape/cron` 연속 2시간 시간당 실행 확인 후에만 `.github/workflows/scrape-cron.yml` 삭제.
4. **onetheclub = GitHub Actions 유지 확정 (작업 없음)**: 본진 데이터는 runner가 같은 `tee_times`에 이미 upsert 중(파주 252/신라 166/클럽72 320+ 검증됨). 봇은 출처 무관하게 읽기만 하므로 정상 작동. `scrape-onetheclub.yml` 삭제 금지, Vercel 이전 금지(잘 되는 본진 깨질 리스크만). 스파이크 불필요.
5. **Telegram 웹훅 등록**: 배포+secret 설정 후 `APP_URL=... TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... npx tsx scripts/set-telegram-webhook.ts` → 봇에서 `/watch` 흐름 수동 검증.

## Blockers

코드 측 블로커 없음. 워크플로 2개 삭제(`scrape-cron.yml`, `scrape-onetheclub.yml`)는 사용자만 가능한 Vercel 프로덕션 확인에 게이팅됨.

## Watch Out

- **tee_times no-delete 불변식**: 봇 매칭 정확성 전체가 Task 0 공유 타임스탬프에 의존. `scrape/club/route.ts`에 `new Date()`가 두 곳에 다시 생기면 봇이 prod에서 전혀 발화 안 하면서 테스트는 green — 절대 되돌리지 말 것. ([postgrest-partial-index-upsert-trap](memory/postgrest-partial-index-upsert-trap.md) 도 동일 trap 계열.)
- **1 skip 테스트** (`watches.test.ts`): 실제 Postgres 멱등성+재활성화 단언. mock은 제약 미강제 → 의도적 skip. 실제 DB 확보 시 unskip.
- **S-computation 2-step 고정**: join/embedded/RPC로 교체 금지(mock green/prod dead trap).
- **onetheclub v1 클럽 레벨 워치**: 본진 워치는 파트너 포함 모든 코스에 발화. cc_name 레벨은 v2 과제.

## Files Touched

22개: Task0(`scrape/club/route.ts`), 마이그레이션(`011_telegram_watches.sql`), 타입(`database.ts`), telegram lib 5개(`src/lib/telegram/*`), 라우트 2개(`api/telegram/{webhook,check}`), 인프라(`vercel.json`, `scripts/set-telegram-webhook.ts`), 문서(`docs/DEPLOY_CRON_TELEGRAM.md`), 테스트 9개(`__tests__/lib/telegram/*`, `__tests__/api/telegram-*`, `scrape-club-timestamp`, `helpers/msw-server`).
