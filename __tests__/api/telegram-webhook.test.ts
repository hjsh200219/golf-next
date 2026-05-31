/**
 * Unit tests for POST /api/telegram/webhook
 *
 * The webhook receives Telegram Update objects (message or callback_query),
 * validates the `x-telegram-bot-api-secret-token` header, and drives a watch
 * creation flow via inline keyboards.
 *
 * We mock the Telegram client (sendMessage/answerCallbackQuery), the watches
 * data layer, and Supabase (for the fresh golf_clubs fetch). We keep
 * `@/lib/telegram/keyboards` REAL so encode/decode and keyboard builders run
 * for real — that makes the callback-flow assertions meaningful.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createMockSupabase } from '../helpers/mock-supabase';
import type { MockSupabase } from '../helpers/mock-supabase';

// ---------------------------------------------------------------------------
// Mocks wired up BEFORE importing the route handler
// ---------------------------------------------------------------------------
const mockSupabase: MockSupabase = createMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => mockSupabase),
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

vi.mock('@/lib/telegram/client', () => ({
  sendMessage: vi.fn(async () => {}),
  answerCallbackQuery: vi.fn(async () => {}),
  setWebhook: vi.fn(async () => {}),
}));

vi.mock('@/lib/telegram/watches', () => ({
  createWatch: vi.fn(async () => ({ ok: true })),
  listActiveWatches: vi.fn(async () => []),
  stopWatch: vi.fn(async () => {}),
  stopAllWatches: vi.fn(async () => 0),
  MAX_ACTIVE_WATCHES: 20,
}));

import { sendMessage, answerCallbackQuery } from '@/lib/telegram/client';
import {
  createWatch,
  listActiveWatches,
  stopWatch,
  stopAllWatches,
  MAX_ACTIVE_WATCHES,
} from '@/lib/telegram/watches';
import { POST } from '@/app/api/telegram/webhook/route';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const SECRET = 'whsec';

const makeClub = (overrides: Record<string, unknown> = {}) => ({
  id: 'ga',
  name: 'GA Korea',
  display_name: 'GA 코리아',
  ...overrides,
});

const makeWatch = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  chat_id: 555,
  club_id: 'ga',
  date: '2026-06-02',
  time_from: '07:00',
  time_to: '08:00',
  status: 'active',
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
  ...overrides,
});

function makeRequest(body: unknown, secret: string | null = SECRET): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (secret !== null) headers['x-telegram-bot-api-secret-token'] = secret;
  return new NextRequest('http://localhost/api/telegram/webhook', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const messageUpdate = (text: string, chatId = 555) => ({
  message: { chat: { id: chatId }, text },
});

const callbackUpdate = (data: string, id = 'cbq1', chatId = 555) => ({
  callback_query: { id, message: { chat: { id: chatId } }, data },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/telegram/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.__reset();
    process.env.TELEGRAM_WEBHOOK_SECRET = SECRET;
    // default: createWatch ok
    vi.mocked(createWatch).mockResolvedValue({ ok: true });
    vi.mocked(listActiveWatches).mockResolvedValue([]);
    vi.mocked(stopAllWatches).mockResolvedValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Secret validation ---------------------------------------------------
  it('returns 401 on wrong secret without touching Telegram or watches', async () => {
    const res = await POST(makeRequest(messageUpdate('/watch'), 'nope'));

    expect(res.status).toBe(401);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(answerCallbackQuery).not.toHaveBeenCalled();
    expect(createWatch).not.toHaveBeenCalled();
    expect(listActiveWatches).not.toHaveBeenCalled();
  });

  it('returns 401 on missing secret header', async () => {
    const res = await POST(makeRequest(messageUpdate('/watch'), null));

    expect(res.status).toBe(401);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('returns 401 when TELEGRAM_WEBHOOK_SECRET env is unset', async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    const res = await POST(makeRequest(messageUpdate('/watch'), SECRET));

    expect(res.status).toBe(401);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(createWatch).not.toHaveBeenCalled();
  });

  // --- /watch message ------------------------------------------------------
  it('/watch sends the club keyboard and queries golf_clubs', async () => {
    mockSupabase.__setResponseForTable('golf_clubs', {
      data: [makeClub(), makeClub({ id: 'onetheclub', name: 'One The Club' })],
      error: null,
    });

    const res = await POST(makeRequest(messageUpdate('/watch')));

    expect(res.status).toBe(200);
    expect(mockSupabase.from).toHaveBeenCalledWith('golf_clubs');
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [chatId, text, replyMarkup] = vi.mocked(sendMessage).mock.calls[0];
    expect(chatId).toBe(555);
    expect(text).toContain('골프장을 선택하세요');
    expect(replyMarkup).toBeDefined();
    // real clubKeyboard markup
    expect((replyMarkup as { inline_keyboard: unknown[] }).inline_keyboard).toHaveLength(2);
  });

  it('/start behaves like /watch', async () => {
    mockSupabase.__setResponseForTable('golf_clubs', { data: [makeClub()], error: null });

    const res = await POST(makeRequest(messageUpdate('/start')));

    expect(res.status).toBe(200);
    expect(mockSupabase.from).toHaveBeenCalledWith('golf_clubs');
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  // --- callback: date step -------------------------------------------------
  it("callback step 'date' answers the query and sends the date keyboard", async () => {
    const data = 'w|s=date|ga';
    const res = await POST(makeRequest(callbackUpdate(data)));

    expect(res.status).toBe(200);
    expect(answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(vi.mocked(answerCallbackQuery).mock.calls[0][0]).toBe('cbq1');
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [, text, replyMarkup] = vi.mocked(sendMessage).mock.calls[0];
    expect(text).toContain('날짜를 선택하세요');
    // real dateKeyboard: 14 days
    expect((replyMarkup as { inline_keyboard: unknown[] }).inline_keyboard).toHaveLength(14);
  });

  // --- callback: range step ------------------------------------------------
  it("callback step 'range' answers the query and sends the time-range keyboard", async () => {
    const data = 'w|s=range|ga|20260602';
    const res = await POST(makeRequest(callbackUpdate(data)));

    expect(res.status).toBe(200);
    expect(answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [, text, replyMarkup] = vi.mocked(sendMessage).mock.calls[0];
    expect(text).toContain('시간대를 선택하세요');
    expect((replyMarkup as { inline_keyboard: unknown[] }).inline_keyboard.length).toBeGreaterThan(0);
  });

  // --- callback: done step -------------------------------------------------
  it("callback step 'done' creates the watch with correct args and confirms", async () => {
    const data = 'w|s=done|ga|20260602|0700-0800';
    const res = await POST(makeRequest(callbackUpdate(data)));

    expect(res.status).toBe(200);
    expect(createWatch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createWatch).mock.calls[0][0]).toEqual({
      chatId: 555,
      clubId: 'ga',
      date: '2026-06-02',
      timeFrom: '07:00',
      timeTo: '08:00',
    });
    expect(answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("callback step 'done' for onetheclub notes the whole-club coverage", async () => {
    const data = 'w|s=done|onetheclub|20260602|0700-0800';
    await POST(makeRequest(callbackUpdate(data)));

    expect(createWatch).toHaveBeenCalledTimes(1);
    const text = vi.mocked(sendMessage).mock.calls[0][1];
    expect(text).toContain('클럽 전체 코스 대상');
  });

  it('createWatch cap → sends cap message, answers query, still 200', async () => {
    vi.mocked(createWatch).mockResolvedValue({ ok: false, reason: 'cap' });
    const data = 'w|s=done|ga|20260602|0700-0800';

    const res = await POST(makeRequest(callbackUpdate(data)));

    expect(res.status).toBe(200);
    expect(answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const text = vi.mocked(sendMessage).mock.calls[0][1];
    expect(text).toContain(`최대 ${MAX_ACTIVE_WATCHES}개`);
  });

  it('createWatch out_of_range → Korean range message, answers query, 200', async () => {
    vi.mocked(createWatch).mockResolvedValue({ ok: false, reason: 'out_of_range' });
    const data = 'w|s=done|ga|20260602|0700-0800';

    const res = await POST(makeRequest(callbackUpdate(data)));

    expect(res.status).toBe(200);
    expect(answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendMessage).mock.calls[0][1]).toContain('조회 가능 기간');
  });

  it('createWatch inactive_club → Korean message, answers query, 200', async () => {
    vi.mocked(createWatch).mockResolvedValue({ ok: false, reason: 'inactive_club' });
    const data = 'w|s=done|ga|20260602|0700-0800';

    const res = await POST(makeRequest(callbackUpdate(data)));

    expect(res.status).toBe(200);
    expect(answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendMessage).mock.calls[0][1]).toContain('비활성 골프장');
  });

  it('createWatch duplicate (ok:true) → Korean duplicate message, answers query, 200', async () => {
    vi.mocked(createWatch).mockResolvedValue({ ok: true, reason: 'duplicate' });
    const data = 'w|s=done|ga|20260602|0700-0800';

    const res = await POST(makeRequest(callbackUpdate(data)));

    expect(res.status).toBe(200);
    expect(answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendMessage).mock.calls[0][1]).toContain('이미 등록된 알림');
  });

  // --- /list ---------------------------------------------------------------
  it('/list empty → "없습니다" message', async () => {
    vi.mocked(listActiveWatches).mockResolvedValue([]);

    const res = await POST(makeRequest(messageUpdate('/list')));

    expect(res.status).toBe(200);
    expect(listActiveWatches).toHaveBeenCalledWith(555);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendMessage).mock.calls[0][1]).toContain('없습니다');
  });

  it('/list with watches → summary plus stop buttons', async () => {
    vi.mocked(listActiveWatches).mockResolvedValue([
      makeWatch({ id: 7, club_id: 'ga', date: '2026-06-02' }),
      makeWatch({ id: 8, club_id: 'hilldeloci', date: '2026-06-03' }),
    ]);

    const res = await POST(makeRequest(messageUpdate('/list')));

    expect(res.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [, text, replyMarkup] = vi.mocked(sendMessage).mock.calls[0];
    expect(text).toContain('2026-06-02');
    expect(text).toContain('07:00');
    const markup = replyMarkup as { inline_keyboard: { callback_data: string }[][] };
    const allData = markup.inline_keyboard.flat().map((b) => b.callback_data);
    expect(allData).toContain('x|stop|7');
    expect(allData).toContain('x|stop|8');
  });

  // --- /stop ---------------------------------------------------------------
  it('/stop lists watches with stop buttons and a "전체 중지" button', async () => {
    vi.mocked(listActiveWatches).mockResolvedValue([makeWatch({ id: 7 })]);

    const res = await POST(makeRequest(messageUpdate('/stop')));

    expect(res.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const markup = vi.mocked(sendMessage).mock.calls[0][2] as {
      inline_keyboard: { text: string; callback_data: string }[][];
    };
    const buttons = markup.inline_keyboard.flat();
    expect(buttons.some((b) => b.callback_data === 'x|stop|7')).toBe(true);
    expect(buttons.some((b) => b.callback_data === 'x|stopall')).toBe(true);
    expect(buttons.some((b) => b.text.includes('전체 중지'))).toBe(true);
  });

  it('stop callback → stopWatch called and confirmation sent', async () => {
    const res = await POST(makeRequest(callbackUpdate('x|stop|7')));

    expect(res.status).toBe(200);
    expect(stopWatch).toHaveBeenCalledWith(7);
    expect(answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('stopall callback → stopAllWatches called and confirmation sent', async () => {
    vi.mocked(stopAllWatches).mockResolvedValue(3);

    const res = await POST(makeRequest(callbackUpdate('x|stopall')));

    expect(res.status).toBe(200);
    expect(stopAllWatches).toHaveBeenCalledWith(555);
    expect(answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  // --- unknown text --------------------------------------------------------
  it('unknown text → Korean help listing the commands', async () => {
    const res = await POST(makeRequest(messageUpdate('hello')));

    expect(res.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const text = vi.mocked(sendMessage).mock.calls[0][1];
    expect(text).toContain('/watch');
    expect(text).toContain('/list');
    expect(text).toContain('/stop');
  });

  // --- unrecognized update -------------------------------------------------
  it('returns 200 on an unrecognized update shape without side effects', async () => {
    const res = await POST(makeRequest({ edited_message: { foo: 'bar' } }));

    expect(res.status).toBe(200);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(answerCallbackQuery).not.toHaveBeenCalled();
  });

  // --- idempotency ---------------------------------------------------------
  it('posting the SAME done callback twice → createWatch twice, 200 both, no throw', async () => {
    const data = 'w|s=done|ga|20260602|0700-0800';

    const res1 = await POST(makeRequest(callbackUpdate(data)));
    const res2 = await POST(makeRequest(callbackUpdate(data)));

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(createWatch).toHaveBeenCalledTimes(2);
    expect(answerCallbackQuery).toHaveBeenCalledTimes(2);
  });
});
