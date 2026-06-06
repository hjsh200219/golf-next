---
created: 2026-06-06T14:25:00+09:00
project: golf-next
summary: 텔레그램 인라인 키보드 다열 배치 — 날짜 3개/행, 골프장·시간대 2개/행
---

## Session Digest

텔레그램 봇 인라인 키보드가 모두 한 줄 1개라 스크롤이 길던 문제를 다열 배치로 수정. `chunk<T>(items, size)` 헬퍼(`src/lib/telegram/keyboards.ts`)를 신설해 3개 키보드에 적용: 날짜 3개/행(`dateKeyboard`, `bookDateKeyboard`), 골프장 2개/행(`clubKeyboard`), 시간대 2개/행(`timeRangeKeyboard`). 공유 함수(`dateKeyboard`·`timeRangeKeyboard`)는 메인 33-club 봇과 양주봇 /watch 양쪽에 동시 적용됨. 2개 커밋으로 분리 push(`8d6b59a` 날짜, `d82654e` 골프장·시간대). TDD(Red→Green), 전 단계 검증 통과.

## Progress

**완료**
- `chunk<T>()` 헬퍼 + 컬럼 상수(`DATE_COLUMNS=3`, `CLUB_COLUMNS=2`, `RANGE_COLUMNS=2`)
- `dateKeyboard` 3개/행 (30개 → 10줄)
- `bookDateKeyboard` 3개/행 (양주 /book)
- `clubKeyboard` 2개/행 (메인 봇 골프장 선택)
- `timeRangeKeyboard` 2개/행 (6버킷 → 3줄)
- 테스트: 행당 버튼 수 + flatten 후 총개수 검증 (telegram/yangju keyboards + webhook)
- 검증: lint 0/0, tsc clean, test 567 pass/1 skip, build RC=0
- push: `8d6b59a`(날짜) → `d82654e`(골프장·시간대), origin/main

## Next Steps

1. **Vercel 배포 확인** — `d82654e` 자동 배포 빌드 성공 여부.
2. (선택) 실 텔레그램에서 4종 키보드 다열 렌더 육안 확인.

## Blockers

- 없음.

## Watch Out

- `dateKeyboard`·`timeRangeKeyboard`는 **공유 함수** — 메인 33-club 봇에도 동일 적용(의도된 동일 개선). 양주봇 전용 아님.
- `clubKeyboard`는 메인 봇 전용 (양주봇 /watch엔 골프장 단계 없음).
- callback_data는 청킹과 무관(버튼 재그룹핑만) — 64바이트·round-trip 테스트 영향 없음.
- 컬럼 수 조정은 `keyboards.ts` 상단 `*_COLUMNS` 상수만 바꾸면 됨.

## Files Touched

- `src/lib/telegram/keyboards.ts`
- `src/lib/telegram-yangju/keyboards.ts`
- `__tests__/lib/telegram/keyboards.test.ts`
- `__tests__/lib/telegram-yangju/keyboards.test.ts`
- `__tests__/api/telegram-webhook.test.ts`
