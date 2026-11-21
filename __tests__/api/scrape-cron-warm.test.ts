/**
 * The hourly cron also warms the CDN copy of /api/tee-times for the dates the
 * app opens on (KST today..D+7), so the first visitor after a quiet hour gets a
 * cached answer instead of a ~4s cold function call.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/scrape/cron/route';

const APP = 'https://golf.example';

function cronRequest() {
  return new NextRequest(`${APP}/api/scrape/cron`, {
    headers: { authorization: 'Bearer test-cron' },
  });
}

describe('GET /api/scrape/cron — tee-times warm-up', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'test-cron');
    vi.stubEnv('APP_URL', APP);
    vi.stubGlobal('fetch', fetchMock);
    // 2026-11-21 23:30 KST = 14:30 UTC — the KST date is still the 21st.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-21T14:30:00Z'));
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes('/api/scrape')
        ? new Response(JSON.stringify({ ok: true }), { status: 200 })
        : new Response('[]', { status: 200 }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('requests tee-times for KST today through D+7 on the public URL', async () => {
    const res = await GET(cronRequest());
    expect(res.status).toBe(200);

    const warmed = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((u) => u.includes('/api/tee-times'));
    expect(warmed).toEqual([
      '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24',
      '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28',
    ].map((d) => `${APP}/api/tee-times?date=${d}`));
  });

  it('still reports the scrape when a warm-up request fails', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/api/tee-times')) throw new Error('network down');
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const res = await GET(cronRequest());
    expect(res.status).toBe(200);
    expect((await res.json()).triggered).toBe(true);
  });
});
