import { describe, it, expect, vi, afterEach } from 'vitest';
import HilldelociScraper from '@/lib/scrapers/hilldeloci';
import type { LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'hdid', id2: 'test2', email: 'test@test.com',
  pw: 'PW', pw1: 'pw1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5', pw6: 'pw6',
  name: 'Test', mobile: '01012345678',
};

// Live api.hilldeloci.co.kr shape (trimmed): data.calenders[].resveTimes[]
// resveCourse 1=Birch, 2=Pine. timeStatus EMPTY=open. price tier = promtnPrice (할인가).
const CALENDER_JSON = {
  status: 'OK',
  data: {
    calenders: [
      // wrong date — must be filtered out by bsnDate
      { bsnDate: '2026-06-01', availableStatusByDate: 'END', reservationAvailableTimeCount: 0 },
      {
        bsnDate: '2026-06-02',
        availableStatusByDate: 'ING',
        reservationAvailableTimeCount: 3,
        resveTimes: [
          { timeId: 233205, timeStatus: 'EMPTY', resveDate: '2026-06-02', resveCourse: '1', resveTime: '06:45', promtnPrice: 140000, promtnPriceNor: 160000, price: 210000 },
          { timeId: 233234, timeStatus: 'EMPTY', resveDate: '2026-06-02', resveCourse: '2', resveTime: '08:00', promtnPrice: 160000, promtnPriceNor: 180000, price: 210000 },
          // not open — must be filtered out by timeStatus
          { timeId: 233215, timeStatus: 'BOOKING', resveDate: '2026-06-02', resveCourse: '1', resveTime: '08:00', promtnPrice: 160000, promtnPriceNor: 180000, price: 210000 },
        ],
      },
    ],
  },
};

afterEach(() => vi.restoreAllMocks());

function mockFetch(scraper: HilldelociScraper, cap: { urls: string[] }) {
  return vi.spyOn(
    scraper as unknown as { fetch: typeof globalThis.fetch },
    'fetch',
  ).mockImplementation(async (url: RequestInfo | URL) => {
    cap.urls.push(String(url));
    return new Response(JSON.stringify(CALENDER_JSON), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
}

describe('HilldelociScraper', () => {
  it('hits the public api.hilldeloci.co.kr JSON calendar (no login to dead skyvalley host)', async () => {
    const cap = { urls: [] as string[] };
    const scraper = new HilldelociScraper('20260602', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    await scraper.scrape();

    expect(cap.urls.some((u) => u.includes('api.hilldeloci.co.kr/v1/reservation-calender'))).toBe(true);
    expect(cap.urls.some((u) => u.includes('date=2026-06-02'))).toBe(true);
    // dead host must be gone — was the silent-zero cause
    expect(cap.urls.some((u) => u.includes('skyvalley.co.kr'))).toBe(false);
  });

  it('parses only EMPTY slots for the target date, maps course + promtnPrice', async () => {
    const cap = { urls: [] as string[] };
    const scraper = new HilldelociScraper('20260602', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    const rows = await scraper.scrape();

    // 2 EMPTY on 06-02; the 06-01 calender and the BOOKING slot are excluded
    expect(rows.length).toBe(2);

    const birch = rows.find((r) => r.teeoff === '06:45');
    expect(birch).toBeDefined();
    expect(birch!.course).toBe('Birch');
    expect(birch!.cc_name).toBe('힐드로사이CC');
    expect(birch!.date).toBe('2026-06-02');
    expect(String(birch!.price)).toBe('140000'); // promtnPrice, not promtnPriceNor(160000) / price(210000)

    const pine = rows.find((r) => r.teeoff === '08:00');
    expect(pine!.course).toBe('Pine');
    expect(String(pine!.price)).toBe('160000');

    // no leak of the BOOKING 08:00 Birch slot
    expect(rows.filter((r) => r.course === 'Birch' && r.teeoff === '08:00')).toHaveLength(0);
  });
});
