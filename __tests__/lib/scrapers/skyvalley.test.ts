import { describe, it, expect, vi, afterEach } from 'vitest';
import SkyValleyScraper from '@/lib/scrapers/skyvalley';
import type { LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'skyid', id2: 'test2', email: 'test@test.com',
  pw: 'SKY_PW', pw1: 'pw1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5', pw6: 'pw6',
  name: 'Test', mobile: '01012345678',
};

// Live golfTimeList HTML (trimmed): 8 cols
// [번호, 코스, 구분, 시간, 홀, 정상가, 인터넷회원, 신청]
const TEETIME_HTML = `
<div class="tbl-group"><table><tbody>
  <tr><td>1</td><td>마운틴</td><td>대중제</td><td>08:50</td><td>18홀</td><td>210,000</td><td>170,000</td><td>신청</td></tr>
  <tr><td>2</td><td>밸리</td><td>대중제</td><td>09:30</td><td>18홀</td><td>220,000</td><td>180,000</td><td>신청</td></tr>
</tbody></table></div>`;

afterEach(() => vi.restoreAllMocks());

function mockFetch(scraper: SkyValleyScraper, cap: { urls: string[] }) {
  return vi.spyOn(
    scraper as unknown as { fetch: typeof globalThis.fetch },
    'fetch',
  ).mockImplementation(async (url: RequestInfo | URL) => {
    const u = String(url);
    cap.urls.push(u);
    if (u.includes('golfTimeList')) {
      return new Response(TEETIME_HTML, { status: 200, headers: { 'content-type': 'text/html' } });
    }
    return new Response(JSON.stringify({ returnMsg: '환영합니다.', success: 'S' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  });
}

describe('SkyValleyScraper', () => {
  it('logs in at the skyvalley path (not the dead hilldeloci path that returns empty)', async () => {
    const cap = { urls: [] as string[] };
    const scraper = new SkyValleyScraper('20260602', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    await scraper.scrape();

    expect(cap.urls.some((u) => u.includes('/skyvalley/member/loginChk'))).toBe(true);
    // wrong-context login was the silent-zero cause: J35 login succeeds but session
    // is not bound to skyvalley reservation context → "Tee-off 타임이 없습니다"
    expect(cap.urls.some((u) => u.includes('/hilldeloci/member/loginChk'))).toBe(false);
  });

  it('parses rows and stores 인터넷회원가 (discount, td[6]) not 정상가 (td[5])', async () => {
    const cap = { urls: [] as string[] };
    const scraper = new SkyValleyScraper('20260602', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    const rows = await scraper.scrape();

    expect(rows.length).toBe(2);
    const r0 = rows[0];
    expect(r0.teeoff).toBe('08:50');
    expect(r0.course).toBe('마운틴');
    expect(r0.cc_name).toBe('스카이밸리CC');
    expect(r0.date).toBe('2026-06-02');
    expect(String(r0.price)).toBe('170000'); // 인터넷회원, not 210000

    expect(String(rows[1].price)).toBe('180000');
  });
});
