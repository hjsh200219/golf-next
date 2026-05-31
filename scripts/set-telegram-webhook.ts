/**
 * 텔레그램 봇 웹훅 1회 등록 스크립트.
 *
 * 배포 후 1회 실행해 Telegram 봇의 웹훅 URL과 secret_token을 설정한다.
 * secret_token은 매 웹훅 호출 시 X-Telegram-Bot-Api-Secret-Token 헤더로 전달되며,
 * /api/telegram/webhook 라우트가 이 값을 검증한다.
 *
 * 사용:
 *   APP_URL=https://golf-next.vercel.app \
 *   TELEGRAM_BOT_TOKEN=... \
 *   TELEGRAM_WEBHOOK_SECRET=... \
 *   npx tsx scripts/set-telegram-webhook.ts
 *
 * 환경변수 (필수):
 *   APP_URL                  배포 URL (끝에 / 없이)
 *   TELEGRAM_BOT_TOKEN       봇 토큰
 *   TELEGRAM_WEBHOOK_SECRET  웹훅 검증용 시크릿 (Vercel env에도 동일하게 설정)
 */

async function main() {
  const appUrl = process.env.APP_URL;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!appUrl || !token || !secret) {
    console.error(
      'Missing env. Required: APP_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET',
    );
    process.exit(1);
  }

  const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/telegram/webhook`;

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ['message', 'callback_query'],
    }),
  });

  const body = (await res.json()) as { ok: boolean; description?: string };

  if (!res.ok || !body.ok) {
    console.error('setWebhook failed:', body.description ?? res.statusText);
    process.exit(1);
  }

  console.log(`Webhook set: ${webhookUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
