/**
 * Integration tests for GET /api/telegram/yangju/check (alert cron).
 *
 * Reads tee_times (already scraped — NO yangju-account login in this path) and
 * sends alerts via TELEGRAM_JK_BOT_TOKEN with [예약] buttons. Mocks Supabase +
 * the Telegram client; keeps keyboards/match REAL.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createMockSupabase, type MockSupabase, type QueryResponse } from '../helpers/mock-supabase';

const mockSupabase: MockSupabase = createMockSupabase();
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => mockSupabase),
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}));

const sendMessage = vi.fn<(...a: any[]) => Promise<void>>(async () => {});
vi.mock('@/lib/telegram/client', () => ({
  sendMessage: (...a: any[]) => sendMessage(...a),
  answerCallbackQuery: vi.fn(async () => {}),
  setWebhook: vi.fn(async () => {}),
  editMessageReplyMarkup: vi.fn(async () => {}),
}));

const CRON = 'cron-secret';
const JK = 'jk-token';

function req(secret = CRON): NextRequest {
  return new NextRequest('http://localhost/api/telegram/yangju/check', {
    method: 'GET',
    headers: { authorization: `Bearer ${secret}` },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.__reset();
  process.env.CRON_SECRET = CRON;
  process.env.TELEGRAM_JK_BOT_TOKEN = JK;
});

describe('auth', () => {
  it('rejects a bad bearer with 401', async () => {
    const { GET } = await import('@/app/api/telegram/yangju/check/route');
    const res = await GET(req('wrong'));
    expect(res.status).toBe(401);
  });
});

describe('alert matching', () => {
  it('matched slot → alert via JK token with a [예약] button; no yangju login', async () => {
    const today = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const recent = new Date(Date.now() - 60000).toISOString();

    mockSupabase.from.mockImplementation((table: string) => {
      const resp = (data: unknown): QueryResponse => ({ data, error: null });
      const chain = (data: unknown) => {
        const c: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'in', 'gte', 'lt', 'order', 'update']) c[m] = () => c;
        c.then = (r: (v: QueryResponse) => unknown) => Promise.resolve(resp(data)).then(r);
        return c;
      };
      if (table === 'yangju_reservation_watches')
        return chain([{ id: 1, chat_id: 555, date: today, time_from: '06:00', time_to: '08:00', course: null, status: 'active' }]);
      if (table === 'scrape_jobs') return chain([{ id: 99 }]);
      if (table === 'scrape_club_results') return chain([{ scraped_at: recent }]);
      if (table === 'tee_times')
        return chain([{ id: 1, club_id: 'yangju', cc_name: '양주CC', date: today, teeoff: '06:12', course: '동', price: null, event: null, scraped_at: recent }]);
      return chain([]);
    });

    const { GET } = await import('@/app/api/telegram/yangju/check/route');
    const res = await GET(req());
    const json = await res.json();

    expect(json.sent).toBe(1);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [chatId, text, markup, , token] = sendMessage.mock.calls[0];
    expect(chatId).toBe(555);
    expect(text).toContain('양주CC');
    expect(token).toBe(JK); // sent via the new bot, not the default
    // [예약] button callback is format-identical to /book's r|pick
    const cb = (markup as any).inline_keyboard[0][0].callback_data;
    expect(cb).toMatch(/^r\|pick\|\d{8}\|\d{4}\|동\|/);
  });
});
