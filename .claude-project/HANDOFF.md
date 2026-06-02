---
created: 2026-06-02T12:15:00+09:00
project: golf-next
summary: 양주봇 2번째 사용자 jonnyjhkim(chat_id 8407185514) allowlist 추가·재배포 완료. 코드 변경 없음(env-only). Phase 7 사람 감독 첫 실예약은 여전히 미완료.
---

## Session Digest

양주 예약봇(@jonnyjhkimbot)에 **2번째 인가 사용자 추가** 세션. jonnyjhkim chat_id를 vercel logs warn(`chat not allowlisted`)에서 라이브 캡처(8407185514), `TELEGRAM_JK_ALLOWED_CHAT_IDS`를 `5893350521,8407185514`로 갱신(Vercel prod + 로컬 .env), prod 재배포(golfshin.vercel.app alias). **코드 파일 변경 0 — env-only.** 부수로 golf-next Vercel 링크 stale 교정(무료팀→hjsh 유료팀 이전 반영, .vercel/project.json 재연결).

## Progress

### 완료 (이번 세션)
- **사용자 추가**: jonnyjhkim(8407185514) allowlist 등록. 방식=대상이 봇에 메시지→vercel logs에서 chat_id 캡처→env 콤마추가→재배포. ([[yangju-bot-allowlist]])
- **Vercel 링크 교정**: golf-next가 sh-consulting-free→hjsh(유료) 이전됨. 로컬 project.json orgId stale → `vercel link --scope hjsh` 재연결, env pull 정상화(53 vars).
- env/vercel-config는 gitignored → git 코드 변경 없음.

### 이월 (이전 세션부터 미완료)
- **Phase 7 — 사람 감독 첫 실예약 1건** (사용자 직접). 실예약 ON(YANGJU_BOOK_LIVE=1, Vercel prod). 다음 [예약 확정] 탭=진짜 예약.

## Next Steps (우선순위)
1. **[P0/사용자] 첫 실예약 1건** — 봇 /book→실제 슬롯→확정. "✅ 예약 요청 완료"면 양주 my_golfreslist 실제 반영 확인. 잘못되면 양주 사이트서 수동 취소(봇 취소 없음).
2. **[검증] golfuser_name 빈값 실예약 성립 여부** — 첫 실예약서만 확정. 실패 시 BOOKER_NAME 부활 등 코드 보완.
3. **[검증] 만료 PW 세션이 resOk까지 받나** — 첫 실예약서 확정. 안 되면 PW 로테이션. ([[yangju-pw-expiry-usable]])
4. **[P1] 실 Postgres 동시성 테스트** — 동시 confirm·distinct claim. 유닛 목은 partial-unique/CAS 재현 불가.

## Blockers
- 없음. 봇 전 기능 가동, 2명 인가(owner + jonnyjhkim). 첫 실예약은 사용자 액션 대기.

## Watch Out
- **실예약 ON (YANGJU_BOOK_LIVE=1, Vercel prod).** 다음 [예약 확정]=진짜 예약. 하루 3건 캡. **allowlist=5893350521,8407185514 (2명).** 취소 봇 없음→양주 사이트 수동. **추가 사용자도 owner 계정으로 실예약 가능** — 권한 부여 시 경고 필수.
- **사용자 추가는 username 불가** — 숫자 chat_id 필요, vercel logs warn에서 캡처. env 변경 후 **재배포 필수**(scope hjsh). ([[yangju-bot-allowlist]] [[vercel-env-quote-trap]])
- **golf-next는 hjsh(sh-consulting 유료)팀 소속** — Vercel 작업 시 `--scope hjsh`. 무료팀 scope로는 "project transferred" 실패.
- **로컬은 DRY-RUN 유지**(.env에 BOOK_LIVE 없음) — 로컬 개발 실수 예약 방지.
- **euc-kr=응답 디코드 전용. 예약 POST 본문=UTF-8 form.** cmd=ins. golfuser_name 빈값.
- **migration 승인제** — supabase/migrations 임의 변경 금지(012 적용 완료).

## Files Touched (이번 세션 — git 코드 변경 없음)
- `.env`, `.vercel/project.json` (gitignored): allowlist 갱신, 링크 교정
- Vercel env (코드 아님): TELEGRAM_JK_ALLOWED_CHAT_IDS=5893350521,8407185514
- `.claude-project/` (이 pack): HANDOFF + yangju-bot-allowlist 메모리
