import { describe, it, expect, vi, afterEach } from 'vitest';
import PineStoneScraper from '@/lib/scrapers/pinestone';
import type { LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'psid', id2: 'test2', email: 'test@test.com',
  pw: 'PS_PW', pw1: 'pw1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5', pw6: 'pw6',
  name: 'Test', mobile: '01012345678',
};

// Live api.pinestonecc.com shape: contents.reservationTimeInfoList[].
// Store greenFeeDiscountAmt (할인가), course from courseName, filter availablePerson>0.
const BOOKING_JSON = {
  contents: {
    reservationTimeInfoList: [
      { timeTableId: 11801, courseName: '파인', bookingTime: '18:01', orgGreenFeeAmt: 240000, greenFeeDiscountAmt: 140000, availablePerson: 4 },
      { timeTableId: 21850, courseName: '스톤', bookingTime: '18:50', orgGreenFeeAmt: 240000, greenFeeDiscountAmt: 140000, availablePerson: 4 },
      // fully booked — must be filtered out
      { timeTableId: 11857, courseName: '파인', bookingTime: '18:57', orgGreenFeeAmt: 240000, greenFeeDiscountAmt: 140000, availablePerson: 0 },
    ],
  },
  result: { resultCode: 'SN_COMMON_000' },
};

const LOGIN_JSON = {
  contents: { accessToken: 'JWT_TOKEN_ABC', memberUserYn: 'Y' },
  result: { resultCode: 'SN_COMMON_000' },
};

afterEach(() => vi.restoreAllMocks());

function mockFetch(scraper: PineStoneScraper, cap: { urls: string[]; headers: HeadersInit[]; bodies: string[] }) {
  return vi.spyOn(
    scraper as unknown as { fetch: typeof globalThis.fetch },
    'fetch',
  ).mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    cap.urls.push(u);
    if (init?.headers) cap.headers.push(init.headers);
    if (init?.body) cap.bodies.push(String(init.body));
    if (u.includes('/api/v1/auth/login')) {
      return new Response(JSON.stringify(LOGIN_JSON), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify(BOOKING_JSON), { status: 200, headers: { 'content-type': 'application/json' } });
  });
}

describe('PineStoneScraper', () => {
  it('logs in at the JSON auth API and drops the dead ASP endpoint', async () => {
    const cap = { urls: [] as string[], headers: [] as HeadersInit[], bodies: [] as string[] };
    const scraper = new PineStoneScraper('20260603', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    await scraper.scrape();

    expect(cap.urls.some((u) => u.includes('/api/v1/auth/login'))).toBe(true);
    expect(cap.urls.some((u) => u.includes('real_timelist_ajax_list.asp'))).toBe(false);
    // login body is JSON { userId, password }
    const loginBody = cap.bodies.find((b) => b.includes('userId')) ?? '';
    expect(JSON.parse(loginBody)).toMatchObject({ userId: 'psid', password: 'PS_PW' });
  });

  it('calls the booking API with a dotted date + Bearer token and parses open slots', async () => {
    const cap = { urls: [] as string[], headers: [] as HeadersInit[], bodies: [] as string[] };
    const scraper = new PineStoneScraper('20260603', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    const rows = await scraper.scrape();

    // dotted date format
    expect(cap.urls.some((u) => u.includes('bookingDate=2026.06.03'))).toBe(true);
    // Bearer token from login response sent on the booking request
    const bookingHeaders = cap.headers.find((h) => JSON.stringify(h).includes('Bearer'));
    expect(JSON.stringify(bookingHeaders)).toContain('Bearer JWT_TOKEN_ABC');

    // 2 open slots (availablePerson>0); the booked one is excluded
    expect(rows.length).toBe(2);
    const pine = rows.find((r) => r.teeoff === '18:01');
    expect(pine).toMatchObject({ course: '파인', cc_name: '파인스톤CC', date: '2026-06-03' });
    expect(String(pine!.price)).toBe('140000'); // greenFeeDiscountAmt
    expect(rows.find((r) => r.teeoff === '18:50')!.course).toBe('스톤');
    expect(rows.filter((r) => r.teeoff === '18:57')).toHaveLength(0);
  });
});
