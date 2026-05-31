import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createMockSupabase, type QueryResponse } from '../helpers/mock-supabase';

const mockSupabase = createMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => mockSupabase),
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}));

const sendMessage = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/telegram/client', () => ({
  sendMessage: (...args: unknown[]) => sendMessage(...args),
}));

const logInfo = vi.fn();
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: logInfo,
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Fixed clock. KST today = 2026-06-01 (03:00 UTC + 9h = 12:00 KST same day).
const FIXED = Date.parse('2026-06-01T03:00:00.000Z');
const S = new Date(FIXED).toISOString(); // fresh anchor == now
const TODAY = '2026-06-01';

function makeRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader !== undefined) headers.set('authorization', authHeader);
  return new NextRequest('http://localhost/api/telegram/check', { headers });
}

const watchRow = {
  id: 1,
  chat_id: 555,
  club_id: 'club-1',
  date: TODAY,
  time_from: '06:00',
  time_to: '10:00',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.__reset();
  vi.useFakeTimers();
  vi.setSystemTime(FIXED);
  process.env.CRON_SECRET = 'cs';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/telegram/check', () => {
  it('missing Bearer → 401, no sendMessage', async () => {
    const { GET } = await import('@/app/api/telegram/check/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('wrong Bearer → 401, no sendMessage', async () => {
    const { GET } = await import('@/app/api/telegram/check/route');
    const res = await GET(makeRequest('Bearer wrong'));

    expect(res.status).toBe(401);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('auto-expire: past-dated watch → update to stopped, excluded from matching', async () => {
    const expiredWatch = { ...watchRow, id: 9, date: '2020-01-01' };

    const updateSpy = vi.fn().mockReturnThis();
    const ltSpy = vi.fn().mockReturnThis();
    const eqSpy = vi.fn().mockReturnThis();
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'telegram_watches') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: eqSpy,
          update: updateSpy,
          lt: ltSpy,
          // The initial active-select resolves the expired watch.
          then: (r: (v: QueryResponse) => unknown) =>
            Promise.resolve({ data: [expiredWatch], error: null }).then(r),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const { GET } = await import('@/app/api/telegram/check/route');
    const res = await GET(makeRequest('Bearer cs'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'stopped' }),
    );
    expect(ltSpy).toHaveBeenCalledWith('date', TODAY);
    expect(body.expired).toBe(1);
    // Excluded from matching loop: no scrape lookup at all for it.
    expect(mockSupabase.from).not.toHaveBeenCalledWith('scrape_jobs');
    expect(mockSupabase.from).not.toHaveBeenCalledWith('tee_times');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('S-null (no scrape_jobs) → sNullSkips++, no tee_times query, no send', async () => {
    mockSupabase.__setResponseForTable('telegram_watches', {
      data: [watchRow],
      error: null,
    });
    // scrape_jobs defaults to [] → jobIds empty → S null short-circuit.

    const { GET } = await import('@/app/api/telegram/check/route');
    const res = await GET(makeRequest('Bearer cs'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sNullSkips).toBe(1);
    expect(body.sent).toBe(0);
    // The discriminating assertion: tee_times was never queried, so no .gte issued.
    expect(mockSupabase.from).not.toHaveBeenCalledWith('tee_times');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('match → sendMessage once with the watch chat_id', async () => {
    mockSupabase.__setResponseForTable('telegram_watches', {
      data: [watchRow],
      error: null,
    });
    mockSupabase.__setResponseForTable('scrape_jobs', {
      data: [{ id: 1 }],
      error: null,
    });
    mockSupabase.__setResponseForTable('scrape_club_results', {
      data: [{ scraped_at: S }],
      error: null,
    });
    mockSupabase.__setResponseForTable('tee_times', {
      data: [
        {
          id: 100,
          club_id: 'club-1',
          cc_name: '클럽원',
          date: TODAY,
          teeoff: '07:30',
          course: null,
          price: null,
          event: null,
          scraped_at: S, // == S → open now
        },
      ],
      error: null,
    });

    const { GET } = await import('@/app/api/telegram/check/route');
    const res = await GET(makeRequest('Bearer cs'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockSupabase.from).toHaveBeenCalledWith('tee_times');
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][0]).toBe(555);
    expect(typeof sendMessage.mock.calls[0][1]).toBe('string');
    expect(body.matches).toBe(1);
    expect(body.sent).toBe(1);
    expect(body.sNullSkips).toBe(0);
  });

  it('no match (all rows stale, < S) → silent, no send', async () => {
    mockSupabase.__setResponseForTable('telegram_watches', {
      data: [watchRow],
      error: null,
    });
    mockSupabase.__setResponseForTable('scrape_jobs', {
      data: [{ id: 1 }],
      error: null,
    });
    mockSupabase.__setResponseForTable('scrape_club_results', {
      data: [{ scraped_at: S }],
      error: null,
    });
    mockSupabase.__setResponseForTable('tee_times', {
      data: [
        {
          id: 101,
          club_id: 'club-1',
          cc_name: '클럽원',
          date: TODAY,
          teeoff: '07:30',
          course: null,
          price: null,
          event: null,
          scraped_at: new Date(FIXED - 10 * 60 * 1000).toISOString(), // stale < S
        },
      ],
      error: null,
    });

    const { GET } = await import('@/app/api/telegram/check/route');
    const res = await GET(makeRequest('Bearer cs'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(body.matches).toBe(0);
    expect(body.sent).toBe(0);
  });

  it('log shape: log.info called with "telegram check" + counter keys', async () => {
    mockSupabase.__setResponseForTable('telegram_watches', {
      data: [watchRow],
      error: null,
    });

    const { GET } = await import('@/app/api/telegram/check/route');
    await GET(makeRequest('Bearer cs'));

    const call = logInfo.mock.calls.find((c) => c[0] === 'telegram check');
    expect(call).toBeDefined();
    expect(call![1]).toEqual(
      expect.objectContaining({
        watches: expect.any(Number),
        expired: expect.any(Number),
        sNullSkips: expect.any(Number),
        matches: expect.any(Number),
        sent: expect.any(Number),
      }),
    );
  });
});
