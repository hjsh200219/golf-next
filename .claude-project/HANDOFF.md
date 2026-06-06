---
created: 2026-06-06T15:05:00+09:00
project: golf-next
summary: 텔레그램 인라인 키보드 전면 다열화 — 양주봇 빈자리 슬롯까지 2개/행 완료
---

## Session Digest

텔레그램 봇 인라인 키보드가 모두 한 줄 1개라 스크롤이 길던 문제를, 신설한 `chunk<T>(items, size)` 헬퍼(`src/lib/telegram/keyboards.ts`)로 다열 배치해 해결. 메인 봇·양주봇 양쪽 모든 선택/목록 키보드에 적용 완료. 3개 커밋 분리 push: 날짜(`8d6b59a`), 골프장·시간대(`d82654e`), 양주 빈자리 슬롯(`3cc8202`). 전부 TDD(Red→Green), 검증 통과.

## Progress

**완료 — 키보드별 컬럼 배치**
- `dateKeyboard` 3개/행 (공유: 메인 + 양주 /watch 날짜)
- `bookDateKeyboard` 3개/행 (양주 /book 날짜)
- `clubKeyboard` 2개/행 (메인 /watch 골프장 — 양주엔 골프장 단계 없음)
- `timeRangeKeyboard` 2개/행 (공유: 메인 + 양주 /watch 시간대)
- `slotListKeyboard` 2개/행 (양주 /book 빈자리 티오프 슬롯)
- 컬럼 상수: `DATE_COLUMNS=3`, `CLUB_COLUMNS=2`, `RANGE_COLUMNS=2`; slot은 리터럴 2
- 검증: lint 0/0, tsc clean, test 568 pass/1 skip, build RC=0
- push 3건 완료, origin/main HEAD `3cc8202`

## Next Steps

1. **Vercel 배포 확인** — `3cc8202` 자동 배포 성공 여부.
2. (선택) 실 텔레그램 육안 확인 — 양주봇 /watch·/book 전 화면 다열 렌더.

## Blockers

- 없음.

## Watch Out

- `dateKeyboard`·`timeRangeKeyboard`는 **공유 함수** — 메인 33-club 봇에도 동일 적용(의도된 동일 개선).
- `clubKeyboard`는 메인 봇 전용. `slotListKeyboard`·`bookDateKeyboard`는 양주봇 전용.
- `confirmKeyboard`(예약 확정, 버튼 1개)는 다열 무의미 → 미변경.
- callback_data는 청킹과 무관(버튼 재그룹핑만) — 64바이트·round-trip 테스트 영향 없음.
- 컬럼 수 조정: `telegram/keyboards.ts` 상단 `*_COLUMNS` 상수 + `slotListKeyboard`의 `chunk(buttons, 2)`.

## Files Touched

- `src/lib/telegram/keyboards.ts`
- `src/lib/telegram-yangju/keyboards.ts`
- `__tests__/lib/telegram/keyboards.test.ts`
- `__tests__/lib/telegram-yangju/keyboards.test.ts`
- `__tests__/api/telegram-webhook.test.ts`
