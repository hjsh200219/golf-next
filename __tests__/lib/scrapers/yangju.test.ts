import { describe, it, expect, vi, afterEach } from 'vitest';
import YangjuScraper from '@/lib/scrapers/yangju';
import type { LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'test', id2: 'test2', email: 'test@test.com',
  pw: 'PW_BASE', pw1: 'pw1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5',
  pw6: 'PW_SIX',
  name: 'Test', mobile: '01012345678',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('YangjuScraper login', () => {
  it('sends GOLF_LOGIN_PW6 (credentials.pw6) as usr_pwd, not pw', async () => {
    const bodies: string[] = [];
    // Intercept the cookie-wrapped fetch on the instance.
    const scraper = new YangjuScraper('20260328', MOCK_CREDENTIALS);
    vi.spyOn(
      scraper as unknown as { fetch: typeof globalThis.fetch },
      'fetch',
    ).mockImplementation(async (_url: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(String(init?.body ?? ''));
      return new Response('<table></table>', { status: 200 });
    });

    await scraper.scrape();

    const loginBody = bodies[0];
    const params = new URLSearchParams(loginBody);
    expect(params.get('usr_pwd')).toBe('PW_SIX');
    expect(params.get('usr_pwd')).not.toBe('PW_BASE');
    expect(params.get('mem_id')).toBe('test');
  });

  it('sends dategbn=2 on the tee-time list request (matches live site)', async () => {
    const bodies: string[] = [];
    const scraper = new YangjuScraper('20260601', MOCK_CREDENTIALS);
    vi.spyOn(
      scraper as unknown as { fetch: typeof globalThis.fetch },
      'fetch',
    ).mockImplementation(async (_url: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(String(init?.body ?? ''));
      return new Response('<table></table>', { status: 200 });
    });

    await scraper.scrape();

    // bodies[1] is the list request (bodies[0] is login)
    const listParams = new URLSearchParams(bodies[1]);
    expect(listParams.get('dategbn')).toBe('2');
    expect(listParams.get('pointdate')).toBe('20260601');
  });

  it('decodes euc-kr Korean course names (서/동), not mojibake', async () => {
    // euc-kr bytes: 서 = BC AD, 동 = B5 BF
    const seo = Buffer.from([0xbc, 0xad]);
    const dong = Buffer.from([0xb5, 0xbf]);
    const lit = (s: string) => Buffer.from(s, 'latin1');
    const body = Buffer.concat([
      lit('<table><tr><td>1</td><td>'), seo, lit('</td><td>06:40</td><td>18홀</td><td>x</td></tr>'),
      lit('<tr><td>2</td><td>'), dong, lit('</td><td>06:40</td><td>18홀</td><td>x</td></tr></table>'),
    ]);
    const scraper = new YangjuScraper('20260607', MOCK_CREDENTIALS);
    vi.spyOn(
      scraper as unknown as { fetch: typeof globalThis.fetch },
      'fetch',
    ).mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).includes('real_timelist_ajax_list')) return new Response(body, { status: 200 });
      return new Response('<html></html>', { status: 200 });
    });

    const rows = await scraper.scrape();
    const courses = rows.map((r) => r.course);
    expect(courses).toContain('서');
    expect(courses).toContain('동');
    expect(courses.join('')).not.toContain('�');
  });

  it('parses tee-time rows from the live response format (번호/코스/시간)', async () => {
    const liveHtml = `<table>
      <tr><td>번호</td><td>코스</td><td>시간</td><td>홀</td><td>예약</td></tr>
      <tr><td>1</td><td>서</td><td>06:40</td><td>18홀</td><td>신청[0640]</td></tr>
      <tr><td>2</td><td>동</td><td>13:01</td><td>18홀</td><td>신청[1301]</td></tr>
    </table>`;
    const scraper = new YangjuScraper('20260601', MOCK_CREDENTIALS);
    vi.spyOn(
      scraper as unknown as { fetch: typeof globalThis.fetch },
      'fetch',
    ).mockImplementation(async (url: RequestInfo | URL) => {
      const u = String(url);
      const body = u.includes('real_timelist_ajax_list') ? liveHtml : '<html></html>';
      return new Response(body, { status: 200 });
    });

    const rows = await scraper.scrape();
    // header row (시간 cell = "시간") is filtered by formatTime; data rows kept
    const times = rows.map((r) => r.teeoff);
    expect(times).toContain('06:40');
    expect(times).toContain('13:01');
    expect(rows.every((r) => r.cc_name === '양주CC')).toBe(true);
  });
});
