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

  // Live responses 2026-11-21: overlapping logins on the one-session account.
  const LOGIN_CONFLICT_JSON = {
    contents: null,
    result: { resultCodeType: 'FN', resultCode: 'FN_COMMON_001', resultMessage: '문제가 발생했습니다. 관리자에게 문의하세요.' },
  };
  const KICKED_JSON = {
    contents: null,
    result: { resultCodeType: 'LM', resultCode: 'FM_LOGIN_002', resultMessage: '다른 기기에서 로그인되어 자동 로그아웃되었습니다. 다시 로그인해 주세요.' },
  };

  function stubSleep(scraper: PineStoneScraper) {
    return vi.spyOn(scraper as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep')
      .mockResolvedValue(undefined);
  }

  it('retries login after FN_COMMON_001 and scrapes once it succeeds', async () => {
    const scraper = new PineStoneScraper('20261122', MOCK_CREDENTIALS);
    const sleep = stubSleep(scraper);
    let logins = 0;
    vi.spyOn(scraper as unknown as { fetch: typeof globalThis.fetch }, 'fetch')
      .mockImplementation(async (url: RequestInfo | URL) => {
        if (String(url).includes('/api/v1/auth/login')) {
          logins++;
          return new Response(JSON.stringify(logins < 2 ? LOGIN_CONFLICT_JSON : LOGIN_JSON));
        }
        return new Response(JSON.stringify(BOOKING_JSON));
      });

    const rows = await scraper.scrape();
    expect(logins).toBe(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(2);
  });

  it('throws with the result code when every login attempt is refused', async () => {
    const scraper = new PineStoneScraper('20261122', MOCK_CREDENTIALS);
    stubSleep(scraper);
    vi.spyOn(scraper as unknown as { fetch: typeof globalThis.fetch }, 'fetch')
      .mockImplementation(async () => new Response(JSON.stringify(LOGIN_CONFLICT_JSON)));

    await expect(scraper.scrape()).rejects.toThrow(/pinestone: login failed.*FN_COMMON_001/);
  });

  it('throws when the booking list says the session was kicked (FM_LOGIN_002), not an empty success', async () => {
    const scraper = new PineStoneScraper('20261122', MOCK_CREDENTIALS);
    stubSleep(scraper);
    vi.spyOn(scraper as unknown as { fetch: typeof globalThis.fetch }, 'fetch')
      .mockImplementation(async (url: RequestInfo | URL) => new Response(JSON.stringify(
        String(url).includes('/api/v1/auth/login') ? LOGIN_JSON : KICKED_JSON,
      )));

    await expect(scraper.scrape()).rejects.toThrow(/pinestone: booking list FM_LOGIN_002/);
  });
});
