/**
 * Dispatch decoupling test for POST /api/scrape.
 *
 * The route fans out one fetch() per (club × date) to /api/scrape/club, each of
 * which scrapes synchronously before responding. The route used to
 * `await Promise.allSettled(pendingFetches)` on the RESPONSE path, so its own
 * response — and therefore the cron caller that awaits it — was bounded by the
 * SLOWEST club scrape. On Vercel (maxDuration 60s) a slow tail produced a 504,
 * surfacing as a (cosmetic) GitHub Actions failure even though the independent
 * club functions kept running and persisted their data.
 *
 * Fix: keep the function alive via Vercel `waitUntil` (so the trigger fetches
 * still flush) but return immediately after dispatch. This test pins that
 * contract: with club fetches that NEVER resolve, POST must still return 201
 * promptly, and the long-running settle must be handed to `waitUntil`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockSupabase = (() => {
  const golfClubs: Record<string, unknown> = {
    select: vi.fn(() => golfClubs),
    eq: vi.fn(() =>
      Promise.resolve({
        data: [{ id: 'ga', name: 'X', scraper_type: 'requests' }],
        error: null,
      }),
    ),
  };

  const scrapeJobs: Record<string, unknown> = {
    insert: vi.fn(() => scrapeJobs),
    select: vi.fn(() => scrapeJobs),
    single: vi.fn(() => Promise.resolve({ data: { id: 1 }, error: null })),
    update: vi.fn(() => scrapeJobs),
    eq: vi.fn(() => Promise.resolve({ error: null })),
  };

  const scrapeClubResults: Record<string, unknown> = {
    insert: vi.fn(() => Promise.resolve({ error: null })),
  };

  const from = vi.fn((table: string) =>
    table === 'golf_clubs'
      ? golfClubs
      : table === 'scrape_jobs'
        ? scrapeJobs
        : scrapeClubResults,
  );

  return { from };
})();

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => mockSupabase),
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: vi.fn(() => []), set: vi.fn() })),
}));

vi.mock('@vercel/functions', () => ({ waitUntil: vi.fn() }));

import { POST } from '@/app/api/scrape/route';
import { waitUntil } from '@vercel/functions';

const API_KEY = 'test-scrape-key';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/scrape', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify(body),
  });
}

describe('POST /api/scrape — dispatch is decoupled from club completion', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SCRAPE_API_KEY = API_KEY;
    // Club triggers that NEVER resolve: if the route awaits them, POST hangs.
    fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns 201 promptly without awaiting club scrapes, handing the settle to waitUntil', async () => {
    const res = await Promise.race([
      POST(makeRequest({ dates: ['2026-06-20'] })),
      new Promise<'TIMEOUT'>((r) => setTimeout(() => r('TIMEOUT'), 300)),
    ]);

    expect(res).not.toBe('TIMEOUT');
    expect((res as Response).status).toBe(201);

    // Dispatch still happened: one fetch for 1 club × 1 date.
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // The long-running settle was handed off to keep the function alive.
    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(vi.mocked(waitUntil).mock.calls[0][0]).toBeInstanceOf(Promise);
  });
});
