import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';

/**
 * MSW server for Telegram Bot API tests.
 *
 * Opt-in per file: import this module from any Telegram test file. The lifecycle
 * hooks below register on import, and because Vitest isolates (re-evaluates) setup
 * modules per test file by default, importing here installs the server only for
 * files that opt in. The global `__tests__/setup.ts` is left untouched so the 27
 * existing test files keep running without MSW interception.
 *
 * Captured request bodies live in `telegramRequests` and are reset in `afterEach`
 * (resetHandlers does NOT clear this store, so we clear it explicitly).
 */

type TelegramMethod =
  | 'sendMessage'
  | 'answerCallbackQuery'
  | 'setWebhook'
  | 'editMessageReplyMarkup';

const captured: Record<TelegramMethod, unknown[]> = {
  sendMessage: [],
  answerCallbackQuery: [],
  setWebhook: [],
  editMessageReplyMarkup: [],
};

// Token from the most recent request per method (parsed from the `bot<token>` path
// segment) — lets guard tests assert WHICH bot token a call targeted.
const capturedToken: Partial<Record<TelegramMethod, string>> = {};

function record(method: TelegramMethod, body: unknown, token: string): void {
  captured[method].push(body);
  capturedToken[method] = token;
}

/** Read the most recent captured request body for a Telegram method. */
export function lastTelegramRequest<T = unknown>(method: TelegramMethod): T | undefined {
  const list = captured[method];
  return list.length > 0 ? (list[list.length - 1] as T) : undefined;
}

/** The bot token used by the most recent request for a Telegram method. */
export function lastTelegramToken(method: TelegramMethod): string | undefined {
  return capturedToken[method];
}

/** All captured request bodies for a Telegram method (oldest first). */
export function telegramRequests<T = unknown>(method: TelegramMethod): T[] {
  return captured[method] as T[];
}

function makeHandler(method: TelegramMethod) {
  return http.post(`https://api.telegram.org/bot:token/${method}`, async ({ request, params }) => {
    const body = await request.json();
    record(method, body, String(params.token));
    return HttpResponse.json({ ok: true, result: true });
  });
}

export const server = setupServer(
  makeHandler('sendMessage'),
  makeHandler('answerCallbackQuery'),
  makeHandler('setWebhook'),
  makeHandler('editMessageReplyMarkup'),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  server.resetHandlers();
  captured.sendMessage = [];
  captured.answerCallbackQuery = [];
  captured.setWebhook = [];
  captured.editMessageReplyMarkup = [];
});

afterAll(() => server.close());
