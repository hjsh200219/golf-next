---
created: 2026-06-02T08:05:00+09:00
project: golf-next
summary: 양주CC 예약 텔레그램 봇 전체 구현 완료(Phase 1~6, 73 테스트, 554 pass) + 푸시 + Vercel env 5종 동기화. 남은 건 전부 사용자 액션 게이트(BotFather/PW로테이션/migration apply/실예약).
---

## Session Digest

신규 양주CC 전용 2번째 텔레그램 봇(빈자리 알림 + 알림/조회에서 [예약] 버튼 반자동 예약) 전체 구현. ralplan 합의(Planner→Architect→Critic, 2회전 iterate 후 APPROVE) → Phase별 TDD 구현 → Phase마다 code-reviewer(opus) 독립 리뷰 → 수정 → 검증. 되돌릴 수 없는 외부 예약이라 안전성 최우선. 커밋 `d31ef67` push 완료. Vercel prod env 5종 등록. **실예약은 통틀어 0건**(Phase 7 사람 감독 전까지 유지).

세션 중 결정적 발견: 사용자가 real_resOk.asp 실제 cURL 제공 → euc-kr 요청-본문 가설 전복(실제는 UTF-8 form-encode, pointname만 escape()-후-form-encode 이중인코딩). 메모리 `euckr-post-body-encoding.md`로 정정.

## Progress

### 완료 (코드 100% — Phase 1~6)
| Phase | 내용 | 리뷰 |
|------|------|------|
| 1a/1b | resok-payload(jsEscape+buildResOkBody byte-for-byte vs 실캡처), booker, auth | APPROVE |
| 2 | reservation-client(login 이중throw/fetchSlots/checkMyBookings fail-closed/submitReservation fail-closed live gate) | APPROVE (irreversible fn) |
| 3 | migration 012(2테이블 RLS) + watches + attempts(결정적키+CAS+캡) + types | APPROVE |
| 4 | client.ts baseUrl(token?)+editMessageReplyMarkup, keyboards, webhook(allowlist→claim→CAS→preflight→submit) | APPROVE |
| 5+6 | check cron(JK토큰 알림+[예약]버튼) + vercel.json 3rd cron + slot-format(seam) + build | APPROVE |

검증: 554 pass/1 skip(59 files), tsc+lint+build clean. 커밋 d31ef67 push. Vercel env 5종(TELEGRAM_JK_BOT_TOKEN, YANGJU_ID, YANGJU_PW, TAEKWANG_ENC_ID/PW) prod 등록.

### 미완료 — 전부 사용자 액션 게이트 (코드 더 못 감)

## Next Steps (우선순위)
1. **[P0] BotFather** — 2번째 봇 등록 → TELEGRAM_JK_BOT_TOKEN 발급(현재 .env.local 값이 맞는지 확인). webhook 설정: `setWebhook(https://<도메인>/api/telegram/yangju/webhook, <secret>, <jkToken>)`.
2. **[P0] 나머지 env 4종 (로컬에도 없음 — 값 생성 필요, 전부 봇 동작에 필수)**: TELEGRAM_JK_WEBHOOK_SECRET(webhook 인증, 없으면 모든 요청 401), TELEGRAM_JK_ALLOWED_CHAT_IDS(본인 chat_id, 비면 전원 거부=봇 무반응), YANGJU_BOOKER_NAME, YANGJU_BOOKER_TEL(예약 payload — 없으면 getBooker throw=예약 실패). .env.local + Vercel 양쪽.
3. **[P0] YANGJU 계정 PW 로테이션** — 현재 만료(`비밀번호 변경기간 경과`). login() distinct throw 중. 로테이션 후 YANGJU_PW 갱신(.env.local + Vercel).
4. **[P1] migration 012 prod 적용** — supabase에 `012_yangju_reservation.sql` apply.
5. **[P1] 실제 Postgres 동시성 통합테스트** — 동시 confirm(1만 성공)+동시 distinct-slot claim(캡). 유닛 목은 partial-unique/CAS 재현 불가.
6. **[P2] Phase 7 — 사람 감독 첫 실예약** — YANGJU_BOOK_LIVE=1, /book, DRY-RUN 확인 후 1건 실예약, my_golfreslist 검증. golfuser_name 빈값 동작 실증. **절대 자동화 금지.**

## Blockers
- 코드 블로커 없음(전부 push).
- 실예약 동작은 Next Steps 1~4(특히 PW 로테이션) 완료 전까지 차단. YANGJU_BOOK_LIVE 미설정 = DRY-RUN.

## Watch Out
- **euc-kr는 응답-디코드 전용. 예약 POST 본문은 UTF-8 form(URLSearchParams). pointname만 escape()-후-form-encode(동→%25uB3D9).** 첫필드 cmd=ins(md 아님). golfuser_name 빈값 전송. ([[euckr-post-body-encoding]])
- **submitReservation = 유일 되돌릴수없는 함수.** fail-closed: opts.live===true AND YANGJU_BOOK_LIVE==='1' 둘 다 strict. 테스트는 real_resOk MSW 핸들러=hit하면 fail.
- **이중예약 방지**: 결정적키 {chat|date|tee|course}(pointid 제외, churns) + INSERT-먼저 + CAS pending→confirmed(tap2 가드). 알림↔/book cb 포맷 동일(slot-format.ts)로 같은 키 → seam 이중예약 불가.
- **봇 동작 필수 env 4종(JK_WEBHOOK_SECRET/ALLOWED_CHAT_IDS/BOOKER_NAME/BOOKER_TEL) 아직 미설정** — 없으면 봇이 401/무반응/예약실패. Next Steps #2.
- **양주 단일세션** — 즉시 재시도 금지. ([[yangju-single-session]])
- **migration 승인 필요** — supabase/migrations 임의 수정 금지(012는 승인받음).
- **.omc/plans/ gitignored** — yangju-reservation-bot.md(v5 계획)·yangju-bot-progress.md는 로컬만, 커밋 안 됨.
- 실예약 통틀어 0건 — Phase 7 전까지 유지.

## Files Touched (커밋 d31ef67)
- src/lib/telegram-yangju/: resok-payload, booker, auth, keyboards, watches, attempts, reservation-client, slot-format (신규 8)
- src/app/api/telegram/yangju/{webhook,check}/route.ts (신규)
- supabase/migrations/012_yangju_reservation.sql (신규)
- src/lib/telegram/client.ts, src/lib/types/database.ts, vercel.json (수정)
- __tests__/lib/telegram-yangju/* (8), __tests__/api/telegram-yangju-{webhook,check}.test.ts, __tests__/helpers/msw-server.ts, __tests__/lib/telegram/client.test.ts
