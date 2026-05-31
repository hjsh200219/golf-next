import { describe, it, expect, vi, afterEach } from 'vitest';
import PhilosGCScraper from '@/lib/scrapers/philosgc';
import type { LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'baseid', id2: 'test2', email: 'test@test.com',
  pw: 'basepw', pw1: 'pw1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5',
  pw6: 'PHILOS_PW',
  name: 'Test', mobile: '01099998888',
};

const LOGIN_PAGE = `<html><body>
  <input id="__VIEWSTATE" value="vs" />
  <input id="__VIEWSTATEGENERATOR" value="vsg" />
  <input id="__EVENTVALIDATION" value="ev" />
</body></html>`;

const RESERVATION_PAGE = `<html><body>
  <input type="hidden" id="__VIEWSTATE" name="__VIEWSTATE" value="rvs" />
  <input type="hidden" id="__VIEWSTATEGENERATOR" name="__VIEWSTATEGENERATOR" value="rvsg" />
  <input type="hidden" id="__EVENTVALIDATION" name="__EVENTVALIDATION" value="rev" />
  <table class="reserveTable"><tr><th>h</th></tr></table>
</body></html>`;

// UpdatePanel async response carrying the populated table (5 columns, no event col).
const UPDATE_RESPONSE = `1|#||4|9999|updatePanel|ctl00_ContentPlaceHolder1_up|
  <table class="reserveTable">
    <tr><th>시간</th><th>코스</th><th>일반</th><th>4인</th><th>예약</th></tr>
    <tr><td>06 : 20(1부)</td><td>동(18 H)</td><td>280,000</td><td>190,000</td><td>예약하기</td></tr>
    <tr><td>13 : 04(2부)</td><td>서(18 H)</td><td>240,000</td><td>180,000</td><td>예약하기</td></tr>
  </table>|`;

afterEach(() => vi.restoreAllMocks());

function mockFetch(scraper: PhilosGCScraper, capture: { bodies: string[]; urls: string[] }) {
  return vi.spyOn(
    scraper as unknown as { fetch: typeof globalThis.fetch },
    'fetch',
  ).mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    capture.urls.push(u);
    if (init?.body) capture.bodies.push(String(init.body));
    const isPost = init?.method === 'POST';
    if (u.includes('/Member/Login.aspx')) {
      return new Response(LOGIN_PAGE, { status: 200 });
    }
    if (u.includes('/Reservation/Reservation.aspx')) {
      // POST = UpdatePanel async (returns populated table); GET = page with tokens
      return new Response(isPost ? UPDATE_RESPONSE : RESERVATION_PAGE, { status: 200 });
    }
    return new Response('<html></html>', { status: 200 });
  });
}

describe('PhilosGCScraper', () => {
  it('logs in at /Member/Login.aspx with mobile + pw6 and ASP.NET postback fields', async () => {
    const capture = { bodies: [] as string[], urls: [] as string[] };
    const scraper = new PhilosGCScraper('20260607', MOCK_CREDENTIALS);
    mockFetch(scraper, capture);

    await scraper.scrape();

    expect(capture.urls.some((u) => u.includes('/Member/Login.aspx'))).toBe(true);
    const loginBody = capture.bodies.find((b) => b.includes('txtUserID')) ?? '';
    const p = new URLSearchParams(loginBody);
    expect(p.get('ctl00$ContentPlaceHolder1$txtUserID')).toBe('01099998888'); // mobile
    expect(p.get('ctl00$ContentPlaceHolder1$txtPassword')).toBe('PHILOS_PW'); // pw6
    expect(p.get('__EVENTTARGET')).toBe('ctl00$ContentPlaceHolder1$ibtnLogin');
    // must NOT use the old /login/login.asp endpoint or txtID/txtPW fields
    expect(capture.urls.some((u) => u.includes('/login/login.asp'))).toBe(false);
  });

  it('parses tee-time rows from the UpdatePanel response (5-col, time/course/price)', async () => {
    const capture = { bodies: [] as string[], urls: [] as string[] };
    const scraper = new PhilosGCScraper('20260607', MOCK_CREDENTIALS);
    mockFetch(scraper, capture);

    const rows = await scraper.scrape();
    const times = rows.map((r) => r.teeoff);
    expect(times).toContain('06:20');
    expect(times).toContain('13:04');
    expect(rows.map((r) => r.course)).toEqual(['동', '서']);
    expect(rows.map((r) => r.price)).toEqual(['280,000', '240,000']);
    expect(rows.every((r) => /^\d{1,2}:\d{2}$/.test(r.teeoff))).toBe(true);
    expect(rows.every((r) => r.cc_name === '필로스CC')).toBe(true);
  });
});
