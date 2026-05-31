import { describe, it, expect, beforeAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server, lastTelegramRequest } from '../../helpers/msw-server';

beforeAll(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
});

describe('telegram client', () => {
  it('sendMessage posts correct body', async () => {
    const { sendMessage } = await import('@/lib/telegram/client');
    const replyMarkup = { inline_keyboard: [[{ text: 'a', callback_data: 'b' }]] };
    await sendMessage(123, '안녕하세요', replyMarkup);

    const body = lastTelegramRequest<Record<string, unknown>>('sendMessage');
    expect(body).toBeDefined();
    expect(body!.chat_id).toBe(123);
    expect(body!.text).toBe('안녕하세요');
    expect(body!.reply_markup).toEqual(replyMarkup);
  });

  it('answerCallbackQuery hits the right endpoint', async () => {
    const { answerCallbackQuery } = await import('@/lib/telegram/client');
    await answerCallbackQuery('cbq-1', 'done');

    const body = lastTelegramRequest<Record<string, unknown>>('answerCallbackQuery');
    expect(body).toBeDefined();
    expect(body!.callback_query_id).toBe('cbq-1');
    expect(body!.text).toBe('done');
  });

  it('setWebhook includes secret_token and allowed_updates', async () => {
    const { setWebhook } = await import('@/lib/telegram/client');
    await setWebhook('https://example.com/hook', 'sekret');

    const body = lastTelegramRequest<Record<string, unknown>>('setWebhook');
    expect(body).toBeDefined();
    expect(body!.url).toBe('https://example.com/hook');
    expect(body!.secret_token).toBe('sekret');
    expect(body!.allowed_updates).toEqual(['message', 'callback_query']);
  });

  it('throws on non-ok Telegram response', async () => {
    server.use(
      http.post('https://api.telegram.org/bot:token/sendMessage', () =>
        HttpResponse.json({ ok: false, description: 'Bad Request' }, { status: 400 }),
      ),
    );
    const { sendMessage } = await import('@/lib/telegram/client');
    await expect(sendMessage(1, 'x')).rejects.toThrow();
  });
});
