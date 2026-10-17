/**
 * Serial dispatch for single-session clubs (POST /api/scrape).
 *
 * onetheclub's member account allows one live session. One /api/scrape/club
 * function per date logs in concurrently, each login kicks the previous
 * session, and the kicked scrapes come back with empty 본진 lists (measured
 * 2026-10-17: 7 parallel dates → 6 kicked). Those dates must be dispatched one
 * after another, while every other club keeps fanning out in parallel.
 *
 * Original header kept below for the shared mock setup.
 *
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
        data: [
          { id: 'ga', name: 'X', scraper_type: 'requests' },
          { id: 'onetheclub', name: 'O', scraper_type: 'requests' },
        ],
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

describe('POST /api/scrape — single-session clubs are dispatched serially', () => {
  const pending: { clubId: string; date: string; resolve: () => void }[] = [];
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    pending.length = 0;
    process.env.SCRAPE_API_KEY = API_KEY;
    fetchMock = vi.fn((_url: string, init: RequestInit) => {
      const { clubId, date } = JSON.parse(String(init.body));
      return new Promise<Response>((resolve) => {
        pending.push({ clubId, date, resolve: () => resolve(new Response('{}')) });
      });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const calls = (clubId: string) =>
    fetchMock.mock.calls
      .map((c) => JSON.parse(String((c[1] as RequestInit).body)))
      .filter((b) => b.clubId === clubId)
      .map((b) => b.date);

  it('fans out other clubs but runs onetheclub dates one at a time', async () => {
    const dates = ['2026-10-18', '2026-10-19', '2026-10-20'];
    const res = await POST(makeRequest({ dates }));
    expect(res.status).toBe(201);
    await new Promise((r) => setTimeout(r, 0));

    expect(calls('ga')).toEqual(dates);
    expect(calls('onetheclub')).toEqual(['2026-10-18']);

    pending.find((p) => p.clubId === 'onetheclub' && p.date === '2026-10-18')!.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(calls('onetheclub')).toEqual(['2026-10-18', '2026-10-19']);

    pending.find((p) => p.clubId === 'onetheclub' && p.date === '2026-10-19')!.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(calls('onetheclub')).toEqual(dates);

    // The serial chain is part of what waitUntil keeps alive.
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  it('a failed onetheclub dispatch does not stop the remaining dates', async () => {
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url: string, init: RequestInit) => {
      const { clubId, date } = JSON.parse(String(init.body));
      if (clubId === 'onetheclub' && date === '2026-10-18') {
        return Promise.reject(new Error('boom'));
      }
      return base(url, init);
    });
    const dates = ['2026-10-18', '2026-10-19'];
    await POST(makeRequest({ dates }));
    await new Promise((r) => setTimeout(r, 0));
    expect(calls('onetheclub')).toEqual(dates);
  });
});
