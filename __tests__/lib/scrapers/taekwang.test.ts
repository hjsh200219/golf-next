import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import TaekwangScraper from '@/lib/scrapers/taekwang';
import type { LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'tkid', id2: 'test2', email: 'test@test.com',
  pw: 'pw', pw1: 'pw1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5', pw6: 'pw6',
  name: 'Test', mobile: '01012345678',
};

// Next.js Server Action RSC response. Real data lives on the `1:` line as
// availableTimes[]. courseCode 11/22/33 = 회원제(M), 44 = 대중제(P).
// discountPrice = 할인가; isLock:false = open.
function rsc(times: object[]): string {
  return `0:{"a":"$@1","f":"","b":"abc","q":"","i":false}\n` +
    `1:${JSON.stringify({ availableTimes: times, apiResult: 0, apiMessage: '성공' })}\n`;
}
const M_TIMES = [
  { date: '20260604', courseCode: '11', hourDisplay: '06:07', discountPrice: 230000, normalPrice: 260000, isLock: false },
  { date: '20260604', courseCode: '22', hourDisplay: '06:00', discountPrice: 230000, normalPrice: 260000, isLock: false },
  // booked — filtered by isLock
  { date: '20260604', courseCode: '33', hourDisplay: '07:00', discountPrice: 260000, normalPrice: 260000, isLock: true },
];
const P_TIMES = [
  { date: '20260604', courseCode: '44', hourDisplay: '06:00', discountPrice: 190000, normalPrice: 199000, isLock: false },
];
// Page fallback (no data) — what a stale next-action ID returns.
const PAGE_RSC = `2:"$Sreact.fragment"\n4:I[39756,["/_next/static/chunks/x.js"],""]\n`;

const ORIG_ENV = { ...process.env };
beforeEach(() => {
  process.env.TAEKWANG_ENC_ID = 'ENC_ID_BLOB';
  process.env.TAEKWANG_ENC_PW = 'ENC_PW_BLOB';
});
afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...ORIG_ENV };
});

function mockFetch(
  scraper: TaekwangScraper,
  cap: { urls: string[]; bodies: string[]; loginBody: string[] },
  opts: { stale?: boolean } = {},
) {
  return vi.spyOn(
    scraper as unknown as { fetch: typeof globalThis.fetch },
    'fetch',
  ).mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    cap.urls.push(u);
    const body = String(init?.body ?? '');
    if (u.includes('/api/auth/login')) {
      cap.loginBody.push(body);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'set-cookie': 'accessToken=jwt; Path=/' },
      });
    }
    // realtime server action
    cap.bodies.push(body);
    if (opts.stale) return new Response(new TextEncoder().encode(PAGE_RSC), { status: 200 });
    const times = body.includes('"coGubun":"P"') ? P_TIMES : M_TIMES;
    return new Response(new TextEncoder().encode(rsc(times)), { status: 200 });
  });
}

describe('TaekwangScraper', () => {
  it('logs in at the JSON auth API with the encrypted credential blobs (not the dead ASP.NET flow)', async () => {
    const cap = { urls: [] as string[], bodies: [] as string[], loginBody: [] as string[] };
    const scraper = new TaekwangScraper('20260604', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    await scraper.scrape();

    expect(cap.urls.some((u) => u.includes('/api/auth/login'))).toBe(true);
    expect(cap.urls.some((u) => u.includes('Login.aspx'))).toBe(false);
    const login = JSON.parse(cap.loginBody[0]);
    expect(login).toMatchObject({ encryptedId: 'ENC_ID_BLOB', encryptedPassword: 'ENC_PW_BLOB' });
  });

  it('fetches both 회원제(M) and 대중제(P), parses availableTimes, maps course, stores discountPrice', async () => {
    const cap = { urls: [] as string[], bodies: [] as string[], loginBody: [] as string[] };
    const scraper = new TaekwangScraper('20260604', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    const rows = await scraper.scrape();

    // 2 calls: coGubun M + P
    expect(cap.bodies.some((b) => b.includes('"coGubun":"M"'))).toBe(true);
    expect(cap.bodies.some((b) => b.includes('"coGubun":"P"'))).toBe(true);

    // 2 open M (the isLock:true is dropped) + 1 open P = 3
    expect(rows.length).toBe(3);
    const r0 = rows.find((r) => r.teeoff === '06:07');
    expect(r0).toMatchObject({ course: '북서', cc_name: '태광CC', date: '2026-06-04' });
    expect(String(r0!.price)).toBe('230000'); // discountPrice
    expect(rows.find((r) => r.course === '동')).toBeDefined(); // courseCode 44
    expect(rows.filter((r) => r.teeoff === '07:00')).toHaveLength(0); // isLock dropped
  });

  it('throws when the server action returns the page fallback (stale next-action ID)', async () => {
    // next-action is a build hash; if taekwang redeploys it stops resolving and the
    // endpoint returns page RSC instead of data. Surface that as a failed scrape
    // (prod status=failed) rather than success:0 — honors the liveness invariant.
    const cap = { urls: [] as string[], bodies: [] as string[], loginBody: [] as string[] };
    const scraper = new TaekwangScraper('20260604', MOCK_CREDENTIALS);
    mockFetch(scraper, cap, { stale: true });

    await expect(scraper.scrape()).rejects.toThrow(/action|taekwang/i);
  });
});
