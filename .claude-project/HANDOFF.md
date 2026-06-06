---
created: 2026-06-06T16:15:00+09:00
project: golf-next
summary: 텔레그램 키보드 다열화 + harness-gc Run #2 부채 상환(P5/P6/P7) 완료
---

## Session Digest

두 갈래 작업. (1) 텔레그램 인라인 키보드 전면 다열화 — `chunk()` 헬퍼로 날짜 3개/행, 골프장·시간대·빈자리슬롯 2개/행 (메인봇 + 양주봇). (2) harness-gc Run #2 실행 → 문서 신선도 수정 + 수동 권장 5건(P7 knip 도입, P6 coverage gate, P1/P2 AGENTS.md 압축, telegram-yangju 문서화, 매직넘버 상수화) 전부 적용. `npm run gc` exit 0, Vercel 배포 검증 완료. HEAD `1567fcf`.

## Progress

**완료 — 키보드 다열화 (커밋 8d6b59a, d82654e, 3cc8202)**
- 5개 키보드 chunk 적용: dateKeyboard/bookDateKeyboard 3/행, clubKeyboard/timeRangeKeyboard/slotListKeyboard 2/행

**완료 — harness-gc Run #2 + 부채 상환 (커밋 1567fcf)**
- 문서 수치: AGENTS.md "33→34 scrapers", UNIMPLEMENTED 날짜 갱신
- P7: knip + knip.json(Next/Vitest) + `npm run dead-code`/`npm run gc` 스크립트 + undici/iconv-lite 명시
- P6: vitest coverage thresholds (floor 35/70/65, 현재 37/76/69 통과)
- P1/P2: AGENTS.md 196→118줄, Behavioral Guidelines → docs/harness/llm-coding-principles.md 분리
- 문서화: telegram-yangju 봇 ARCHITECTURE.md/AGENTS.md 추가
- 코드: keyboards.ts 매직넘버 → DATE_COLUMNS/SLOT_COLUMNS 상수
- 검증: npm run gc exit 0, Vercel install+build 클린(added 22 pkgs, 44s)

## Next Steps

1. **knip 고아 파일 6개 결정 (사용자 판단)** — `src/components/{auth/AuthGuard, map/ClubMarker, map/GolfMap, map/MapTooltip, results/TeeTimeCard}.tsx`, `src/lib/constants/club-mappings.ts`. import 0건. ARCHITECTURE.md는 club-mappings.ts를 "key file"로 문서화(불일치). **연결(wire-up) or 제거** 결정 후 `knip`을 `npm run gc`에 편입하면 P7 만점화.
2. (선택) coverage 점진 상향 — 미테스트 영역(app pages, supabase client, components) 테스트 추가 시 thresholds 올림.

## Blockers

- 없음.

## Watch Out

- **knip은 `gc` gate에 미편입** — 고아 파일 6개가 미해결이라 의도적으로 `dead-code` 스크립트로만 분리. 고아 파일 정리 후 gc에 `&& npm run dead-code` 추가.
- knip 잔여 findings 중 `normalizeDisplayCcName`/타입 export 6개는 내부 사용/공개 API 동반 타입 → 무해(삭제 불필요).
- coverage thresholds는 `vitest run --coverage`(test:coverage)에서만 평가. `npm test`/`gc`/pre-commit은 plain `vitest run`이라 영향 없음.
- 키보드 컬럼 수: `telegram/keyboards.ts`의 `DATE_COLUMNS`/`CLUB_COLUMNS`/`RANGE_COLUMNS` + `telegram-yangju/keyboards.ts`의 `SLOT_COLUMNS`.

## Files Touched

- src/lib/telegram/keyboards.ts, src/lib/telegram-yangju/keyboards.ts
- __tests__/lib/telegram/keyboards.test.ts, __tests__/lib/telegram-yangju/keyboards.test.ts, __tests__/api/telegram-webhook.test.ts
- AGENTS.md, ARCHITECTURE.md, docs/UNIMPLEMENTED_CLUBS.md, docs/harness/gc-history.md, docs/harness/llm-coding-principles.md (신규)
- knip.json (신규), package.json, package-lock.json, vitest.config.ts
