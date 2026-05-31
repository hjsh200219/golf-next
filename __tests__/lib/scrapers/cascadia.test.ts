import { describe, it, expect, vi, afterEach } from 'vitest';
import CascadiaScraper from '@/lib/scrapers/cascadia';
import type { LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'test', id2: 'test2', email: 'test@test.com',
  pw: 'pw', pw1: 'pw1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5', pw6: 'pw6',
  name: 'Test', mobile: '01012345678',
};

afterEach(() => vi.restoreAllMocks());

// Live cascadia table layout (site added a 부 column):
// [0]번호 [1]코스 [2]구분(주중/주말) [3]부 [4]시간 [5]홀 [6]예약
const liveHtml = `<table><tbody>
  <tr><td>1</td><td>STONE</td><td>주중</td><td>1부</td><td>06:30</td><td>18홀</td><td>예약</td></tr>
  <tr><td>2</td><td>TREE</td><td>주중</td><td>1부</td><td>07:14</td><td>18홀</td><td>예약</td></tr>
</tbody></table>`;

describe('CascadiaScraper parsing', () => {
  it('reads teeoff from the time column (tds[4]), not the 주중/주말 column', async () => {
    const scraper = new CascadiaScraper('20260607', MOCK_CREDENTIALS);
    vi.spyOn(
      scraper as unknown as { fetch: typeof globalThis.fetch },
      'fetch',
    ).mockImplementation(async (url: RequestInfo | URL) => {
      const body = String(url).includes('golfTimeList') ? liveHtml : '<html></html>';
      return new Response(body, { status: 200 });
    });

    const rows = await scraper.scrape();
    const times = rows.map((r) => r.teeoff);
    expect(times).toContain('06:30');
    expect(times).toContain('07:14');
    expect(rows.map((r) => r.course)).toEqual(['STONE', 'TREE']);
  });

  it('never emits a non-time teeoff (filters 주중/주말 garbage)', async () => {
    const scraper = new CascadiaScraper('20260607', MOCK_CREDENTIALS);
    vi.spyOn(
      scraper as unknown as { fetch: typeof globalThis.fetch },
      'fetch',
    ).mockImplementation(async (url: RequestInfo | URL) => {
      const body = String(url).includes('golfTimeList') ? liveHtml : '<html></html>';
      return new Response(body, { status: 200 });
    });

    const rows = await scraper.scrape();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => /^\d{1,2}:\d{2}$/.test(r.teeoff))).toBe(true);
  });

  it('drops a row whose time column holds non-time text (guard reject path)', async () => {
    // Malformed row: tds[4] = "주말" instead of a time → must be filtered out.
    const badHtml = `<table><tbody>
      <tr><td>1</td><td>STONE</td><td>주중</td><td>1부</td><td>주말</td><td>18홀</td><td>예약</td></tr>
      <tr><td>2</td><td>TREE</td><td>주중</td><td>1부</td><td>08:00</td><td>18홀</td><td>예약</td></tr>
    </tbody></table>`;
    const scraper = new CascadiaScraper('20260607', MOCK_CREDENTIALS);
    vi.spyOn(
      scraper as unknown as { fetch: typeof globalThis.fetch },
      'fetch',
    ).mockImplementation(async (url: RequestInfo | URL) => {
      const body = String(url).includes('golfTimeList') ? badHtml : '<html></html>';
      return new Response(body, { status: 200 });
    });

    const rows = await scraper.scrape();
    expect(rows.map((r) => r.teeoff)).toEqual(['08:00']);
  });
});
