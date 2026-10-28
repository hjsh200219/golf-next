---
created: 2026-10-17T16:35:00+09:00
project: golf-next
summary: onetheclub 단일 세션 충돌(옛 write-loss) 해결·직렬 dispatch, 오크밸리 문장형 그린피 파서, 모바일 날짜·바로가기 줄바꿈. 7ca4530 운영 배포·확인 완료.
---

## Session Digest

신라CC가 내일(10-18) 사이트 39건인데 운영 0건이던 원인은 onetheclub 회원 계정 단일 세션이었다. 날짜별 `/api/scrape/club`이 동시에 로그인해 서로 밀어내고, 밀린 쪽이 본진 빈 목록으로 success를 기록해 S가 앞당겨졌다(옛 "write-loss 1~15%"의 정체). 직렬 dispatch + 빈 헤더 응답 실패 처리로 고쳤다. 성문안 「3원」은 `3~4인 시 290천원 / 2인 시 340천원`을 parseInt한 결과 — `parseOakValleyFee` 추가. 날짜 탭 2줄·바로가기 화면 밖 밀림도 수정.

## Progress

**완료**
- `onetheclub.ts`: `span.company_name` 비거나 non-200이면 throw, 본진·제휴 오류 삼킴 제거
- `/api/scrape`: `SINGLE_SESSION_CLUBS={onetheclub}` 날짜 직렬 dispatch, `maxDuration=800`(fluid on)
- `oakvalley.ts`: `parseOakValleyFee` (천원·만천·원 단위, 2인 가격은 event, 선셋)
- `SearchBar` 날짜 nowrap·flex-1, `ClubGroupView` 헤더 min-w-0 + 모바일에서 지역 배지·「바로가기」 글자 숨김
- 테스트 626 통과, tsc/lint/build 통과, `7ca4530` push → Vercel READY
- 운영 확인(16:27 KST 수동 수집 job 33648~33651): onetheclub 날짜별 duration 1.6~2.4s 순차, 10-18 신라 39·10-21 신라 11, 오크밸리 1만 미만 0건, 360/390px 날짜 1줄·넘침 0

## Next Steps

1. ~~onetheclub `session invalid` 실패 비율 확인~~ — 2026-10-28 확인: Vercel 쪽 10-26~28 실패 0, 러너가 지연 실행(06:58Z)으로 Vercel :00 체인에 밀린 1건(run 40647118121). 러너가 :59:20~:02:30 UTC 를 피하고 밀리면 1회 재시도하도록 수정(`onetheclub-runner.ts`)
2. 다른 로그인 클럽에 같은 단일 세션 증상이 있는지 (날짜별 빈 결과) 점검 → 있으면 `SINGLE_SESSION_CLUBS`에 추가

## Blockers

- 없음

## Watch Out

- Liveness는 클럽 단위 S. 하위 cc 실패를 삼키고 success를 내면 그 cc 행 전부 마감으로 보인다
- 10-19·10-20 신라CC는 사이트에서 실제 `[ 마감 ]` — 버그 아님
- 레이캐슬 가격 null은 사이트에 가격 표기가 없어서 정상
- 모바일에서 지역 배지를 숨겼다 (sm 이상에서만 표시)
- `.github/workflows/scrape-onetheclub.yml`은 백업 러너 — 삭제 금지
- `CLAUDE.md`는 `AGENTS.md` 심볼릭 링크

## Files Touched

- `src/lib/scrapers/onetheclub.ts`, `src/lib/scrapers/oakvalley.ts`, `src/app/api/scrape/route.ts`
- `src/components/search/SearchBar.tsx`, `src/components/results/ClubGroupView.tsx`
- `__tests__/lib/scrapers/{onetheclub,oakvalley}.test.ts`, `__tests__/api/scrape-dispatch-serial.test.ts`, `__tests__/components/{search,club-group-view}.test.tsx`
- `AGENTS.md`, `docs/DEPLOY_CRON_TELEGRAM.md`, `.github/workflows/scrape-onetheclub.yml`
