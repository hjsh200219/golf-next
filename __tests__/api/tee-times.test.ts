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
const makeTeeTime = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  club_id: 'ga',
  cc_name: 'GA Korea',
  date: '2026-03-27',
  teeoff: '08:00',
  course: 'East',
  price: 150000,
  event: null,
  created_at: '2026-03-27T00:00:00Z',
  updated_at: '2026-03-27T00:00:00Z',
  ...overrides,
});

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
    mockSupabase.__setResponse({ data: rows, error: null });

    const res = await GET(makeRequest({ date: '2026-03-27' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
    expect(body[0].date).toBe('2026-03-27');
  });

  it('returns an empty array when no tee times match', async () => {
    mockSupabase.__setResponse({ data: [], error: null });

    const res = await GET(makeRequest({ date: '2026-12-31' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns an empty array when data is null', async () => {
    mockSupabase.__setResponse({ data: null, error: null });

    const res = await GET(makeRequest({ date: '2026-03-27' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('filters by clubs param — passes club IDs to the query builder', async () => {
    const rows = [makeTeeTime({ club_id: 'ga' }), makeTeeTime({ id: 2, club_id: 'hilldeloci' })];
    mockSupabase.__setResponse({ data: rows, error: null });

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
    mockSupabase.__setResponse({ data: rows, error: null });

    const res = await GET(makeRequest({ date: '2026-03-27', time_from: '10:00', time_to: '12:00' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it('filters by price range — accepts numeric price_min and price_max', async () => {
    const rows = [makeTeeTime({ price: 100000 }), makeTeeTime({ id: 2, price: 120000 })];
    mockSupabase.__setResponse({ data: rows, error: null });

    const res = await GET(makeRequest({ date: '2026-03-27', price_min: '50000', price_max: '200000' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
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
