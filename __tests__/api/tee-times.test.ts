/**
 * Unit tests for GET /api/tee-times
 *
 * Strategy: import the route handler directly and call it with a NextRequest.
 * All Supabase I/O is intercepted via vi.mock so no real database connection
 * is ever made.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createMockSupabase } from '../helpers/mock-supabase';
import type { MockSupabase } from '../helpers/mock-supabase';

// ---------------------------------------------------------------------------
// Supabase mock must be declared BEFORE importing the route handler so the
// vi.mock factory runs with the mock already in place.
// ---------------------------------------------------------------------------
const mockSupabase: MockSupabase = createMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createAdminClient: vi.fn(() => mockSupabase),
}));

// next/headers is used by createServerSupabaseClient internally; stub it so
// the import doesn't crash outside of a real Next.js server environment.
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

import { GET } from '@/app/api/tee-times/route';

// ---------------------------------------------------------------------------
// Sample fixture data
// ---------------------------------------------------------------------------
const LIVE_S = '2026-03-27T01:00:00.000+00:00';

const makeTeeTime = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  club_id: 'ga',
  cc_name: 'GA Korea',
  date: '2026-03-27',
  teeoff: '08:00',
  course: 'East',
  price: 150000,
  event: null,
  scraped_at: LIVE_S,
  created_at: '2026-03-27T00:00:00Z',
  updated_at: '2026-03-27T00:00:00Z',
  ...overrides,
});

function seedLive(
  rows: ReturnType<typeof makeTeeTime>[],
  scrapedAt = LIVE_S,
) {
  mockSupabase.__setResponseForTable('scrape_jobs', {
    data: [{ id: 10 }],
    error: null,
  });
  const clubIds = [...new Set(rows.map((r) => String(r.club_id)))];
  mockSupabase.__setResponseForTable('scrape_club_results', {
    data: clubIds.map((club_id) => ({
      club_id,
      scraped_at: scrapedAt,
      status: 'success',
    })),
    error: null,
  });
  mockSupabase.__setResponseForTable('tee_times', { data: rows, error: null });
}

// ---------------------------------------------------------------------------
// Helper — build a NextRequest with query params
// ---------------------------------------------------------------------------
function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/tee-times');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GET /api/tee-times', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.__reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns 400 when the date param is missing', async () => {
    const res = await GET(makeRequest());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/date/i);
  });

  it('returns 400 when date is not in YYYY-MM-DD format', async () => {
    const res = await GET(makeRequest({ date: '27-03-2026' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/YYYY-MM-DD/i);
  });

  it('returns 400 when time_from is not in HH:MM format', async () => {
    const res = await GET(makeRequest({ date: '2026-03-27', time_from: '8:00' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/time_from/i);
  });

  it('returns 400 when time_to is not in HH:MM format', async () => {
    const res = await GET(makeRequest({ date: '2026-03-27', time_to: '14:0' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/time_to/i);
  });

  it('returns 400 when price_min is not a number', async () => {
    const res = await GET(makeRequest({ date: '2026-03-27', price_min: 'cheap' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/price_min/i);
  });

  it('returns 400 when price_max is not a number', async () => {
    const res = await GET(makeRequest({ date: '2026-03-27', price_max: 'expensive' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/price_max/i);
  });

  // ── Successful responses ──────────────────────────────────────────────────

  it('returns results filtered by date', async () => {
    const rows = [
      makeTeeTime({ date: '2026-03-27', teeoff: '08:00' }),
      makeTeeTime({ id: 2, date: '2026-03-27', teeoff: '09:00' }),
    ];
    seedLive(rows);

    const res = await GET(makeRequest({ date: '2026-03-27' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
    expect(body[0].date).toBe('2026-03-27');
  });

  it('returns an empty array when no tee times match', async () => {
    seedLive([]);

    const res = await GET(makeRequest({ date: '2026-12-31' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns an empty array when data is null', async () => {
    mockSupabase.__setResponseForTable('scrape_jobs', { data: [{ id: 10 }], error: null });
    mockSupabase.__setResponseForTable('scrape_club_results', {
      data: [{ club_id: 'ga', scraped_at: LIVE_S }],
      error: null,
    });
    mockSupabase.__setResponseForTable('tee_times', { data: null, error: null });

    const res = await GET(makeRequest({ date: '2026-03-27' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('filters by clubs param — passes club IDs to the query builder', async () => {
    const rows = [makeTeeTime({ club_id: 'ga' }), makeTeeTime({ id: 2, club_id: 'hilldeloci' })];
    seedLive(rows);

    const res = await GET(makeRequest({ date: '2026-03-27', clubs: 'ga,hilldeloci' }));

    expect(res.status).toBe(200);
    // Verify from() was called with the correct table name
    const fromSpy = mockSupabase.from as ReturnType<typeof vi.fn>;
    expect(fromSpy).toHaveBeenCalledWith('tee_times');
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it('filters by time range — accepts valid HH:MM time_from and time_to', async () => {
    const rows = [makeTeeTime({ teeoff: '10:00' }), makeTeeTime({ id: 2, teeoff: '11:00' })];
    seedLive(rows);

    const res = await GET(makeRequest({ date: '2026-03-27', time_from: '10:00', time_to: '12:00' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it('filters by price range — accepts numeric price_min and price_max', async () => {
    const rows = [makeTeeTime({ price: 100000 }), makeTeeTime({ id: 2, price: 120000 })];
    seedLive(rows);

    const res = await GET(makeRequest({ date: '2026-03-27', price_min: '50000', price_max: '200000' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it('drops booked slots whose scraped_at froze before the latest successful scrape', async () => {
    const latest = '2026-08-22T18:00:16.869+00:00';
    const live = [
      makeTeeTime({
        id: 1,
        club_id: 'laviebell',
        cc_name: '라비에벨CC 올드',
        teeoff: '06:30',
        scraped_at: latest,
      }),
      makeTeeTime({
        id: 12,
        club_id: 'laviebell',
        cc_name: '라비에벨CC 올드',
        teeoff: '12:39',
        scraped_at: latest,
      }),
    ];
    const booked = [
      makeTeeTime({
        id: 2,
        club_id: 'laviebell',
        cc_name: '라비에벨CC 올드',
        teeoff: '06:37',
        scraped_at: '2026-08-19T02:00:20.174+00:00',
      }),
      makeTeeTime({
        id: 3,
        club_id: 'laviebell',
        cc_name: '라비에벨CC 올드',
        teeoff: '12:18',
        scraped_at: '2026-08-20T02:00:18.108+00:00',
      }),
    ];
    seedLive([...live, ...booked], latest);

    const res = await GET(makeRequest({ date: '2026-03-27', clubs: 'laviebell' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((r: { teeoff: string }) => r.teeoff)).toEqual(['06:30', '12:39']);
  });

  it('drops booked slots for every club, not just laviebell', async () => {
    const latest = '2026-08-22T18:00:16.869+00:00';
    const rows = [
      makeTeeTime({
        id: 1,
        club_id: 'laviebell',
        cc_name: '라비에벨CC 올드',
        teeoff: '06:30',
        scraped_at: latest,
      }),
      makeTeeTime({
        id: 2,
        club_id: 'laviebell',
        cc_name: '라비에벨CC 올드',
        teeoff: '06:37',
        scraped_at: '2026-08-19T02:00:20.174+00:00',
      }),
      makeTeeTime({
        id: 3,
        club_id: 'ga',
        cc_name: '골드CC',
        teeoff: '08:00',
        scraped_at: latest,
      }),
      makeTeeTime({
        id: 4,
        club_id: 'ga',
        cc_name: '골드CC',
        teeoff: '08:10',
        scraped_at: '2026-08-20T02:00:00.000+00:00',
      }),
      makeTeeTime({
        id: 5,
        club_id: 'edenblue',
        cc_name: '에덴블루CC',
        teeoff: '09:00',
        scraped_at: latest,
      }),
      makeTeeTime({
        id: 6,
        club_id: 'edenblue',
        cc_name: '에덴블루CC',
        teeoff: '09:07',
        scraped_at: '2026-08-18T00:00:00.000+00:00',
      }),
    ];
    seedLive(rows, latest);

    const res = await GET(makeRequest({ date: '2026-03-27' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((r: { club_id: string; teeoff: string }) => `${r.club_id}:${r.teeoff}`)).toEqual([
      'laviebell:06:30',
      'ga:08:00',
      'edenblue:09:00',
    ]);
  });

  it('pages scrape_club_results past the 1000-row cap so S is the latest success', async () => {
    // Prod has thousands of success rows per date. A single select silently
    // stops at 1000 (oldest ids), which would pin S to an early scrape and
    // leave booked slots visible for every club.
    const oldS = '2026-08-10T00:00:00.000+00:00';
    const latest = '2026-08-22T18:00:16.869+00:00';
    const page1 = [
      ...Array.from({ length: 999 }, (_, i) => ({
        club_id: 'filler',
        scraped_at: oldS,
        id: i + 1,
      })),
      { club_id: 'laviebell', scraped_at: oldS, id: 1000 },
    ];
    const page2 = [{ club_id: 'laviebell', scraped_at: latest, id: 1001 }];

    const thenable = (data: unknown) => {
      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'in', 'gte', 'lte', 'order', 'range']) {
        chain[m] = vi.fn().mockReturnValue(chain);
      }
      chain.then = (
        resolve: (r: { data: unknown; error: null }) => unknown,
        reject?: (e: unknown) => unknown,
      ) => Promise.resolve({ data, error: null }).then(resolve, reject);
      return chain;
    };

    const resultPages = [page1, page2];
    let resultPageIdx = 0;
    const resultsChain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'in', 'gte', 'lte', 'order']) {
      resultsChain[m] = vi.fn().mockReturnValue(resultsChain);
    }
    resultsChain.range = vi.fn((_from: number, _to: number) => {
      const data = resultPages[resultPageIdx] ?? [];
      resultPageIdx += 1;
      return Promise.resolve({ data, error: null });
    });
    // Unpaged await (PostgREST default) would only see the first 1000.
    resultsChain.then = (
      resolve: (r: { data: unknown; error: null }) => unknown,
      reject?: (e: unknown) => unknown,
    ) => Promise.resolve({ data: page1, error: null }).then(resolve, reject);

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'scrape_jobs') return thenable([{ id: 10 }]);
      if (table === 'scrape_club_results') return resultsChain;
      return thenable([
        makeTeeTime({
          id: 1,
          club_id: 'laviebell',
          teeoff: '06:30',
          scraped_at: latest,
        }),
        makeTeeTime({
          id: 2,
          club_id: 'laviebell',
          teeoff: '06:37',
          scraped_at: '2026-08-15T00:00:00.000+00:00',
        }),
      ]);
    });

    const res = await GET(makeRequest({ date: '2026-03-27' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((r: { teeoff: string }) => r.teeoff)).toEqual(['06:30']);
    expect(resultPageIdx).toBeGreaterThanOrEqual(2);
  });

  it('returns an empty array when there are no scrape jobs for the date', async () => {
    mockSupabase.__setResponseForTable('scrape_jobs', { data: [], error: null });
    mockSupabase.__setResponseForTable('tee_times', {
      data: [makeTeeTime()],
      error: null,
    });

    const res = await GET(makeRequest({ date: '2026-03-27' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('paginates past the 1000-row cap and aggregates every page', async () => {
    // Supabase max_rows defaults to 1000, so a single query silently truncates.
    // The route must page through until a short page proves the set is exhausted.
    const page1 = Array.from({ length: 1000 }, (_, i) =>
      makeTeeTime({ id: i + 1, teeoff: '08:00' }),
    );
    const page2 = Array.from({ length: 500 }, (_, i) =>
      makeTeeTime({ id: 1000 + i + 1, teeoff: '09:00' }),
    );

    const rangeCalls: Array<[number, number]> = [];
    const pages = [page1, page2];
    let pageIdx = 0;

    const thenable = (data: unknown) => {
      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'in', 'gte', 'lte', 'order', 'range']) {
        chain[m] = vi.fn().mockReturnValue(chain);
      }
      chain.then = (
        resolve: (r: { data: unknown; error: null }) => unknown,
        reject?: (e: unknown) => unknown,
      ) => Promise.resolve({ data, error: null }).then(resolve, reject);
      return chain;
    };

    const teeTimesChain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'in', 'gte', 'lte', 'order']) {
      teeTimesChain[m] = vi.fn().mockReturnValue(teeTimesChain);
    }
    teeTimesChain.range = vi.fn((from: number, to: number) => {
      rangeCalls.push([from, to]);
      const data = pages[pageIdx] ?? [];
      pageIdx += 1;
      return Promise.resolve({ data, error: null });
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'scrape_jobs') return thenable([{ id: 10 }]);
      if (table === 'scrape_club_results') {
        return thenable([{ club_id: 'ga', scraped_at: LIVE_S }]);
      }
      return teeTimesChain;
    });

    const res = await GET(makeRequest({ date: '2026-03-27' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1500);
    expect(rangeCalls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  // ── Error handling ────────────────────────────────────────────────────────

  it('returns 500 when Supabase returns an error', async () => {
    mockSupabase.__setResponse({ data: null, error: { message: 'DB connection failed' } });

    const res = await GET(makeRequest({ date: '2026-03-27' }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to fetch tee times/i);
  });
});
