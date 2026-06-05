import { describe, it, expect, vi, afterEach } from 'vitest';
import NamchuncheonScraper from '@/lib/scrapers/namchuncheon';
import type { LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'inter349', id2: 'test2', email: 'test@test.com',
  pw: 'pw', pw1: 'pw1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5', pw6: 'pw6',
  name: 'Test', mobile: '01012345678',
};

// Captured live: POST /api/v1/auth/login → { contents: { accessToken } }
const LOGIN_RESPONSE = {
  contents: { accessToken: 'eyJhbGciOiJIUzI1NiJ9.FAKE.JWT' },
  result: { resultCodeType: 'SN', resultCode: 'SN_COMMON_000', resultMessage: null },
};

// Captured live: GET /api/v1/booking/list/token?bookingDate=YYYY.MM.DD&bookingQueryType=ALL
const BOOKING_RESPONSE = {
  contents: {
    reservationTimeInfoList: [
      { courseName: 'Challenge', bookingTime: '06:18', orgGreenFeeAmt: 160000, greenFeeDiscountAmt: 160000, greenFeeForDisplay: '160,000', eventRemark: '' },
      { courseName: 'Victory', bookingTime: '08:01', orgGreenFeeAmt: 190000, greenFeeDiscountAmt: 190000, greenFeeForDisplay: '190,000', eventRemark: '' },
      { courseName: 'Victory', bookingTime: '13:42', orgGreenFeeAmt: 190000, greenFeeDiscountAmt: 150000, greenFeeForDisplay: '150,000', eventRemark: '특가' },
    ],
  },
  result: { resultCodeType: 'SN', resultCode: 'SN_COMMON_000', resultMessage: null },
};

// Auth-failure / login-required shape (when token rejected)
const AUTH_FAIL = {
  contents: null,
  result: { resultCodeType: 'LM', resultCode: 'FM_AUTH_000', resultMessage: '로그인이 필요한 서비스입니다.' },
};

afterEach(() => vi.restoreAllMocks());

function mockFetch(
  scraper: NamchuncheonScraper,
  cap: { urls: string[]; bodies: string[]; headers: HeadersInit[] },
  opts: { loginOk?: boolean; bookingBody?: unknown } = {},
) {
  const { loginOk = true, bookingBody = BOOKING_RESPONSE } = opts;
  return vi.spyOn(
    scraper as unknown as { fetch: typeof globalThis.fetch },
    'fetch',
  ).mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    cap.urls.push(u);
    if (init?.body) cap.bodies.push(String(init.body));
    if (init?.headers) cap.headers.push(init.headers);
    if (u.includes('/auth/login')) {
      return new Response(JSON.stringify(loginOk ? LOGIN_RESPONSE : AUTH_FAIL), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    }
    if (u.includes('/booking/list/token')) {
      return new Response(JSON.stringify(bookingBody), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  });
}

describe('NamchuncheonScraper', () => {
  it('logs in with userId/password JSON and golfclubid header', async () => {
    const cap = { urls: [] as string[], bodies: [] as string[], headers: [] as HeadersInit[] };
    const scraper = new NamchuncheonScraper('2026-06-12', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    await scraper.scrape();

    const loginIdx = cap.urls.findIndex((u) => u.includes('/auth/login'));
    expect(loginIdx).toBeGreaterThanOrEqual(0);
    const body = JSON.parse(cap.bodies[loginIdx]);
    expect(body.userId).toBe('inter349');
    expect(body.password).toBe('pw');
  });

  it('requests booking list with dotted date and bookingQueryType=ALL', async () => {
    const cap = { urls: [] as string[], bodies: [] as string[], headers: [] as HeadersInit[] };
    const scraper = new NamchuncheonScraper('2026-06-12', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    await scraper.scrape();

    const bookingUrl = cap.urls.find((u) => u.includes('/booking/list/token'));
    expect(bookingUrl).toContain('bookingDate=2026.06.12'); // dotted, not dashed/compact
    expect(bookingUrl).toContain('bookingQueryType=ALL');
  });

  it('parses reservationTimeInfoList into rows using discount price', async () => {
    const cap = { urls: [] as string[], bodies: [] as string[], headers: [] as HeadersInit[] };
    const scraper = new NamchuncheonScraper('2026-06-12', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    const rows = await scraper.scrape();

    expect(rows.length).toBe(3);
    expect(rows[0]).toMatchObject({
      date: '2026-06-12', cc_name: '남춘천CC', teeoff: '06:18', course: 'Challenge',
    });
    expect(Number(rows[0].price)).toBe(160000);
    // discount tier, not org price
    expect(Number(rows[2].price)).toBe(150000);
    expect(rows[2].event).toBe('특가');
  });

  it('throws when the token is rejected (no silent success:0)', async () => {
    const cap = { urls: [] as string[], bodies: [] as string[], headers: [] as HeadersInit[] };
    const scraper = new NamchuncheonScraper('2026-06-12', MOCK_CREDENTIALS);
    mockFetch(scraper, cap, { bookingBody: AUTH_FAIL });

    await expect(scraper.scrape()).rejects.toThrow();
  });

  it('throws when login fails', async () => {
    const cap = { urls: [] as string[], bodies: [] as string[], headers: [] as HeadersInit[] };
    const scraper = new NamchuncheonScraper('2026-06-12', MOCK_CREDENTIALS);
    mockFetch(scraper, cap, { loginOk: false });

    await expect(scraper.scrape()).rejects.toThrow();
  });
});
