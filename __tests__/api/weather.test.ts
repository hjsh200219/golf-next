/**
 * Unit tests for GET /api/weather
 *
 * Flow:
 *  1. Validate lat/lon params
 *  2. Convert to geohash
 *  3. Check weather_cache table → return cached data if fresh
 *  4. On cache miss → call OpenWeatherMap API
 *  5. Store result in cache and return it
 *
 * External dependencies mocked:
 *  - @/lib/supabase/server  (Supabase client)
 *  - @/lib/utils/geohash    (deterministic hash so we can assert on it)
 *  - global fetch           (OpenWeatherMap HTTP call)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createMockSupabase } from '../helpers/mock-supabase';
import type { MockSupabase } from '../helpers/mock-supabase';

// ---------------------------------------------------------------------------
// Mocks must be declared BEFORE importing the module under test.
// ---------------------------------------------------------------------------
const mockSupabase: MockSupabase = createMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => mockSupabase),
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: vi.fn(() => []), set: vi.fn() })),
}));

// Mock geohash so the result is deterministic in tests
vi.mock('@/lib/utils/geohash', () => ({
  toGeohash: vi.fn((_lat: number, _lon: number) => 'wy4gh6'),
}));

import { GET } from '@/app/api/weather/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/weather');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

const FUTURE_ISO = new Date(Date.now() + 60 * 60 * 1000).toISOString();

const makeCachedRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  geohash: 'wy4gh6',
  lat: 37.5,
  lon: 127.0,
  data_type: 'current',
  data: { current: { temp: 15 } },
  cached_at: new Date().toISOString(),
  expires_at: FUTURE_ISO,
  ...overrides,
});

const makeOwmResponse = () => ({
  lat: 37.5,
  lon: 127.0,
  timezone: 'Asia/Seoul',
  timezone_offset: 32400,
  current: {
    dt: 1711500000,
    sunrise: 1711480000,
    sunset: 1711520000,
    temp: 18.4,
    feels_like: 17.0,
    pressure: 1015,
    humidity: 55,
    dew_point: 8.9,
    uvi: 3.5,
    clouds: 10,
    visibility: 10000,
    wind_speed: 3.2,
    wind_deg: 270,
    weather: [{ id: 800, main: 'Clear', description: '맑음', icon: '01d' }],
  },
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
    chain.then = (resolve: (r: unknown) => unknown) =>
      Promise.resolve(resp).then(resolve);
    return chain;
  });
}

// ---------------------------------------------------------------------------
// Validation tests
// ---------------------------------------------------------------------------
describe('GET /api/weather — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.__reset();
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns 400 when lat is missing', async () => {
    const res = await GET(makeRequest({ lon: '127.0' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/lat and lon/i);
  });

  it('returns 400 when lon is missing', async () => {
    const res = await GET(makeRequest({ lat: '37.5' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/lat and lon/i);
  });

  it('returns 400 when both lat and lon are missing', async () => {
    const res = await GET(makeRequest({}));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/lat and lon/i);
  });

  it('returns 400 when lat is not a number', async () => {
    const res = await GET(makeRequest({ lat: 'north', lon: '127.0' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/valid numbers/i);
  });

  it('returns 400 when lon is not a number', async () => {
    const res = await GET(makeRequest({ lat: '37.5', lon: 'east' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/valid numbers/i);
  });

  it('returns 400 when lat is out of range (> 90)', async () => {
    const res = await GET(makeRequest({ lat: '91', lon: '127.0' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/lat must be between/i);
  });

  it('returns 400 when lat is out of range (< -90)', async () => {
    const res = await GET(makeRequest({ lat: '-91', lon: '127.0' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/lat must be between/i);
  });

  it('returns 400 when lon is out of range (> 180)', async () => {
    const res = await GET(makeRequest({ lat: '37.5', lon: '181' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/lon must be between/i);
  });

  it('returns 400 when lon is out of range (< -180)', async () => {
    const res = await GET(makeRequest({ lat: '37.5', lon: '-181' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/lon must be between/i);
  });
});

// ---------------------------------------------------------------------------
// Cache hit
// ---------------------------------------------------------------------------
describe('GET /api/weather — cache hit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.__reset();
    vi.stubGlobal('fetch', vi.fn()); // should not be called on cache hit
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns cached data when a fresh cache entry exists', async () => {
    const cached = makeCachedRow();
    // maybeSingle() will return the cached row
    mockSupabase.__setResponse({ data: cached, error: null });

    const res = await GET(makeRequest({ lat: '37.5', lon: '127.0' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe('cache');
    expect(body.geohash).toBe('wy4gh6');
    expect(body.data).toEqual(cached.data);
    // fetch() must NOT have been called
    expect(fetch).not.toHaveBeenCalled();
  });

  it('includes cached_at and expires_at in the cache-hit response', async () => {
    const cached = makeCachedRow();
    mockSupabase.__setResponse({ data: cached, error: null });

    const res = await GET(makeRequest({ lat: '37.5', lon: '127.0' }));
    const body = await res.json();

    expect(body.cached_at).toBe(cached.cached_at);
    expect(body.expires_at).toBe(cached.expires_at);
  });
});

// ---------------------------------------------------------------------------
// Cache miss — fetch from OpenWeatherMap
// ---------------------------------------------------------------------------
describe('GET /api/weather — cache miss', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.__reset();
    process.env = { ...OLD_ENV, OPENWEATHERMAP_API_KEY: 'test-api-key' };
  });

  afterEach(() => {
    process.env = OLD_ENV;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('fetches from OpenWeatherMap when there is no cache entry', async () => {
    // maybeSingle returns null = cache miss
    mockSupabase.__setResponse({ data: null, error: null });

    const owmData = makeOwmResponse();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(owmData),
        text: vi.fn().mockResolvedValue(''),
      }),
    );

    const res = await GET(makeRequest({ lat: '37.5', lon: '127.0' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe('api');
    expect(body.geohash).toBe('wy4gh6');
    expect(body.data.current.temp).toBe(18.4);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('calls OpenWeatherMap with the correct lat, lon, and API key', async () => {
    mockSupabase.__setResponse({ data: null, error: null });

    const owmData = makeOwmResponse();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(owmData),
      text: vi.fn().mockResolvedValue(''),
    });
    vi.stubGlobal('fetch', fetchMock);

    await GET(makeRequest({ lat: '37.5', lon: '127.0' }));

    const calledUrl: string = (fetchMock.mock.calls[0] as [string])[0];
    expect(calledUrl).toContain('lat=37.5');
    expect(calledUrl).toContain('lon=127');
    expect(calledUrl).toContain('appid=test-api-key');
    expect(calledUrl).toContain('units=metric');
  });

  it('includes source: api, cached_at, and expires_at in the API-hit response', async () => {
    mockSupabase.__setResponse({ data: null, error: null });

    const owmData = makeOwmResponse();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(owmData),
        text: vi.fn().mockResolvedValue(''),
      }),
    );

    const res = await GET(makeRequest({ lat: '37.5', lon: '127.0' }));
    const body = await res.json();

    expect(body.source).toBe('api');
    expect(typeof body.expires_at).toBe('string');
    expect(typeof body.cached_at).toBe('string');
  });

  it('returns 503 when OPENWEATHERMAP_API_KEY is not configured', async () => {
    delete process.env.OPENWEATHERMAP_API_KEY;
    mockSupabase.__setResponse({ data: null, error: null }); // cache miss
    vi.stubGlobal('fetch', vi.fn());

    const res = await GET(makeRequest({ lat: '37.5', lon: '127.0' }));

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/api key/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns 502 when OpenWeatherMap returns a non-OK status', async () => {
    mockSupabase.__setResponse({ data: null, error: null });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: vi.fn().mockResolvedValue('Too Many Requests'),
      }),
    );

    const res = await GET(makeRequest({ lat: '37.5', lon: '127.0' }));

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/429/);
  });

  it('proceeds even when the cache insert fails (non-fatal error)', async () => {
    // Call 1 (maybeSingle cache lookup) = miss
    // Call 2 (insert into weather_cache) = error (non-fatal)
    buildSequentialMock(
      mockSupabase.from as ReturnType<typeof vi.fn>,
      [
        { data: null, error: null },                          // cache miss
        { data: null, error: { message: 'insert failed' } }, // cache insert error
      ],
    );

    const owmData = makeOwmResponse();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(owmData),
        text: vi.fn().mockResolvedValue(''),
      }),
    );

    const res = await GET(makeRequest({ lat: '37.5', lon: '127.0' }));

    // Should still return 200 because cache insert failure is non-fatal
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe('api');
    expect(body.data.current.temp).toBe(18.4);
  });

  it('proceeds to fetch from API even when the cache lookup returns an error', async () => {
    // Cache lookup error is non-fatal in the route (it falls through to fetch)
    mockSupabase.__setResponse({ data: null, error: { message: 'cache table missing' } });

    const owmData = makeOwmResponse();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(owmData),
        text: vi.fn().mockResolvedValue(''),
      }),
    );

    const res = await GET(makeRequest({ lat: '37.5', lon: '127.0' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    // cache lookup error → data is null → treated as cache miss → goes to OWM API
    expect(body.source).toBe('api');
  });
});
