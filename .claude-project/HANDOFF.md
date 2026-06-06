---
created: 2026-06-06T18:30:00+09:00
project: golf-next
summary: 텔레그램 봇 슬래시 커맨드 자동완성 등록(setMyCommands 스크립트 신규) + 푸시·배포 검증
---

## Session Digest

텔레그램 봇 슬래시 커맨드 자동완성 등록. `scripts/set-telegram-commands.ts` 신규 작성 → `setMyCommands` API로 메인봇·양주봇 명령어 등록 → `getMyCommands`로 검증 → 커밋 fb9dcd5 main 푸시 → Vercel 배포 `jqar8cnxs` Ready(35s) 확인. AGENTS.md에 운영 스크립트 한 줄 문서화.

## Progress

**완료 — 텔레그램 봇 슬래시 커맨드 자동완성 (커밋 fb9dcd5)**
- `scripts/set-telegram-commands.ts` 신규 (74줄, 멱등)
- `setMyCommands` API 등록:
  - 메인봇: `/watch` `/list` `/stop` `/cancel` `/help`
  - 양주봇(@jonnyjhkimbot): `/book` `/watch` `/list` `/stop` `/cancel` `/help`
- `getMyCommands` 검증 통과, gc(lint+tsc+test+build) 통과
- main 푸시 + Vercel 배포 Ready 확인
- AGENTS.md Telegram bots 섹션에 운영 스크립트 한 줄 추가
- 실행법: `TELEGRAM_BOT_TOKEN=... TELEGRAM_JK_BOT_TOKEN=... npx tsx scripts/set-telegram-commands.ts`

**미완료 — 직전 세션 이월 (knip 고아 파일 결정)**
- knip 고아 파일 6건 wire-up/제거 결정 미해결
- coverage 점진 상향 (선택, 미착수)

## Next Steps

1. **knip 고아 파일 6건 결정 (사용자 판단)** — `src/components/{auth/AuthGuard, map/ClubMarker, map/GolfMap, map/MapTooltip, results/TeeTimeCard}.tsx`, `src/lib/constants/club-mappings.ts`. import 0건. ARCHITECTURE.md는 club-mappings.ts를 "key file"로 문서화(불일치). 연결 or 제거 결정 후 `knip`을 `npm run gc` gate에 편입하면 P7 만점화.
2. (선택) coverage 점진 상향 — 미테스트 영역(app pages, supabase client, components) 테스트 추가 시 vitest thresholds 상향.

## Blockers

- 없음. 이번 세션 작업 완전 종료(커밋·푸시·배포 검증 완료).

## Watch Out

- **set-telegram-commands.ts는 일회성 수동 실행 스크립트** — CI/배포 파이프라인 미연결. 커맨드 목록이 스크립트 내부에 하드코딩됨. 핸들러(`src/lib/telegram*`)에 명령어 추가/제거 시 스크립트 목록도 함께 갱신 후 재실행해야 자동완성에 반영.
- **봇별 토큰 env 키**: 메인봇 `TELEGRAM_BOT_TOKEN`, 양주봇 `TELEGRAM_JK_BOT_TOKEN`. 클라이언트 캐시로 기존 채팅창 자동완성 갱신은 몇 분 소요(앱 재시작 시 즉시).
- **knip은 `gc` gate에 미편입** — 고아 파일 6건 미해결로 `dead-code` 스크립트로만 분리. 정리 후 gc에 `&& npm run dead-code` 추가.
- coverage thresholds는 `vitest run --coverage`(test:coverage)에서만 평가. `npm test`/`gc`/pre-commit은 plain `vitest run`이라 영향 없음.

## Files Touched

- `scripts/set-telegram-commands.ts` (신규)
- `AGENTS.md` (Telegram bots 섹션 운영 스크립트 한 줄 추가)
