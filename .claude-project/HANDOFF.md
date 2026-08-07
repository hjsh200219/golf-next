---
created: 2026-08-07T10:05:00+09:00
project: golf-next
summary: 중복 GitHub Actions 스크랩 트리거(scrape-cron.yml) 제거 + 문서 동기화. 그 과정에서 /api/scrape/cron이 success로 보고하고도 tee_times에 1~15%만 기록하는 미해결 write-loss 발견.
---

## Session Digest

GitHub 알림("Scrape Tee Times (Hourly)" 워크플로 취소)에서 출발.

1. **Vercel Cron이 실제 스케줄러임을 확인** — `vercel crons ls` 3개 등록, `scrape_club_results` 기준 매시 `:00`~`:01` 18시간 연속 무결. GitHub Actions 실패(16:49, 18:25)에도 18:01·19:01 스크랩 정상.
2. **실패 원인은 코드 아님** — `The job was not acquired by Runner of type hosted even after multiple attempts` → 15분 후 취소. GitHub 인프라 문제.
3. **`scrape-cron.yml` 삭제** — `/api/scrape/cron`을 `curl`만 하던 순수 중복. `docs/DEPLOY_CRON_TELEGRAM.md` §3 step 4(미완료로 남아있던 순차 체크리스트)를 완료.
4. **삭제 전 onetheclub 커버리지 검증 → 첫 결론이 틀렸음을 후속 검증에서 발견.** 00:01 한 시각만 보고 "Vercel 람다는 본진 빈 응답"이라 판단해 문서에 썼으나, 21:01 실행은 본진 329행을 정상 기록. 갈림은 본진/제휴가 아니라 D+1~D+7 vs D+8~D+14였다. 문서·AGENTS.md·워크플로 주석 모두 정정 완료.
5. **더 큰 이슈 발견(미해결)** — 모든 Vercel cron 실행이 onetheclub을 `status=success` + `tee_time_count` ~2000으로 보고하는데 `tee_times`엔 6~332행만 기록(1~15%).

## Progress

**완료**
- Vercel Cron 3개 발사 검증: `/api/scrape/cron`(`0 * * * *`), `/api/telegram/check`(`50 * * * *`), `/api/telegram/yangju/check`(`55 * * * *`)
- `.github/workflows/scrape-cron.yml` 삭제(52줄) — commit `db5a51d`, push 완료
- `AGENTS.md:58` Scrape Schedule 3-cron 동기화 — commit `cd66ee0`, push 완료
- push 후 검증: `gh workflow list --all` → "Scrape OneTheClub Home (Hourly)" 1개만. 원격 `.github/workflows/`에도 `scrape-onetheclub.yml`만
- 잘못 쓴 문서 문구 정정: `docs/DEPLOY_CRON_TELEGRAM.md` §4, `AGENTS.md:58`, `scrape-onetheclub.yml` 헤더 주석
- 듄스 오기 정정(3곳) — onetheclub 본진 아님. `laviebell`(라비에벨CC 듄스) / `orangedunesyj`(오렌지듄스영종GC) 별도 스크래퍼
- `AGENTS.md` 테스트 수치 갱신(465/44 → 588/65, `npx vitest list` 실측), Docs Index 설명·Known Limitations·Add scraper 항목 보강, 상대링크 `./` 통일
- 메모리 4건: `scrape-cron-write-loss`(신규), `scrape-scheduler-attribution`(신규), `postgrest-adhoc-query-traps`(신규), `cron-scraping-interval`(갱신)

**미완료**
- ⚠️ **write-loss 원인 미파악** (아래 Next Steps 1번)
- 일부 실행의 `scrape_club_results` 행 수 편차: 정상 231행(33클럽 × 7날짜) vs 76행 (07:01, 12:01, 16:01, 20:01 UTC). write-loss와 같은 뿌리(60초 타임아웃 절단)일 가능성 — 미확인
- 이전 세션 이월: bearcreek 등 WAF 차단 클럽. 진짜 벽은 배포 IP → residential proxy 예산/스택 결정 선행

## Next Steps

1. **`/api/scrape/cron` write-loss 조사** (최우선)
   - 증상: `status=success`, `tee_time_count` 합계 ~2000 → `tee_times` 실제 6~332행
   - 후보 ① in-batch 중복으로 upsert 배치 드롭(`ON CONFLICT DO UPDATE cannot affect row a second time`) ② `maxDuration = 60` 초과로 쓰기 중 람다 종료 ③ `waitUntil` 디스패치 kill
   - 시작 파일: `src/app/api/scrape/cron/route.ts`, `src/app/api/scrape/route.ts`의 upsert 경로
   - **다른 클럽에도 같은 손실이 있는지 먼저 전수 확인** — onetheclub만 본 상태. 있다면 사이트 전체가 빈자리를 놓치고 있는 것
2. **231 vs 76 행 편차 확인** — 1번과 같은 원인인지 분리 확인. 다르면 별도 추적
3. **WAF 차단 클럽** — residential proxy 예산/스택 결정이 선행. 스텔스 강화 재검토는 무의미(로컬은 이미 통과)

## Blockers

- write-loss 원인 후보 3개 중 어느 것인지 로그 없이는 좁히기 어려움. Vercel 함수 로그는 실시간 스트림만 잡혀서 과거분 조회 불가 — 재현 관측(다음 정시에 맞춰 `vercel logs` 스트리밍) 또는 임시 계측 추가 필요
- residential proxy 예산·인프라 결정 대기 (WAF 클럽)

## Watch Out

- **`.github/workflows/scrape-onetheclub.yml`은 이제 저장소의 유일한 워크플로다. leftover로 오인해 삭제 금지.** 파일 헤더 주석·`AGENTS.md:58`·`docs/DEPLOY_CRON_TELEGRAM.md` §4 세 곳에 삭제 금지를 박아뒀다. 새 스크래퍼 추가 시 이 파일을 템플릿으로 복사하지 말 것 — 이번에 제거한 이중 스크랩이 되살아난다.
- **`scrape_club_results.tee_time_count`를 "기록된 건수"로 읽지 마라.** 발견 건수다. 정상 여부는 해당 `scraped_at`으로 `tee_times`에 몇 행 들어갔는지 대조해서 판단.
- **단일 시각 표본으로 스크랩 동작을 일반화하지 마라.** 이번 세션에서 00:01 한 버킷만 보고 틀린 원인 진단을 내리고 문서에 커밋까지 했다. 최소 4~6개 버킷을 봐라.
- **PostgREST 진단 쿼리는 `limit`과 무관하게 1000행에서 잘린다.** 버킷 합이 정확히 1000이면 실데이터가 아니라 상한. 시간 구멍처럼 위장한다.
- `CLAUDE.md`는 `AGENTS.md` 심볼릭 링크 — 편집·staging은 `AGENTS.md` 기준.

## Files Touched

**삭제**
- `.github/workflows/scrape-cron.yml`

**수정**
- `.github/workflows/scrape-onetheclub.yml` (헤더 주석만, 동작 변경 없음)
- `docs/DEPLOY_CRON_TELEGRAM.md` (§3 완료 표기, §4 정정 + write-loss 이슈 절 신설)
- `AGENTS.md` (Scrape Schedule, Docs Index, Common Tasks, 테스트 수치, Known Limitations, 링크)
- `.claude-project/memory/` (신규 3 + 갱신 1 + `MEMORY.md` 인덱스)

**커밋**
- `db5a51d` chore(cron): remove duplicate GitHub Actions scrape trigger
- `cd66ee0` docs(agents): sync Scrape Schedule with vercel.json (3 crons + onetheclub exception)
