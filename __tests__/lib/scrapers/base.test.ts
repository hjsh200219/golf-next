import { describe, it, expect } from 'vitest';
import { BaseScraper, type TeeTimeRow, type LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'test', id2: 'test2', email: 'test@test.com',
  pw: 'pw', pw1: 'pw1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5', pw6: 'pw6',
  name: 'Test', mobile: '01012345678',
};

class TestScraper extends BaseScraper {
  get clubId() { return 'test'; }
  async scrape(): Promise<TeeTimeRow[]> {
    return [
      { date: '20260327', cc_name: 'TestCC', teeoff: '09:30', course: 'A', price: '150,000', event: '' },
    ];
  }
}

describe('BaseScraper', () => {
  it('initializes date fields correctly', () => {
    const s = new TestScraper('20260327', MOCK_CREDENTIALS);
    expect(s['date']).toBe('20260327');
    expect(s['dateDash']).toBe('2026-03-27');
    expect(s['year']).toBe(2026);
    expect(s['month']).toBe(3);
    expect(s['day']).toBe(27);
  });

  it('accepts dash-formatted date', () => {
    const s = new TestScraper('2026-03-27', MOCK_CREDENTIALS);
    expect(s['date']).toBe('20260327');
    expect(s['dateDash']).toBe('2026-03-27');
  });

  it('run() returns ScraperResult on success', async () => {
    const s = new TestScraper('20260327', MOCK_CREDENTIALS);
    const result = await s.run();
    expect(result.success).toBe(true);
    expect(result.clubId).toBe('test');
    expect(result.teeTimes).toHaveLength(1);
    expect(result.teeTimes[0].price).toBe(150000);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('run() returns error on failure', async () => {
    class FailScraper extends BaseScraper {
      get clubId() { return 'fail'; }
      async scrape(): Promise<TeeTimeRow[]> { throw new Error('Network error'); }
    }
    const s = new FailScraper('20260327', MOCK_CREDENTIALS);
    const result = await s.run();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
    expect(result.teeTimes).toEqual([]);
  });

  it('parsePrice handles various formats', () => {
    const s = new TestScraper('20260327', MOCK_CREDENTIALS);
    expect(s['parsePrice']('150,000')).toBe(150000);
    expect(s['parsePrice']('150,000원')).toBe(150000);
    expect(s['parsePrice']('정상가 200,000원')).toBe(200000);
    expect(s['parsePrice']('')).toBeNull();
    expect(s['parsePrice']('2인플레이가능.150000')).toBe(150000);
  });

  it('processPrice cleans price and event strings', () => {
    const s = new TestScraper('20260327', MOCK_CREDENTIALS);
    const { price, event } = s['processPrice']('150,000원', '2인플레이가능');
    expect(price).toBe('150000');
    expect(event).toBe('');
  });

  it('formatTime converts various formats', () => {
    const s = new TestScraper('20260327', MOCK_CREDENTIALS);
    expect(s['formatTime']('0930')).toBe('09:30');
    expect(s['formatTime']('09:30')).toBe('09:30');
    expect(s['formatTime']('09:30:00')).toBe('09:30');
    expect(s['formatTime'](' 0930 ')).toBe('09:30');
  });

  it('commonHeaders includes required browser headers', () => {
    const s = new TestScraper('20260327', MOCK_CREDENTIALS);
    const h = s['commonHeaders']('https://example.com', 'https://example.com/page');
    expect(h.Origin).toBe('https://example.com');
    expect(h.Referer).toBe('https://example.com/page');
    expect(h['User-Agent']).toContain('Chrome');
  });
});

describe('SCRAPER_MAP', () => {
  it('contains all 33 active scrapers', async () => {
    const { SCRAPER_MAP } = await import('@/lib/scrapers/index');
    expect(Object.keys(SCRAPER_MAP)).toHaveLength(33);
  });

  it('all scrapers can be instantiated', async () => {
    const { SCRAPER_MAP } = await import('@/lib/scrapers/index');
    for (const [id, Ctor] of Object.entries(SCRAPER_MAP)) {
      const scraper = new Ctor('20260327', MOCK_CREDENTIALS);
      expect(scraper.clubId).toBe(id);
    }
  });
});
