---
name: vercel-env-quote-trap
description: Vercel env 값 따옴표 오염 + 재배포 필요 — "webhook 200인데 봇 무응답" 진단법
type: reference
created: 2026-06-01
---

`vercel env add KEY env`로 값 넣을 때 `.env.local`에서 `cut -d= -f2-`로 읽으면 **값 감싼 따옴표까지 포함**된다 (`TELEGRAM_BOT_TOKEN="8821...htg"` → 토큰에 `"` 포함, 길이 48 vs 46). Vercel이 그 따옴표를 값 일부로 저장 → 런타임 `process.env.X`가 따옴표 포함 문자열 → telegram getMe/sendMessage 404. sendMessage가 webhook handler try/catch에 삼켜져 **"HTTP 200인데 봇 무응답"** 증상.

두 번째 함정: **env 추가는 재배포해야 반영**. 기존 배포는 옛 env로 빌드돼 새 secret 못 봄 → webhook `process.env.TELEGRAM_WEBHOOK_SECRET` undefined → 무조건 401. telegram `getWebhookInfo`의 `last_error_message: "Wrong response from the webhook: 401 Unauthorized"`로 확인됨.

**Why:** Next/tsx dotenv 로더는 따옴표 자동 제거하지만 쉘 `cut`/직접 주입은 안 함 → 로컬(tsx) 멀쩡, prod만 깨지는 green-local/dead-prod.

**How to apply:**
- 쉘에서 env 읽을 때 따옴표 strip: `sed -E 's/^["'"'"']//; s/["'"'"']$//'`.
- Vercel env 변경 후 반드시 재배포: `vercel redeploy <prod-url> --scope hjsh`. **이 프로젝트 scope=`hjsh`** (CLI 기본 `teoul`과 다름 — `--scope hjsh` 필수, 아니면 "Can't find deployment under context teoul").
- webhook 핸들러가 에러 삼키므로 HTTP 200만 보고 정상 판단 금지 → `vercel logs <deployment> --scope hjsh`로 실제 에러, `getWebhookInfo` last_error, `getMe`로 토큰 유효성 확인.
- 봇 chat_id 추출: `deleteWebhook` → `getUpdates` → `setWebhook`(secret_token 포함) 복구.
- 관련: [[postgrest-partial-index-upsert-trap]] (같은 green-test/dead-prod 계열).
