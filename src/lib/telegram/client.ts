import { createLogger } from '@/lib/logger';

const logger = createLogger('telegram/client');

interface TelegramResponse {
  ok: boolean;
  description?: string;
}

function baseUrl(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }
  return `https://api.telegram.org/bot${token}`;
}

async function call(method: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${baseUrl()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data: TelegramResponse | null = null;
  try {
    data = (await res.json()) as TelegramResponse;
  } catch {
    data = null;
  }

  if (!res.ok || !data || data.ok === false) {
    logger.error('telegram api error', {
      method,
      status: res.status,
      description: data?.description,
    });
    throw new Error(`Telegram ${method} failed: ${res.status} ${data?.description ?? ''}`.trim());
  }
}

export async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: object,
  parseMode?: 'HTML' | 'MarkdownV2',
): Promise<void> {
  await call('sendMessage', {
    chat_id: chatId,
    text,
    ...(parseMode ? { parse_mode: parseMode } : {}),
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await call('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

export async function setWebhook(url: string, secretToken: string): Promise<void> {
  await call('setWebhook', {
    url,
    secret_token: secretToken,
    allowed_updates: ['message', 'callback_query'],
  });
}
