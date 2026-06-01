import { describe, it, expect, vi, afterEach } from 'vitest';
import PurunsolScraper from '@/lib/scrapers/purunsol';
import type { LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'puid', id2: 'test2', email: 'test@test.com',
  pw: 'pw', pw1: 'pw1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5', pw6: 'pw6',
  name: 'Test', mobile: '01012345678',
};

// Live GetGolfTimeList returns { d: "<json string>" } where the inner .html is a
// BARE <tr> fragment (no <table>). cheerio drops orphan <tr> unless wrapped — that
// was the silent-zero bug. td[1]=time td[2]=course td[4]=price.
const INNER_HTML =
  `<tr id="none"><td>1부</td><td>06:07</td><td>밸  리<!--<br />(18홀)--></td><td>18홀</td><td>170,000원</td> <td><button onclick="javascript:location.href='/Member/LogIn.aspx';">예약</button></td></tr>` +
  `<tr id="none"><td>2부</td><td>12:03</td><td>밸  리<!--<br />(18홀)--></td><td>18홀</td><td>220,000원</td> <td><button>예약</button></td></tr>`;

const BOOKING_RESPONSE = { d: JSON.stringify({ code: 0, msg: '', html: INNER_HTML, coshtml: '' }) };

afterEach(() => vi.restoreAllMocks());

function mockFetch(scraper: PurunsolScraper, cap: { urls: string[]; bodies: string[] }) {
  return vi.spyOn(
    scraper as unknown as { fetch: typeof globalThis.fetch },
    'fetch',
  ).mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    cap.urls.push(u);
    if (init?.body) cap.bodies.push(String(init.body));
    if (u.includes('GetGolfTimeList')) {
      return new Response(JSON.stringify(BOOKING_RESPONSE), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    // calendar page (session seed) / anything else
    return new Response('<html></html>', { status: 200 });
  });
}

describe('PurunsolScraper', () => {
  it('posts the GetGolfTimeList params the server actually expects (p_golfgbn/p_date dashed)', async () => {
    const cap = { urls: [] as string[], bodies: [] as string[] };
    const scraper = new PurunsolScraper('20260605', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    await scraper.scrape();

    const listBody = cap.bodies.find((b) => b.includes('p_date') || b.includes('p_golfgbn')) ?? '';
    const parsed = JSON.parse(listBody);
    expect(parsed.p_golfgbn).toBe('160');
    expect(parsed.p_date).toBe('2026-06-05'); // dashed, not 20260605
    expect(parsed.p_rmode).toBe('h');
    // old wrong params must be gone
    expect(listBody).not.toContain('reservationDate');
  });

  it('parses the bare <tr> fragment (wrapped in <table>) into rows', async () => {
    const cap = { urls: [] as string[], bodies: [] as string[] };
    const scraper = new PurunsolScraper('20260605', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    const rows = await scraper.scrape();

    expect(rows.length).toBe(2);
    const r0 = rows[0];
    expect(r0.teeoff).toBe('06:07');
    expect(r0.course).toBe('밸 리'); // collapsed whitespace, comment stripped
    expect(r0.cc_name).toBe('푸른솔GC 포천');
    expect(r0.date).toBe('2026-06-05');
    expect(String(r0.price)).toBe('170000'); // 원/comma stripped
    expect(rows[1].teeoff).toBe('12:03');
    expect(String(rows[1].price)).toBe('220000');
  });
});
