---
created: 2026-06-02T10:00:00+09:00
project: golf-next
summary: 양주CC 예약 봇 실가동 — webhook 연결·env 전종 동기화·migration 012 적용·실예약(YANGJU_BOOK_LIVE=1) 활성화. DRY-RUN 전 플로우 검증 완료. 남은 건 사람 감독 첫 실예약 1건뿐.
---

## Session Digest

이전 세션의 양주 예약 봇(코드 Phase 1~6 완성)을 **실제 가동 상태로 전환**한 세션. BotFather 봇(@jonnyjhkimbot, chat_id 5893350521) 연결, env 전종 등록, migration 012 prod 적용, 코드 보정 3건(pw-expiry 통과·/book 날짜선택·D+30), 마지막에 실예약 플래그 활성화. 텔레그램에서 /book→날짜→슬롯→확정 DRY-RUN 전체 플로우 검증됨. 현재 prod는 실예약 ON.

## Progress

### 완료
- **webhook 연결**: setWebhook → `golfshin.vercel.app/api/telegram/yangju/webhook` (secret 검증·allowlist 게이트 401/200 라이브 확인).
- **env 전종 (Vercel prod + 로컬, BOOK_LIVE 제외 로컬)**: TELEGRAM_JK_BOT_TOKEN, TELEGRAM_JK_WEBHOOK_SECRET, TELEGRAM_JK_ALLOWED_CHAT_IDS=5893350521, YANGJU_ID, YANGJU_PW, YANGJU_BOOKER_TEL=01080028080, TAEKWANG_ENC_ID/PW. **YANGJU_BOOK_LIVE=1 은 Vercel prod만**(로컬 미설정=DRY-RUN).
- **migration 012 apply**: `supabase db push` → remote 012 적용. yangju_reservation_watches/attempts 양쪽 200 OK.
- **코드 보정 3건 (전부 push)**:
  - `d45fbf8` pw-expiry는 실패 아님 — 양주가 만료 PW로도 세션 발급(라이브 프로빙 확인). login() throw→통과+warn. 성공신호=환영합니다 OR 만료alert.
  - `88aa809` /book 날짜선택(b|date| namespace, D+1~). 이전엔 내일 고정.
  - `850045f` 예약 가능 범위 D+14→D+30 (telegram/time.ts datesInRange/isDateInRange — 양쪽 봇 공유).
  - `BOOKER_NAME` 제거(0b3c8e6): raw 캡처 golfuser_name 빈값 = 서버가 세션서 채움.
- **DRY-RUN 전 플로우 검증**: /book→날짜→슬롯목록([예약])→확정→"[DRY-RUN] 예약 본문 준비 완료". 안전장치(인증·allowlist·CAS·preflight) 다 작동.
- 전체 559 pass/1 skip(59 files), tsc·lint·build clean. push HEAD=850045f.

### 미완료
- **Phase 7 — 사람 감독 첫 실예약 1건** (사용자 직접). 실예약 ON 상태라 다음 [예약 확정] 탭=진짜 예약.

## Next Steps (우선순위)
1. **[P0/사용자] 첫 실예약 1건** — 봇 /book→실제 칠 슬롯→확정. 응답 "✅ 예약 요청 완료"면 양주 my_golfreslist에서 실제 들어갔나 확인. 잘못되면 양주 사이트서 수동 취소(봇 취소 없음).
2. **[검증] golfuser_name 빈값 실예약 성립 여부** — 첫 실예약서만 확정(캡처는 실행 안 됐었음). 실패 시 에러 메시지로 원인 노출 → 코드 보완(예: BOOKER_NAME 부활).
3. **[검증] 만료 PW 세션이 resOk까지 받나** — 동일, 첫 실예약서 확정. 안 되면 PW 로테이션 필요.
4. **[P1] 실 Postgres 동시성 테스트** — 동시 confirm(1만)·동시 distinct claim(캡). 유닛 목은 partial-unique/CAS 재현 불가(reviewer 후속).

## Blockers
- 없음. 봇 전 기능 가동. 첫 실예약은 사용자 액션 대기.

## Watch Out
- **실예약 ON (YANGJU_BOOK_LIVE=1, Vercel prod).** 다음 [예약 확정]=진짜 예약. 하루 3건 캡. allowlist=5893350521만. 취소 봇 없음→양주 사이트 수동.
- **로컬은 DRY-RUN 유지**(.env.local에 BOOK_LIVE 없음) — 로컬 개발 실수 예약 방지.
- **euc-kr=응답 디코드 전용. 예약 POST 본문=UTF-8 form(URLSearchParams). pointname만 escape()-후-form-encode(동→%25uB3D9).** cmd=ins(md 아님). golfuser_name 빈값. ([[euckr-post-body-encoding]])
- **pw-expiry 통과 설계**: login()이 만료를 성공처리(warn). 만료 상태로 예약되는지는 첫 실예약서 확정. 안 되면 throw 복원+PW 로테이션.
- **이중예약 방지**: 결정적키 {chat|date|tee|course}+INSERT먼저+CAS. 알림↔/book cb 포맷 동일(slot-format.ts)=같은 키. ([[teetime-liveness-invariant]] 아님—telegram 멱등은 attempts 테이블)
- **양주 예약 오픈 ~D+20** (D+30 버튼 주나 그 이후는 "빈자리 없음", 시점따라 열림).
- **migration 승인제** — supabase/migrations 임의 변경 금지(012 적용 완료).
- **.omc/plans/ gitignored** — yangju-reservation-bot.md(계획)·yangju-bot-progress.md 로컬만.

## Files Touched (이번 세션 커밋: d45fbf8, 88aa809, 850045f, 0b3c8e6 — 전부 push)
- src/lib/telegram-yangju/{reservation-client,keyboards,booker,slot-format}.ts
- src/app/api/telegram/yangju/webhook/route.ts
- src/lib/telegram/time.ts (D+30)
- __tests__/lib/telegram-yangju/*, __tests__/lib/telegram/{time,keyboards}.test.ts, __tests__/api/telegram*.test.ts
- supabase/migrations/012 (prod apply)
- Vercel env (코드 아님): YANGJU_BOOK_LIVE=1 등 전종
