---
name: yangju-bot-allowlist
description: 양주봇 사용자 추가법 — username 불가, chat_id 캡처(vercel logs warn)→TELEGRAM_JK_ALLOWED_CHAT_IDS 콤마추가→재배포
type: project
created: 2026-06-02
---

양주 예약봇(@jonnyjhkimbot) 접근권한은 `TELEGRAM_JK_ALLOWED_CHAT_IDS`(콤마구분 숫자 chat_id allowlist, `src/lib/telegram-yangju/auth.ts`)으로만 게이트. fail-closed.

**사용자 추가 절차:**
1. 텔레그램 **username(@xxx)은 Bot API로 chat_id 변환 불가** — 대상이 @jonnyjhkimbot에 메시지 1번 보내야 id 확보됨.
2. 미등록 chat은 webhook 상단(`route.ts`)에서 200 OK + 무처리 + `log.warn('yangju webhook: chat not allowlisted',{chatId})` 기록.
3. **chat_id 캡처**: `vercel logs <prod-url> --scope hjsh` 실시간 tail 중 대상이 메시지 전송 → warn 줄에서 chatId 추출. (vercel logs는 실시간만, 과거조회 X. webhook 활성이라 getUpdates는 `Conflict` — deleteWebhook 금지.)
4. **allowlist 갱신**: Vercel env(scope hjsh, production) `vercel env rm` 후 `vercel env add`(in-place update 없음). 로컬 .env도 동일.
5. **재배포 필수**: `vercel redeploy <prod-url> --scope hjsh`. env는 deploy 스냅샷이라 미재배포 시 미반영. ([[vercel-env-quote-trap]])

**Why:** allowlist가 유일 인증. 봇 토큰 분리는 청중 격리일 뿐 인증 아님 — 봇 찾은 누구나 메시지 가능, allowlist 없으면 owner 계정으로 실예약(취소불가) 트리거 가능.

**How to apply:** "양주봇에 누구 추가" 요청 = 위 5단계. 절대 username으로 바로 못 넣음. 알려진 chat_id: `5893350521`(owner/inter349), `8407185514`(jonnyjhkim, 2026-06-02 추가). **YANGJU_BOOK_LIVE=1 실예약 ON 상태이므로 추가 사용자도 실제 예약 가능** — 권한 부여 전 사용자에게 경고.
