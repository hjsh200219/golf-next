import { createLogger } from '@/lib/logger';

const logger = createLogger('telegram/client');

interface TelegramResponse {
  ok: boolean;
  description?: string;
}

/**
 * Telegram API base URL. `token` defaults to `TELEGRAM_BOT_TOKEN` (the existing
 * GolfShin bot); pass an explicit token (e.g. `TELEGRAM_JK_BOT_TOKEN`) to drive a
 * second bot through this same client. The default (no-arg) path is unchanged.
 */
function baseUrl(token?: string): string {
  const t = token ?? process.env.TELEGRAM_BOT_TOKEN;
  if (!t) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }
  return `https://api.telegram.org/bot${t}`;
}

async function call(
  method: string,
  payload: Record<string, unknown>,
  token?: string,
): Promise<void> {
  const res = await fetch(`${baseUrl(token)}/${method}`, {
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
  token?: string,
): Promise<void> {
  await call(
    'sendMessage',
    {
      chat_id: chatId,
      text,
      ...(parseMode ? { parse_mode: parseMode } : {}),
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    },
    token,
  );
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  token?: string,
): Promise<void> {
  await call(
    'answerCallbackQuery',
    {
      callback_query_id: callbackQueryId,
      ...(text ? { text } : {}),
    },
    token,
  );
}

export async function setWebhook(url: string, secretToken: string, token?: string): Promise<void> {
  await call(
    'setWebhook',
    {
      url,
      secret_token: secretToken,
      allowed_updates: ['message', 'callback_query'],
    },
    token,
  );
}

/** Remove (or replace) an inline keyboard on a sent message — used to disable the
 * [예약] button after a tap so it can't be re-pressed (cosmetic; the durable guard
 * is the attempts-table CAS). */
export async function editMessageReplyMarkup(
  chatId: number,
  messageId: number,
  replyMarkup?: object,
  token?: string,
): Promise<void> {
  await call(
    'editMessageReplyMarkup',
    {
      chat_id: chatId,
      message_id: messageId,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    },
    token,
  );
}
