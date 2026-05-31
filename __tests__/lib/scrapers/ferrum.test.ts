import { describe, it, expect, vi, afterEach } from 'vitest';
import FerrumScraper from '@/lib/scrapers/ferrum';
import type { LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'ferrumid', id2: 'test2', email: 'test@test.com',
  pw: 'BASE_PW', pw1: 'pw1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5', pw6: 'FERRUM_PW6',
  name: 'Test', mobile: '01012345678',
};

afterEach(() => vi.restoreAllMocks());

describe('FerrumScraper login', () => {
  it('logs in with id + pw6 (not base pw)', async () => {
    const bodies: string[] = [];
    const scraper = new FerrumScraper('20260607', MOCK_CREDENTIALS);
    vi.spyOn(
      scraper as unknown as { fetch: typeof globalThis.fetch },
      'fetch',
    ).mockImplementation(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.body) bodies.push(String(init.body));
      return new Response('<table class="default3"></table>', { status: 200 });
    });

    await scraper.scrape();

    const loginBody = new URLSearchParams(bodies[0]);
    expect(loginBody.get('mem_id')).toBe('ferrumid');
    expect(loginBody.get('usr_pwd')).toBe('FERRUM_PW6');
    expect(loginBody.get('usr_pwd')).not.toBe('BASE_PW');
  });

  it('decodes euc-kr Korean course names correctly (not mojibake)', async () => {
    // Build an euc-kr-encoded list response containing "동코스".
    // "동코스" in EUC-KR = bytes B5BF C4DA BDBA.
    const head = '<table class="default3"><tr><td>1</td>';
    const tail = '</td><td>06:36</td><td>150,000</td></tr></table>';
    const headBytes = Buffer.from(head, 'latin1');
    const course = Buffer.from([0xb5, 0xbf, 0xc4, 0xda, 0xbd, 0xba]); // 동코스 in euc-kr
    const tdOpen = Buffer.from('<td>', 'latin1');
    const tailBytes = Buffer.from(tail, 'latin1');
    const body = Buffer.concat([headBytes, tdOpen, course, tailBytes]);

    const scraper = new FerrumScraper('20260607', MOCK_CREDENTIALS);
    vi.spyOn(
      scraper as unknown as { fetch: typeof globalThis.fetch },
      'fetch',
    ).mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).includes('real_timelist_ajax_list')) {
        return new Response(body, { status: 200 });
      }
      return new Response('', { status: 200 });
    });

    const rows = await scraper.scrape();
    expect(rows.length).toBe(1);
    expect(rows[0].course).toBe('동코스');
    expect(rows[0].teeoff).toBe('06:36');
  });
});
