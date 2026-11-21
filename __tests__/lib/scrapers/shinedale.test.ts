import { describe, it, expect, vi, afterEach } from 'vitest';
import ShineDaleScraper from '@/lib/scrapers/shinedale';
import type { LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'shineid', id2: 'test2', email: 'test@test.com',
  pw: 'SHINE_PW', pw1: 'pw1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5', pw6: 'pw6',
  name: 'Test', mobile: '01012345678',
};

const PAGE_HTML = `<form>
<input id="__VIEWSTATE" value="VS"/><input id="__VIEWSTATEGENERATOR" value="VG"/><input id="__EVENTVALIDATION" value="EV"/>
</form>`;

// Live UpdatePanel response (2026-11, trimmed): header row is th, no caption.
// [부, 코스, 시간, 정상가요금, 할인가요금, 예약, 프로모션]
const LIST_HTML_2026_11 = `
<table class="timeTbl timeTblTab">
  <tr><th>부</th><th>코스</th><th>시간</th><th>정상가요금</th><th>할인가요금</th><th>예약</th><th>프로모션</th></tr>
  <tr>
    <td><p class='bu'>1부</p></td><td><p class='course'>레이크</p></td><td><p class='time'>06:15</p></td>
    <td style='text-decoration:line-through'><p class='fee'>200,000원</p></td>
    <td><p class='fee year-mem-color'>130,000원</p></td>
    <td><a class="reservBtn">예약</a></td>
    <td><p class='promo'>라전 해장국제공<br>(4인필수)</p></td>
  </tr>
  <tr>
    <td><p class='bu'>2부</p></td><td><p class='course'>샤인</p></td><td><p class='time'>12:07</p></td>
    <td style='text-decoration:line-through'><p class='fee'>210,000원</p></td>
    <td><p class='fee year-mem-color'>150,000원</p></td>
    <td><a class="reservBtn">예약</a></td>
    <td><p class='promo'></p></td>
  </tr>
</table>`;

afterEach(() => vi.restoreAllMocks());

function mockFetch(scraper: ShineDaleScraper, listHtml: string) {
  return vi.spyOn(
    scraper as unknown as { fetch: typeof globalThis.fetch },
    'fetch',
  ).mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    const body = String(init?.body ?? '');
    if (u.includes('Reservation.aspx') && body.includes('btnUpdate')) {
      return new Response(listHtml, { status: 200, headers: { 'content-type': 'text/html' } });
    }
    return new Response(PAGE_HTML, { status: 200, headers: { 'content-type': 'text/html' } });
  });
}

describe('ShineDaleScraper', () => {
  it('maps columns by header (부 column first) — teeoff is the 시간 cell, not "1부"', async () => {
    const scraper = new ShineDaleScraper('20261122', MOCK_CREDENTIALS);
    mockFetch(scraper, LIST_HTML_2026_11);

    const rows = await scraper.scrape();

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      date: '2026-11-22',
      cc_name: '샤인데일',
      teeoff: '06:15',
      course: '레이크',
      price: '130000', // 할인가요금, not 정상가요금
    });
    expect(rows[0].event).toContain('라전 해장국제공');
    expect(rows[1]).toMatchObject({ teeoff: '12:07', course: '샤인', price: '150000', event: '' });
  });

  it('falls back to 정상가요금 when 할인가요금 is "-" (no discount that day)', async () => {
    const scraper = new ShineDaleScraper('20261129', MOCK_CREDENTIALS);
    mockFetch(scraper, `<table class="timeTbl timeTblTab">
      <tr><th>부</th><th>코스</th><th>시간</th><th>정상가요금</th><th>할인가요금</th><th>예약</th><th>프로모션</th></tr>
      <tr><td><p class='bu'>1부</p></td><td><p class='course'>레이크</p></td><td><p class='time'>06:15</p></td>
        <td><p class='fee'>240,000원</p></td><td><p class='fee year-mem-color'>-</p></td>
        <td><a class="reservBtn">예약</a></td><td><p class='promo'></p></td></tr>
    </table>`);
    const rows = await scraper.scrape();
    expect(rows[0]).toMatchObject({ teeoff: '06:15', price: '240000' });
  });

  it('every teeoff is HH:MM', async () => {
    const scraper = new ShineDaleScraper('20261122', MOCK_CREDENTIALS);
    mockFetch(scraper, LIST_HTML_2026_11);
    const rows = await scraper.scrape();
    for (const r of rows) expect(r.teeoff).toMatch(/^\d{2}:\d{2}$/);
  });

  it('throws when the tee table has no 시간 header (layout change must fail, not report empty success)', async () => {
    const scraper = new ShineDaleScraper('20261122', MOCK_CREDENTIALS);
    mockFetch(scraper, `<table class="timeTbl"><tr><th>부</th><th>코스</th></tr>
      <tr><td>1부</td><td>레이크</td></tr></table>`);
    await expect(scraper.scrape()).rejects.toThrow(/shinedale/);
  });

  it('returns [] when the day has no tee table at all (closed / not open yet)', async () => {
    const scraper = new ShineDaleScraper('20261122', MOCK_CREDENTIALS);
    mockFetch(scraper, '<div class="timeCnt"><p>예약 가능한 시간이 없습니다.</p></div>');
    await expect(scraper.scrape()).resolves.toEqual([]);
  });
});
