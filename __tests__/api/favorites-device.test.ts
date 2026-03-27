/**
 * Unit tests for GET / POST / DELETE /api/favorites/device
 *
 * The route uses createAdminClient() to bypass RLS.  We intercept it with our
 * mock helper and configure per-call responses to simulate the various
 * branching paths (count check, duplicate check, insert, delete).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createMockSupabase } from '../helpers/mock-supabase';
import type { MockSupabase } from '../helpers/mock-supabase';

// ---------------------------------------------------------------------------
// Supabase mock BEFORE importing the route
// ---------------------------------------------------------------------------
const mockSupabase: MockSupabase = createMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => mockSupabase),
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: vi.fn(() => []), set: vi.fn() })),
}));

import { GET, POST, DELETE } from '@/app/api/favorites/device/route';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/** A well-formed UUID v4 that passes the route's own regex */
const VALID_DEVICE_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const VALID_CLUB_ID = 'ga';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeGetRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/favorites/device');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString(), { method: 'GET' });
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/favorites/device', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/favorites/device', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const makeFavorite = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  device_id: VALID_DEVICE_ID,
  club_id: VALID_CLUB_ID,
  last_accessed_at: '2026-03-27T00:00:00Z',
  created_at: '2026-03-27T00:00:00Z',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Build a sequential mock: each call to from() returns the next response.
// ---------------------------------------------------------------------------
function buildSequentialMock(
  fromFn: ReturnType<typeof vi.fn>,
  responses: Array<{ data: unknown; error: unknown; count?: number | null }>,
) {
  let callIndex = 0;

  fromFn.mockImplementation(() => {
    const resp = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;

    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.in = vi.fn().mockReturnValue(chain);
    chain.gte = vi.fn().mockReturnValue(chain);
    chain.lte = vi.fn().mockReturnValue(chain);
    chain.gt = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.update = vi.fn().mockReturnValue(chain);
    chain.delete = vi.fn().mockReturnValue(chain);
    chain.upsert = vi.fn().mockReturnValue(chain);
    chain.maybeSingle = vi.fn().mockResolvedValue(resp);
    chain.single = vi.fn().mockResolvedValue(resp);
    // Make the chain itself thenable so `await chain` resolves correctly
    chain.then = (resolve: (r: unknown) => unknown) =>
      Promise.resolve(resp).then(resolve);
    return chain;
  });
}

// ---------------------------------------------------------------------------
// GET tests
// ---------------------------------------------------------------------------
describe('GET /api/favorites/device', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.__reset();
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns 400 when deviceId is missing', async () => {
    const res = await GET(makeGetRequest({}));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/deviceId/i);
  });

  it('returns 400 when deviceId is not a valid UUID v4', async () => {
    const res = await GET(makeGetRequest({ deviceId: 'not-a-uuid' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/UUID v4/i);
  });

  it('returns favorites for a valid device ID', async () => {
    const favorites = [makeFavorite(), makeFavorite({ id: 2, club_id: 'hilldeloci' })];
    mockSupabase.__setResponse({ data: favorites, error: null });

    const res = await GET(makeGetRequest({ deviceId: VALID_DEVICE_ID }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].device_id).toBe(VALID_DEVICE_ID);
  });

  it('returns an empty array when the device has no favorites', async () => {
    mockSupabase.__setResponse({ data: [], error: null });

    const res = await GET(makeGetRequest({ deviceId: VALID_DEVICE_ID }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns an empty array when data is null', async () => {
    mockSupabase.__setResponse({ data: null, error: null });

    const res = await GET(makeGetRequest({ deviceId: VALID_DEVICE_ID }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns 500 when Supabase returns an error', async () => {
    mockSupabase.__setResponse({ data: null, error: { message: 'DB error' } });

    const res = await GET(makeGetRequest({ deviceId: VALID_DEVICE_ID }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to fetch device favorites/i);
  });
});

// ---------------------------------------------------------------------------
// POST tests
// ---------------------------------------------------------------------------
describe('POST /api/favorites/device', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.__reset();
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns 400 when body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost/api/favorites/device', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'NOT JSON',
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid json/i);
  });

  it('returns 400 when deviceId is missing from body', async () => {
    const res = await POST(makePostRequest({ clubId: VALID_CLUB_ID }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/deviceId/i);
  });

  it('returns 400 when deviceId is not a string', async () => {
    const res = await POST(makePostRequest({ deviceId: 12345, clubId: VALID_CLUB_ID }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/deviceId/i);
  });

  it('validates UUID v4 format — rejects invalid device ID', async () => {
    const res = await POST(makePostRequest({ deviceId: 'bad-uuid', clubId: VALID_CLUB_ID }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/UUID v4/i);
  });

  it('rejects a UUID v1 device ID (wrong version digit)', async () => {
    // Version digit = 1 (not 4)
    const uuidV1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const res = await POST(makePostRequest({ deviceId: uuidV1, clubId: VALID_CLUB_ID }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/UUID v4/i);
  });

  it('returns 400 when clubId is missing', async () => {
    const res = await POST(makePostRequest({ deviceId: VALID_DEVICE_ID }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/clubId/i);
  });

  it('returns 400 when clubId is not a string', async () => {
    const res = await POST(makePostRequest({ deviceId: VALID_DEVICE_ID, clubId: 42 }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/clubId/i);
  });

  it('enforces the 50-favorite limit per device', async () => {
    // The count query returns count = 50 (at the limit)
    buildSequentialMock(
      mockSupabase.from as ReturnType<typeof vi.fn>,
      [{ data: null, error: null, count: 50 }],
    );

    const res = await POST(makePostRequest({ deviceId: VALID_DEVICE_ID, clubId: VALID_CLUB_ID }));

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe('MAX_FAVORITES_EXCEEDED');
    expect(body.error).toMatch(/50/);
  });

  it('returns 409 when the club is already in favorites', async () => {
    buildSequentialMock(
      mockSupabase.from as ReturnType<typeof vi.fn>,
      [
        { data: null, error: null, count: 3 },       // count check: 3 < 50
        { data: { id: 99 }, error: null },            // maybeSingle: already exists
      ],
    );

    const res = await POST(makePostRequest({ deviceId: VALID_DEVICE_ID, clubId: VALID_CLUB_ID }));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already in device favorites/i);
  });

  it('returns 201 and the new favorite on successful insert', async () => {
    const newFavorite = makeFavorite();

    buildSequentialMock(
      mockSupabase.from as ReturnType<typeof vi.fn>,
      [
        { data: null, error: null, count: 3 },   // count: 3 (< 50)
        { data: null, error: null },              // maybeSingle: not existing
        { data: newFavorite, error: null },       // insert.select().single()
      ],
    );

    const res = await POST(makePostRequest({ deviceId: VALID_DEVICE_ID, clubId: VALID_CLUB_ID }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.club_id).toBe(VALID_CLUB_ID);
    expect(body.device_id).toBe(VALID_DEVICE_ID);
  });
});

// ---------------------------------------------------------------------------
// DELETE tests
// ---------------------------------------------------------------------------
describe('DELETE /api/favorites/device', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.__reset();
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns 400 when body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost/api/favorites/device', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: '{bad json',
    });
    const res = await DELETE(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid json/i);
  });

  it('returns 400 when deviceId is missing', async () => {
    const res = await DELETE(makeDeleteRequest({ clubId: VALID_CLUB_ID }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/deviceId/i);
  });

  it('validates UUID v4 format on DELETE — rejects invalid device ID', async () => {
    const res = await DELETE(makeDeleteRequest({ deviceId: 'not-uuid', clubId: VALID_CLUB_ID }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/UUID v4/i);
  });

  it('returns 400 when clubId is missing', async () => {
    const res = await DELETE(makeDeleteRequest({ deviceId: VALID_DEVICE_ID }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/clubId/i);
  });

  it('removes a favorite and returns { success: true }', async () => {
    // delete returns count: 1 (one row deleted)
    mockSupabase.__setResponse({ data: null, error: null, count: 1 });

    const res = await DELETE(makeDeleteRequest({ deviceId: VALID_DEVICE_ID, clubId: VALID_CLUB_ID }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 404 when the favorite does not exist (count = 0)', async () => {
    mockSupabase.__setResponse({ data: null, error: null, count: 0 });

    const res = await DELETE(makeDeleteRequest({ deviceId: VALID_DEVICE_ID, clubId: VALID_CLUB_ID }));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  it('returns 500 when Supabase returns an error during delete', async () => {
    mockSupabase.__setResponse({
      data: null,
      error: { message: 'constraint violation' },
      count: null,
    });

    const res = await DELETE(makeDeleteRequest({ deviceId: VALID_DEVICE_ID, clubId: VALID_CLUB_ID }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to remove device favorite/i);
  });
});
