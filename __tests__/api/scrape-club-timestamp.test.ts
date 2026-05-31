/**
 * Regression test for the scrape/club timestamp bug.
 *
 * The route used to read the wall clock TWICE: once for the tee_times rows'
 * `scraped_at` and a second, strictly-later time for the
 * `scrape_club_results.update({ scraped_at })`. A downstream feature treats a
 * tee_time as "currently open" iff `tee_times.scraped_at >=
 * scrape_club_results.scraped_at`, so the second (later) read makes that
 * comparison always false.
 *
 * This test captures BOTH payloads and asserts the two `scraped_at` values are
 * equal. To make the bug observable (two `toISOString()` calls in the same
 * millisecond would otherwise collide), we stub `Date.prototype.toISOString`
 * with a monotonically increasing counter so every distinct call returns a
 * distinct string.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Inline Supabase mock that CAPTURES per-table payloads. The shared helper in
// __tests__/helpers/mock-supabase.ts uses fresh vi.fn()s per from() call, so it
// can't capture args per table — hence this purpose-built mock.
//
// Every awaited chain must resolve a value, otherwise the route falls into its
// catch block (which writes an update with no scraped_at) and the assertion
// would fail for the wrong reason.
// ---------------------------------------------------------------------------
const mockSupabase = (() => {
  const captured: { teeTimes?: unknown[]; results?: Record<string, unknown> } = {};

  // scrape_club_results: update(...).eq(...).eq(...) is awaited (thenable),
  // and select(...).eq(...) is awaited to build jobResults.
  const sccr: Record<string, unknown> = {
    update: vi.fn((payload: Record<string, unknown>) => {
      captured.results = payload;
      return sccr;
    }),
    select: vi.fn(() => sccr),
    eq: vi.fn(() => sccr),
    // jobResults = [] → completed (0) === total (0) → completion branch fires cleanly
    then: (resolve: (r: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve),
  };

  // tee_times: route awaits .upsert(...) directly, so it must resolve.
  const tee: Record<string, unknown> = {
    upsert: vi.fn((rows: unknown[]) => {
      captured.teeTimes = rows;
      return Promise.resolve({ error: null });
    }),
  };

  // scrape_jobs: update(...).eq(...) is awaited.
  const jobs: Record<string, unknown> = {
    update: vi.fn(() => jobs),
    eq: vi.fn(() => jobs),
    then: (resolve: (r: unknown) => unknown) => Promise.resolve({}).then(resolve),
  };

  const from = vi.fn((table: string) =>
    table === 'tee_times' ? tee : table === 'scrape_club_results' ? sccr : jobs,
  );

  return { from, captured };
})();

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => mockSupabase),
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}));

// createScraper returns a fake scraper whose run() yields one tee time.
vi.mock('@/lib/scrapers', () => ({
  createScraper: vi.fn(() => ({
    run: vi.fn(async () => ({
      clubId: 'ga',
      ccName: 'X',
      success: true,
      durationMs: 1,
      error: undefined,
      teeTimes: [
        {
          cc_name: 'X',
          date: '2026-06-02',
          teeoff: '07:00',
          course: 'A',
          price: 100000,
          event: '',
        },
      ],
    })),
  })),
}));

// next/headers is pulled in transitively by @/lib/supabase/server; stub it so
// importing the route doesn't crash outside a Next.js server runtime.
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

import { POST } from '@/app/api/scrape/club/route';

const API_KEY = 'test-scrape-key';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/scrape/club', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/scrape/club — shared scraped_at timestamp', () => {
  let isoTick = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SCRAPE_API_KEY = API_KEY;
    mockSupabase.captured.teeTimes = undefined;
    mockSupabase.captured.results = undefined;

    // Force every distinct toISOString() call to return a distinct string so
    // two separate clock reads can never collide within one millisecond.
    // Date.now() (used for durationMs) is intentionally left untouched.
    isoTick = 0;
    vi.spyOn(Date.prototype, 'toISOString').mockImplementation(
      () => `2026-06-02T00:00:00.${String(isoTick++).padStart(3, '0')}Z`,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes the SAME scraped_at to tee_times rows and scrape_club_results', async () => {
    const res = await POST(makeRequest({ jobId: 1, clubId: 'ga', date: '2026-06-02' }));

    // Guard: the happy path must have completed, otherwise a setup error (not
    // the bug) would explain a mismatch.
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const teeRows = mockSupabase.captured.teeTimes as Array<{ scraped_at: string }>;
    const resultsPayload = mockSupabase.captured.results as { scraped_at: string };

    expect(teeRows).toBeDefined();
    expect(teeRows.length).toBeGreaterThan(0);
    expect(resultsPayload).toBeDefined();
    expect(resultsPayload.scraped_at).toBeDefined();

    // The bug: scrape_club_results.scraped_at was a second, later clock read.
    expect(teeRows[0].scraped_at).toBe(resultsPayload.scraped_at);
  });
});
