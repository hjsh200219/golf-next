import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import TaekwangScraper from '@/lib/scrapers/taekwang';
import type { LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'tkid', id2: 'test2', email: 'test@test.com',
  pw: 'pw', pw1: 'pw1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5', pw6: 'pw6',
  name: 'Test', mobile: '01012345678',
};

// Server keypair: the scraper must RSA-OAEP(SHA-256) encrypt with the public key the
// site hands out (getPublicKeyAction), so the test can decrypt what was sent.
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const decrypt = (b64: string) => crypto.privateDecrypt(
  { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
  Buffer.from(b64, 'base64'),
).toString();

// Action IDs are build hashes; the scraper discovers getAvailableTimesAction from the
// realtime page's chunks (2026-06 hardcoded ID went stale → 5 months of failures).
const TIMES_ACTION = '60aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const PAGE_HTML = `<html><head>
<script src="/_next/static/chunks/other.js" async></script>
<script src="/_next/static/chunks/a4923618258a2226.js" async></script>
</head></html>`;
const CHUNK_JS = `(e.s(["x"],1));let n=(0,r.createServerReference)("${TIMES_ACTION}",t.callServer,void 0,t.findSourceMapURL,"getAvailableTimesAction");` +
  `let w=(0,r.createServerReference)("60bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",t.callServer,void 0,t.findSourceMapURL,"getWaitTimeAction");`;

function rsc(payload: object): string {
  return `0:{"a":"$@1","f":"","b":"abc","q":"","i":false}\n1:${JSON.stringify(payload)}\n`;
}
const M_TIMES = [
  { date: '20261122', courseCode: '11', hourDisplay: '06:07', discountPrice: 230000, normalPrice: 260000, isLock: false },
  { date: '20261122', courseCode: '22', hourDisplay: '06:00', discountPrice: 230000, normalPrice: 260000, isLock: false },
  { date: '20261122', courseCode: '33', hourDisplay: '07:00', discountPrice: 260000, normalPrice: 260000, isLock: true },
];
const P_TIMES = [
  { date: '20261122', courseCode: '44', hourDisplay: '06:00', discountPrice: 190000, normalPrice: 199000, isLock: false },
];
const PAGE_RSC = `2:"$Sreact.fragment"\n4:I[39756,["/_next/static/chunks/x.js"],""]\n`;

interface Opts {
  login?: { status: number; body: object };
  chunk?: string;
  timesPayload?: (coGubun: string) => string;
}
interface Cap {
  loginBody?: { encryptedId: string; encryptedPassword: string };
  actionHeaders: string[];
  actionBodies: unknown[][];
}

const ORIG_ENV = { ...process.env };
beforeEach(() => { process.env.TAEKWANG_PW = 'TK_SECRET_PW'; });
afterEach(() => { vi.restoreAllMocks(); process.env = { ...ORIG_ENV }; });

function mockFetch(scraper: TaekwangScraper, cap: Cap, opts: Opts = {}) {
  return vi.spyOn(scraper as unknown as { fetch: typeof globalThis.fetch }, 'fetch')
    .mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      const method = (init?.method ?? 'GET').toUpperCase();
      const headers = new Headers(init?.headers);
      const body = String(init?.body ?? '');
      if (method === 'GET' && u.endsWith('/reservation/realtime')) return new Response(PAGE_HTML);
      if (u.includes('/_next/static/chunks/a4923618258a2226.js')) return new Response(opts.chunk ?? CHUNK_JS);
      if (u.includes('/_next/static/chunks/')) return new Response('/* nothing */');
      if (u.endsWith('/login') && headers.get('next-action')) {
        return new Response(rsc({ success: true, publicKey }));
      }
      if (u.includes('/api/auth/login')) {
        cap.loginBody = JSON.parse(body);
        const l = opts.login ?? { status: 200, body: { success: true, token: 'TK_TOKEN', memberInfo: {} } };
        return new Response(JSON.stringify(l.body), { status: l.status });
      }
      if (method === 'POST' && u.endsWith('/reservation/realtime')) {
        cap.actionHeaders.push(headers.get('next-action') ?? '');
        const args = JSON.parse(body) as unknown[];
        cap.actionBodies.push(args);
        const co = (args[0] as { coGubun: string }).coGubun;
        const text = opts.timesPayload
          ? opts.timesPayload(co)
          : rsc({ availableTimes: co === 'P' ? P_TIMES : M_TIMES, needsLogin: false, apiResult: 0, apiMessage: '' });
        return new Response(new TextEncoder().encode(text));
      }
      return new Response('not found', { status: 404 });
    });
}

const newCap = (): Cap => ({ actionHeaders: [], actionBodies: [] });

describe('TaekwangScraper', () => {
  it('RSA-OAEP(SHA-256)-encrypts id + TAEKWANG_PW with the site public key', async () => {
    const cap = newCap();
    const scraper = new TaekwangScraper('20261122', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    await scraper.scrape();

    expect(decrypt(cap.loginBody!.encryptedId)).toBe('tkid');
    expect(decrypt(cap.loginBody!.encryptedPassword)).toBe('TK_SECRET_PW');
  });

  it('calls the action ID discovered from page chunks and passes the login token', async () => {
    const cap = newCap();
    const scraper = new TaekwangScraper('20261122', MOCK_CREDENTIALS);
    mockFetch(scraper, cap);

    await scraper.scrape();

    expect(cap.actionHeaders).toEqual([TIMES_ACTION, TIMES_ACTION]);
    expect(cap.actionBodies.map((b) => b[1])).toEqual(['TK_TOKEN', 'TK_TOKEN']);
    expect(cap.actionBodies.map((b) => (b[0] as { coGubun: string }).coGubun)).toEqual(['M', 'P']);
  });

  it('parses availableTimes, maps course, stores discountPrice, drops isLock', async () => {
    const scraper = new TaekwangScraper('20261122', MOCK_CREDENTIALS);
    mockFetch(scraper, newCap());

    const rows = await scraper.scrape();

    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.teeoff === '06:07')).toMatchObject({
      course: '북서', cc_name: '태광CC', date: '2026-11-22', price: 230000,
    });
    expect(rows.find((r) => r.course === '동')).toBeDefined();
    expect(rows.filter((r) => r.teeoff === '07:00')).toHaveLength(0);
  });

  it('throws when TAEKWANG_PW is not set', async () => {
    delete process.env.TAEKWANG_PW;
    const scraper = new TaekwangScraper('20261122', MOCK_CREDENTIALS);
    mockFetch(scraper, newCap());
    await expect(scraper.scrape()).rejects.toThrow(/taekwang: TAEKWANG_PW/);
  });

  it('throws with the site message when login is rejected', async () => {
    const scraper = new TaekwangScraper('20261122', MOCK_CREDENTIALS);
    mockFetch(scraper, newCap(), { login: { status: 401, body: { success: false, message: '비밀번호가 일치하지 않습니다.' } } });
    await expect(scraper.scrape()).rejects.toThrow(/taekwang: login failed.*비밀번호가 일치하지 않습니다/);
  });

  it('throws when getAvailableTimesAction cannot be found in the page chunks', async () => {
    const scraper = new TaekwangScraper('20261122', MOCK_CREDENTIALS);
    mockFetch(scraper, newCap(), { chunk: '/* rebuilt, action renamed */' });
    await expect(scraper.scrape()).rejects.toThrow(/taekwang: getAvailableTimesAction not found/);
  });

  it('throws when the action says needsLogin (not an empty success)', async () => {
    const scraper = new TaekwangScraper('20261122', MOCK_CREDENTIALS);
    mockFetch(scraper, newCap(), {
      timesPayload: () => rsc({ availableTimes: [], needsLogin: true, apiResult: '$undefined', apiMessage: '' }),
    });
    await expect(scraper.scrape()).rejects.toThrow(/taekwang: needsLogin/);
  });

  it('throws when the action returns page RSC instead of data', async () => {
    const scraper = new TaekwangScraper('20261122', MOCK_CREDENTIALS);
    mockFetch(scraper, newCap(), { timesPayload: () => PAGE_RSC });
    await expect(scraper.scrape()).rejects.toThrow(/taekwang: no availableTimes/);
  });
});
