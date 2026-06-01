import { describe, it, expect, vi, afterEach } from 'vitest';
import TpcGolfScraper from '@/lib/scrapers/tpcgolf';
import type { LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'test', id2: 'test2', email: 'test@test.com',
  pw: 'pw', pw1: 'pw1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5', pw6: 'pw6',
  name: 'Test', mobile: '01012345678',
};

// Live layout: the endpoint returns 4 tabs (All / Lunar / Solar / Stellar).
// "All" is the union of the others, so every slot appears at least twice.
// Each data row has exactly 5 cells: [코스, 시간, 부/홀, 인원, 요금].
// One tab shows "예약 가능한 시간이 없습니다." (no 5-cell rows) and must be ignored.
const LIST_HTML = `
<table><tr><th>코스</th><th>시간</th><th>부/홀</th><th>인원</th><th>요금</th></tr></table>
<table><!-- All Course --><tbody>
  <tr><td>SOLAR</td><td>13:32</td><td>2부/18홀</td><td>4</td><td>170,000</td></tr>
  <tr><td>SOLAR</td><td>13:46</td><td>2부/18홀</td><td>4</td><td>170,000</td></tr>
  <tr><td>STELLA</td><td>13:46</td><td>2부/18홀</td><td>4</td><td>170,000</td></tr>
</tbody></table>
<table><!-- Lunar (empty) --><tbody>
  <tr><td colspan="5">예약 가능한 시간이 없습니다.</td></tr>
</tbody></table>
<table><!-- Solar --><tbody>
  <tr><td>SOLAR</td><td>13:32</td><td>2부/18홀</td><td>4</td><td>170,000</td></tr>
  <tr><td>SOLAR</td><td>13:46</td><td>2부/18홀</td><td>4</td><td>170,000</td></tr>
</tbody></table>
<table><!-- Stellar --><tbody>
  <tr><td>STELLA</td><td>13:46</td><td>2부/18홀</td><td>4</td><td>170,000</td></tr>
</tbody></table>`;

afterEach(() => vi.restoreAllMocks());

function mockFetch(scraper: TpcGolfScraper, cap: { urls: string[]; bodies: string[] }) {
  return vi.spyOn(
    scraper as unknown as { fetch: typeof globalThis.fetch },
    'fetch',
  ).mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    cap.urls.push(u);
    if (init?.body) cap.bodies.push(String(init.body));
    if (u.includes('Time_Remaining_TimeTable_amt')) {
      // euc-kr decode path: respond with a buffer
      return new Response(new TextEncoder().encode(LIST_HTML), { status: 200 });
    }
    return new Response('<html></html>', { status: 200 });
  });
}

describe('TpcGolfScraper', () => {
  it('uses the new Time_Remaining endpoint with a dashed date (old TimeTable_Amt is 500)', async () => {
    const cap = { urls: [] as string[], bodies: [] as string[] };
    const scraper = new TpcGolfScraper('20260609', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    await scraper.scrape();

    expect(cap.urls.some((u) => u.includes('/Inc/Time_Remaining_TimeTable_amt.asp'))).toBe(true);
    expect(cap.urls.some((u) => u.includes('/Reservation/Inc/TimeTable_Amt.asp'))).toBe(false);
    // server expects YYYY-MM-DD
    expect(cap.bodies.some((b) => b.includes('str_date=2026-06-09'))).toBe(true);
  });

  it('parses 5-cell rows, dedupes the All-tab union, ignores the empty tab', async () => {
    const cap = { urls: [] as string[], bodies: [] as string[] };
    const scraper = new TpcGolfScraper('20260609', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    const rows = await scraper.scrape();

    // 3 unique slots: SOLAR 13:32, SOLAR 13:46, STELLA 13:46 (each duped across tabs)
    expect(rows.length).toBe(3);
    const key = (r: { course: string; teeoff: string }) => `${r.course}@${r.teeoff}`;
    expect(new Set(rows.map(key)).size).toBe(3);
    expect(rows.map(key).sort()).toEqual(['SOLAR@13:32', 'SOLAR@13:46', 'STELLA@13:46']);
    expect(rows.every((r) => r.cc_name === '양평TPC')).toBe(true);
    expect(String(rows[0].price)).toBe('170,000');
  });
});
