import { describe, it, expect, vi, afterEach } from 'vitest';
import GolfzonCountyScraper from '@/lib/scrapers/golfzoncounty';
import type { LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'gzid', id2: 'test2', email: 'test@test.com',
  pw: 'BASE_PW', pw1: 'GZ_PW1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5', pw6: 'pw6',
  name: 'Test', mobile: '01012345678',
};

afterEach(() => vi.restoreAllMocks());

describe('GolfzonCountyScraper login', () => {
  it('logs in with id + pw1 (not base pw)', async () => {
    const bodies: string[] = [];
    const scraper = new GolfzonCountyScraper('20260607', MOCK_CREDENTIALS);
    vi.spyOn(
      scraper as unknown as { fetch: typeof globalThis.fetch },
      'fetch',
    ).mockImplementation(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.body) bodies.push(String(init.body));
      return new Response('<html></html>', { status: 200 });
    });

    await scraper.scrape();

    const loginBody = JSON.parse(bodies[0]);
    expect(loginBody.usrId).toBe('gzid');
    expect(loginBody.usrPwd).toBe('GZ_PW1');
    expect(loginBody.usrPwd).not.toBe('BASE_PW');
  });
});
