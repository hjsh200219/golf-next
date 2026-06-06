---
created: 2026-06-06T13:35:00+09:00
project: golf-next
summary: 텔레그램 날짜 선택 키보드 한 줄 3개씩 배치 (스크롤 1/3 단축)
---

## Session Digest

양주봇(@jonnyjhkimbot) `/watch` 날짜 선택 인라인 키보드가 30개 날짜를 30줄(한 줄 1개)로 표시해 스크롤이 길던 문제를 수정. `chunk()` 헬퍼를 신설해 날짜 버튼을 3개/행으로 묶어 10줄로 단축. 공유 함수 `dateKeyboard`(메인 33-club 봇 + 양주봇 /watch 공용)와 양주 전용 `bookDateKeyboard`(/book) 양쪽 적용. TDD(Red→Green), 전체 검증 통과, main push 완료(`8d6b59a`).

## Progress

**완료**
- `src/lib/telegram/keyboards.ts`: `chunk<T>(items, size)` export 헬퍼 + `DATE_COLUMNS=3` 추가, `dateKeyboard` 3개/행
- `src/lib/telegram-yangju/keyboards.ts`: `chunk` import, `bookDateKeyboard` 3개/행
- 테스트 갱신 3종: `keyboards.test.ts`(telegram), `keyboards.test.ts`(telegram-yangju), `telegram-webhook.test.ts` — flatten 후 30개 유지 + 행당 ≤3 + 행수 10 검증
- 검증: lint 0/0, tsc clean, test 565 pass/1 skip, build exit 0
- 커밋·푸시: `8d6b59a` (origin/main)

## Next Steps

1. **Vercel 배포 확인** — push 후 자동 배포. 빌드 성공 여부 확인.
2. (선택) 실제 텔레그램에서 `/watch`·`/book` 날짜 키보드가 3개/행으로 렌더되는지 육안 확인.

## Blockers

- 없음.

## Watch Out

- `dateKeyboard`는 **공유 함수** — 메인 33-club 봇 `/watch`에도 동일 적용됨(의도된 동일 개선). 양주봇 전용 아님.
- 시간대(6버킷)·골프장 선택 키보드는 미변경 (스크롤 문제 아님, 요청 범위 밖).
- callback_data는 청킹과 무관(버튼 재그룹핑만) — 64바이트·round-trip 테스트 영향 없음.

## Files Touched

- `src/lib/telegram/keyboards.ts`
- `src/lib/telegram-yangju/keyboards.ts`
- `__tests__/lib/telegram/keyboards.test.ts`
- `__tests__/lib/telegram-yangju/keyboards.test.ts`
- `__tests__/api/telegram-webhook.test.ts`
