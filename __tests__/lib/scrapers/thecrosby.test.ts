import { describe, it, expect, vi, afterEach } from 'vitest';
import TheCrosbyScraper from '@/lib/scrapers/thecrosby';
import type { LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'crosbyid', id2: 'test2', email: 'test@test.com',
  pw: 'crosbypw', pw1: 'pw1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5', pw6: 'pw6',
  name: 'Test', mobile: '01012345678',
};

const LOGIN_PAGE = `<html><body>
  <input id="__VIEWSTATE" value="vs" />
  <input id="__VIEWSTATEGENERATOR" value="vsg" />
  <input id="__EVENTVALIDATION" value="ev" />
</body></html>`;

// Live reservation table: leading row-index column.
// [0]index [1]time [2]course [3]hole [4]인원 [5]price
const RESERVATION = `<table class="timeTbl">
  <tr><td>1</td><td>17:40</td><td>빌리</td><td>09홀</td><td>2</td><td>80,000원</td></tr>
  <tr><td>2</td><td>06:30</td><td>밥</td><td>18홀</td><td>4</td><td>150,000원</td></tr>
</table>`;

afterEach(() => vi.restoreAllMocks());

function mockFetch(scraper: TheCrosbyScraper, capture: { bodies: string[] }) {
  return vi.spyOn(
    scraper as unknown as { fetch: typeof globalThis.fetch },
    'fetch',
  ).mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    if (init?.body) capture.bodies.push(String(init.body));
    if (u.includes('Reservation.aspx?SelectedDate')) return new Response(RESERVATION, { status: 200 });
    return new Response(LOGIN_PAGE, { status: 200 });
  });
}

describe('TheCrosbyScraper', () => {
  it('posts ASP.NET login field names (not txtLoginID/txtLoginPW)', async () => {
    const capture = { bodies: [] as string[] };
    const scraper = new TheCrosbyScraper('20260607', MOCK_CREDENTIALS);
    mockFetch(scraper, capture);

    await scraper.scrape();

    const loginBody = capture.bodies.find((b) => b.includes('userID') || b.includes('txtLoginID')) ?? '';
    const p = new URLSearchParams(loginBody);
    expect(p.get('ctl00$ContentPlaceHolder1$userID')).toBe('crosbyid');
    expect(p.get('ctl00$ContentPlaceHolder1$userPass')).toBe('crosbypw');
    expect(p.get('__EVENTTARGET')).toBe('ctl00$ContentPlaceHolder1$SendLoginButton');
    // old field names must be gone
    expect(p.get('txtLoginID')).toBeNull();
    expect(p.get('txtLoginPW')).toBeNull();
  });

  it('parses rows with the leading-index column layout', async () => {
    const capture = { bodies: [] as string[] };
    const scraper = new TheCrosbyScraper('20260607', MOCK_CREDENTIALS);
    mockFetch(scraper, capture);

    const rows = await scraper.scrape();
    const times = rows.map((r) => r.teeoff);
    expect(times).toContain('17:40');
    expect(times).toContain('06:30');
    expect(rows.map((r) => r.course)).toEqual(['빌리', '밥']);
    expect(rows.every((r) => /^\d{1,2}:\d{2}$/.test(r.teeoff))).toBe(true);
  });
});
