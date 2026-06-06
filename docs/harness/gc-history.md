# GC History -- GolfShin

## 2026-04-03 (Run #1)
- 모드: full
- 문서 신선도: 82% (수정 후 100%)
- 아키텍처 준수율: 100%
- 품질 등급: B+
- 하네스 성숙도: L4 (77.7점) -- A: 8.0 / B: 8.0 / C: 8.33 / D: 6.5
- 약점 원칙: P8 (6점), P7 (7점), P5 (7점)
- 발견 이슈: 9건 (즉시 수정: 6, 수동 검토: 3)
- 반복 드리프트: 없음 (첫 실행)
- 예방 스크립트 생성/갱신: N (추후 권장)

## 2026-06-06 (Run #2)
- 모드: full
- 문서 신선도: 89% (24/27) → 수정 후 ~96%
- 아키텍처 준수율: 100% (227/227 import, lint+tsc 통과)
- 품질 등급: B / B-
- 하네스 성숙도: L3 (69.1점) -- A: 7.25 / B: 7.67 / C: 6.67 / D: 5.50
- 약점 원칙: P7 (4점), P5 (6점), P6 (6점)
- 발견 이슈: 자동수정 3건(AGENTS.md 33→34 x2, UNIMPLEMENTED 날짜), 수동 검토 5건
- 반복 드리프트: scraper_count (⚠️ Run#1부터 pending), agents_md_length (101→196줄 재인라인)
- 예방 스크립트 생성/갱신: Y (사용자 승인 후 적용 — 아래 Remediation)
- 비고: L4→L3 강등은 코드 회귀 아님 — P7 앵커 강화(knip 요구)+회의적 재채점 정규화 효과. 실측 지표 전부 상향(테스트 359→568, logger 11→18파일, any 0건). P7(knip/gc-script 갭) Run#1부터 만성.
- 하네스 메타 검증: 해당 없음 (3회 미만)

### Remediation (Run #2 post-audit, 사용자 승인)
- P7: `knip` 설치 + `knip.json`(Next/Vitest 플러그인) + `npm run dead-code`(knip) + `npm run gc`(lint+tsc+test+build) 스크립트 신설. 미선언 의존성 `undici`(dep)/`iconv-lite`(devDep) 명시화.
- P6: `vitest.config.ts` coverage thresholds 추가 (회귀 floor: stmts/lines 35, branches 70, functions 65 — 현재 37/76/69 통과).
- P1/P2: AGENTS.md 196→118줄 압축 — Behavioral Guidelines(66줄)를 `docs/harness/llm-coding-principles.md`로 분리·참조화, 중복 `## TDD 필수` 섹션 통합.
- 문서화: telegram-yangju 봇(@jonnyjhkimbot) ARCHITECTURE.md/AGENTS.md에 추가 (봇 2개 구조).
- 코드: telegram-yangju/keyboards.ts 매직넘버(2/3)→`DATE_COLUMNS`(export 승격)/`SLOT_COLUMNS` 상수.
- 검증: `npm run gc` exit 0 (lint 0/0, tsc clean, test 568 pass, build OK).
- **미해결(사용자 결정 필요, 삭제 금지)**: knip이 보고한 고아 파일 6개 — `src/components/{auth/AuthGuard, map/ClubMarker, map/GolfMap, map/MapTooltip, results/TeeTimeCard}.tsx`, `src/lib/constants/club-mappings.ts`(ARCHITECTURE.md엔 "key file"로 문서화돼 있으나 import 0건). + 관련 `@types/google.maps` devDep. 연결(wire-up) 또는 제거 결정 후 `knip`을 `gc`에 편입 권장.
