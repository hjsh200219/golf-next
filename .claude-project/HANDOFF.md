---
created: 2026-06-18T13:35:00+09:00
project: golf-next
summary: 시간당 스크랩 cron 504 오탐 수정 — /api/scrape를 waitUntil로 dispatch만 하고 즉시 201 반환
---

## Session Digest

GitHub Actions "Scrape Tee Times (Hourly)" 1회 실패 알림 진단. 원인: `/api/scrape`가 (club×date)별 `/api/scrape/club` fetch를 fan-out 후 `await Promise.allSettled(pendingFetches)`로 **모든 club 응답을 대기** → 가장 느린 club이 전체를 bound → Vercel `maxDuration=60` 초과 → cron이 504. 단, club 함수는 독립 invocation이라 데이터는 그대로 upsert됨(= cosmetic 오탐). 20회 중 1회 transient.

수정: `await Promise.allSettled(...)` → `waitUntil(Promise.allSettled(...))`(`@vercel/functions` 신규 의존성) + 즉시 201. cron의 await가 dispatch에서 resolve → 504 소멸. 실제 실패(auth/job생성)는 여전히 non-201로 노출. next@14.2엔 `unstable_after` 없어 `@vercel/functions` 사용.

커밋 `7fbaeda` push 완료(origin/main). 푸시 전 remote와 rebase(package-lock 충돌은 lock 재생성으로 해소).

## Progress

**완료**
- `src/app/api/scrape/route.ts`: `waitUntil` import + dispatch 후 즉시 201
- `__tests__/api/scrape-dispatch.test.ts`(신규): never-resolve club fetch로도 201 즉시 반환 + waitUntil 호출 검증 (RED 317ms행→GREEN 4ms)
- `@vercel/functions@^3.7.1` 의존성 추가
- 검증: tsc ✅ / lint ✅ / test 569 ✅ / build ✅
- 메모리: `scrape-dispatch-waituntil.md` (504 cosmetic + waitUntil 패턴)

## Next Steps

1. **다음 정시 cron 확인** — 04:16Z 실패 후 수정 배포됨. 다음 `0 * * * *` 런이 200(success)인지, 시간당 504가 사라졌는지 GitHub Actions 탭에서 확인.
2. (선택) `/api/scrape` 자체엔 `maxDuration` 미설정 — waitUntil 작업은 함수 기본 한도까지만 살아있음. fetch flush엔 충분하나, 추후 club 수 급증 시 명시 검토.

## Blockers

- 없음.

## Watch Out

- **504가 사라져도 데이터 누락은 별개 신호로 봐야 함** — cron HTTP status는 health 신호가 아님(원래도 아니었음). 실제 클럽별 수집 상태는 `scrape_club_results` 테이블이 authoritative. 메모리 [[scrape-dispatch-waituntil]] 참고.
- **waitUntil 로컬/테스트 동작**: Vercel 런타임 전용. 테스트는 `vi.mock('@vercel/functions')`로 처리. 로컬 dev에선 Node가 freeze 안 해 in-flight fetch 자연 완주.

## Files Touched

- `src/app/api/scrape/route.ts`
- `__tests__/api/scrape-dispatch.test.ts` (신규)
- `package.json` / `package-lock.json` (+`@vercel/functions`)
- `.claude-project/memory/scrape-dispatch-waituntil.md` (신규), `MEMORY.md`
