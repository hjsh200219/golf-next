import { describe, it, expect, vi, afterEach } from 'vitest';
import GolfzonCountyScraper from '@/lib/scrapers/golfzoncounty';
import type { LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'gzid', id2: 'test2', email: 'test@test.com',
  pw: 'BASE_PW', pw1: 'GZ_PW1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5', pw6: 'pw6',
  name: 'Test', mobile: '01012345678',
};

// Live getList JSON shape (trimmed): data.reserveDayTeetimeList[].teetime[]
const GETLIST_JSON = {
  result: 0,
  data: {
    reserveDayTeetimeList: [
      {
        golfclubName: '이글몬트',
        teetime: [
          { bookgTime: '1207', courseName: '몬트', amt4: '160000', holeName: '18홀', partName: '2부' },
          { bookgTime: '0705', courseName: '히든', amt4: '180000', holeName: '18홀', partName: '1부' },
        ],
      },
      {
        golfclubName: '골프존카운티 안성W',
        teetime: [
          { bookgTime: '1146', courseName: 'OUT', amt4: '190000', holeName: '18홀', partName: '2부' },
        ],
      },
    ],
  },
};

afterEach(() => vi.restoreAllMocks());

function mockFetch(scraper: GolfzonCountyScraper, cap: { urls: string[]; bodies: string[] }) {
  return vi.spyOn(
    scraper as unknown as { fetch: typeof globalThis.fetch },
    'fetch',
  ).mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    cap.urls.push(u);
    if (init?.body) cap.bodies.push(String(init.body));
    if (u.includes('/reserve/multiple/teetime/getList')) {
      return new Response(JSON.stringify(GETLIST_JSON), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    // login
    return new Response(JSON.stringify({ result: 0, message: '', data: { userInfo: {} } }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
}

describe('GolfzonCountyScraper', () => {
  it('logs in at /login/userLogin (form) with id + pw1', async () => {
    const cap = { urls: [] as string[], bodies: [] as string[] };
    const scraper = new GolfzonCountyScraper('20260602', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    await scraper.scrape();

    expect(cap.urls.some((u) => u.includes('/login/userLogin'))).toBe(true);
    const loginBody = cap.bodies.find((b) => b.includes('userId')) ?? '';
    const p = new URLSearchParams(loginBody);
    expect(p.get('userId')).toBe('gzid');
    expect(p.get('userPw')).toBe('GZ_PW1');
    // old dead endpoint must be gone
    expect(cap.urls.some((u) => u.includes('/member/ajax/loginChk'))).toBe(false);
  });

  it('calls the getList JSON API and parses teetime entries', async () => {
    const cap = { urls: [] as string[], bodies: [] as string[] };
    const scraper = new GolfzonCountyScraper('20260602', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    const rows = await scraper.scrape();

    expect(cap.urls.some((u) => u.includes('/reserve/multiple/teetime/getList') && u.includes('selectDate=20260602'))).toBe(true);
    expect(rows.length).toBe(3);
    const times = rows.map((r) => r.teeoff);
    expect(times).toContain('12:07');
    expect(times).toContain('07:05');
    expect(times).toContain('11:46');
    expect(rows.every((r) => /^\d{1,2}:\d{2}$/.test(r.teeoff))).toBe(true);
    // cc_name from golfclubName
    expect(rows[0].cc_name).toBe('이글몬트');
    expect(rows[2].cc_name).toBe('골프존카운티 안성W');
    // price from amt4
    expect(String(rows[0].price)).toBe('160000');
    expect(rows[0].course).toBe('몬트');
  });
});
