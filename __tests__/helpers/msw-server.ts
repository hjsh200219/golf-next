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

type TelegramMethod = 'sendMessage' | 'answerCallbackQuery' | 'setWebhook';

const captured: Record<TelegramMethod, unknown[]> = {
  sendMessage: [],
  answerCallbackQuery: [],
  setWebhook: [],
};

function record(method: TelegramMethod, body: unknown): void {
  captured[method].push(body);
}

/** Read the most recent captured request body for a Telegram method. */
export function lastTelegramRequest<T = unknown>(method: TelegramMethod): T | undefined {
  const list = captured[method];
  return list.length > 0 ? (list[list.length - 1] as T) : undefined;
}

/** All captured request bodies for a Telegram method (oldest first). */
export function telegramRequests<T = unknown>(method: TelegramMethod): T[] {
  return captured[method] as T[];
}

function makeHandler(method: TelegramMethod) {
  return http.post(`https://api.telegram.org/bot:token/${method}`, async ({ request }) => {
    const body = await request.json();
    record(method, body);
    return HttpResponse.json({ ok: true, result: true });
  });
}

export const server = setupServer(
  makeHandler('sendMessage'),
  makeHandler('answerCallbackQuery'),
  makeHandler('setWebhook'),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  server.resetHandlers();
  captured.sendMessage = [];
  captured.answerCallbackQuery = [];
  captured.setWebhook = [];
});

afterAll(() => server.close());
