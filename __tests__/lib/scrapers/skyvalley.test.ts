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
<div class="tbl-group"><table>
<thead><tr><th scope="col">번호</th><th scope="col">코스</th><th scope="col">구분</th><th scope="col">시간</th><th scope="col">홀</th><th scope="col">정상가</th><th scope="col">인터넷회원</th><th scope="col">신청</th></tr></thead>
<tbody>
  <tr><td>1</td><td>마운틴</td><td>대중제</td><td>08:50</td><td>18홀</td><td>210,000</td><td>170,000</td><td>신청</td></tr>
  <tr><td>2</td><td>밸리</td><td>대중제</td><td>09:30</td><td>18홀</td><td>220,000</td><td>180,000</td><td>신청</td></tr>
</tbody></table></div>`;

// Live golfTimeList HTML 2026-11 (trimmed): 캐디 column inserted after 번호 → 9 cols
// [번호, 캐디, 코스, 구분, 시간, 홀, 정상가, 인터넷회원, 예약]
const TEETIME_HTML_2026_11 = `
<table><thead><tr>
  <th scope="col">번호</th><th scope="col">캐디</th><th scope="col">코스</th><th scope="col">구분</th>
  <th scope="col">시간</th><th scope="col">홀</th><th scope="col">정상가</th>
  <th scope="col">인터넷회원</th><th scope="col">예약</th>
</tr></thead><tbody>
  <tr><td>1</td><td></td><td>밸리</td><td>회원제</td><td>07:04</td><td>18홀</td><td>270,000</td><td class="emp01">230,000</td>
    <!-- >td><button onclick="golfConfirm('J35','20261122','0704')"--><td><button type="button"><span>신청</span></button></td></tr>
  <tr><td>2</td><td></td><td>마운틴</td><td>대중제</td><td>07:04</td><td>18홀</td><td>270,000</td><td class="emp01">220,000</td>
    <td><button type="button"><span>신청</span></button></td></tr>
</tbody></table>`;

afterEach(() => vi.restoreAllMocks());

function mockFetch(scraper: SkyValleyScraper, cap: { urls: string[] }, html = TEETIME_HTML) {
  return vi.spyOn(
    scraper as unknown as { fetch: typeof globalThis.fetch },
    'fetch',
  ).mockImplementation(async (url: RequestInfo | URL) => {
    const u = String(url);
    cap.urls.push(u);
    if (u.includes('golfTimeList')) {
      return new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
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

  it('maps columns by header when 캐디 column is inserted (2026-11 layout)', async () => {
    const cap = { urls: [] as string[] };
    const scraper = new SkyValleyScraper('20261122', MOCK_CREDENTIALS);
    mockFetch(scraper, cap, TEETIME_HTML_2026_11);

    const rows = await scraper.scrape();

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ teeoff: '07:04', course: '밸리', price: '230000' });
    expect(rows[1]).toMatchObject({ teeoff: '07:04', course: '마운틴', price: '220000' });
  });

  it('throws when rows exist but no 시간 header is found (layout change must fail loudly)', async () => {
    const cap = { urls: [] as string[] };
    const scraper = new SkyValleyScraper('20261122', MOCK_CREDENTIALS);
    mockFetch(scraper, cap, '<table><tbody><tr><td>1</td><td>밸리</td><td>회원제</td></tr></tbody></table>');

    await expect(scraper.scrape()).rejects.toThrow(/skyvalley/);
  });

  it('returns [] for the no-tee-time message (closed / not open yet)', async () => {
    const cap = { urls: [] as string[] };
    const scraper = new SkyValleyScraper('20261125', MOCK_CREDENTIALS);
    mockFetch(scraper, cap, '<table><tbody><tr><td colspan="9">Tee-off 타임이 없습니다.</td></tr></tbody></table>');

    await expect(scraper.scrape()).resolves.toEqual([]);
  });

  it('throws when loginChk keeps returning success:"E" (no silent empty success)', async () => {
    const scraper = new SkyValleyScraper('20261122', MOCK_CREDENTIALS);
    const sleep = vi.spyOn(scraper as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep')
      .mockResolvedValue(undefined);
    let listCalls = 0;
    vi.spyOn(scraper as unknown as { fetch: typeof globalThis.fetch }, 'fetch')
      .mockImplementation(async (url: RequestInfo | URL) => {
        if (String(url).includes('golfTimeList')) { listCalls++; return new Response(TEETIME_HTML_2026_11); }
        return new Response(JSON.stringify({ returnMsg: '로그인 처리중 오류가 발생하였습니다.', success: 'E' }));
      });

    await expect(scraper.scrape()).rejects.toThrow(/skyvalley: login failed/);
    expect(sleep).toHaveBeenCalledTimes(2); // 3 attempts
    expect(listCalls).toBe(0);
  });

  it('retries login after success:"E" and scrapes once it succeeds', async () => {
    const scraper = new SkyValleyScraper('20261122', MOCK_CREDENTIALS);
    vi.spyOn(scraper as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep')
      .mockResolvedValue(undefined);
    let logins = 0;
    vi.spyOn(scraper as unknown as { fetch: typeof globalThis.fetch }, 'fetch')
      .mockImplementation(async (url: RequestInfo | URL) => {
        if (String(url).includes('golfTimeList')) return new Response(TEETIME_HTML_2026_11);
        logins++;
        const ok = logins >= 2;
        return new Response(JSON.stringify(ok
          ? { returnMsg: '환영합니다.', success: 'S' }
          : { returnMsg: '로그인 처리중 오류가 발생하였습니다.', success: 'E' }));
      });

    const rows = await scraper.scrape();
    expect(logins).toBe(2);
    expect(rows).toHaveLength(2);
  });
});
