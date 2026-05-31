import { describe, it, expect, vi, afterEach } from 'vitest';
import TpcGolfScraper from '@/lib/scrapers/tpcgolf';
import type { LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'test', id2: 'test2', email: 'test@test.com',
  pw: 'pw', pw1: 'pw1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5', pw6: 'pw6',
  name: 'Test', mobile: '01012345678',
};

afterEach(() => vi.restoreAllMocks());

describe('TpcGolfScraper', () => {
  it('uses HTTPS origin for login and list requests', async () => {
    const urls: string[] = [];
    const scraper = new TpcGolfScraper('20260607', MOCK_CREDENTIALS);
    vi.spyOn(
      scraper as unknown as { fetch: typeof globalThis.fetch },
      'fetch',
    ).mockImplementation(async (url: RequestInfo | URL) => {
      urls.push(String(url));
      return new Response('<table></table>', { status: 200 });
    });

    await scraper.scrape();

    expect(urls.every((u) => u.startsWith('https://'))).toBe(true);
    expect(urls.some((u) => u.startsWith('http://'))).toBe(false);
  });

  it('parses tee-time rows from euc-kr table (course/time/price)', async () => {
    // Live layout: header rows then data rows; td[0]=course td[1]=time ... td[4]=price
    const listHtml = `<table>
      <tr><th>h1</th></tr>
      <tr><th>h2</th></tr>
      <tr><td>STELLA</td><td>06:10</td><td>x</td><td>y</td><td>220,000</td></tr>
      <tr><td>SOLAR</td><td>07:27</td><td>x</td><td>y</td><td>230,000</td></tr>
    </table>`;
    const scraper = new TpcGolfScraper('20260607', MOCK_CREDENTIALS);
    vi.spyOn(
      scraper as unknown as { fetch: typeof globalThis.fetch },
      'fetch',
    ).mockImplementation(async (url: RequestInfo | URL) => {
      const body = String(url).includes('TimeTable_Amt') ? listHtml : '<html></html>';
      return new Response(body, { status: 200 });
    });

    const rows = await scraper.scrape();
    const times = rows.map((r) => r.teeoff);
    expect(times).toContain('06:10');
    expect(times).toContain('07:27');
    expect(rows.every((r) => r.cc_name === '양평TPC')).toBe(true);
  });
});
