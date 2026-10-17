import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import OneTheClubScraper from '@/lib/scrapers/onetheclub';
import type { LoginCredentials } from '@/lib/scrapers/base';

const CREDS: LoginCredentials = {
  id: 'u', id2: '', email: '', pw: 'p', pw1: '', pw2: '', pw3: '', pw4: '', pw5: '', pw6: '',
  name: '', mobile: '',
};

// Shapes captured live 2026-10-17. The member account is single-session: when
// several scrapes log in concurrently, every session but the last gets a time
// list whose company heading is blank (or a 302 / empty body). A genuinely
// closed day still carries the heading ("신라CC [ 마감 ]").
function homeHtml(name: string, slots: string[]): string {
  const lis = slots.length
    ? slots
        .map(
          (t) =>
            `<li><button onclick="golfConfirm('1','2','J53','${name}','20261018','0630','A','동','${t}','18','330000','190000','x')">신청</button></li>`,
        )
        .join('')
    : '<li>Tee-off 타임이 없습니다.</li>';
  return `<div class="company_list"><h5 class="grid" h5_cd="J53"><span class="company_name col">${name} </span></h5><ul class="list">${lis}</ul></div>`;
}

const KICKED_HTML =
  '<div class="company_list"><h5 class="grid" h5_cd="J53"><span class="company_name col"> </span></h5><span>0</span><ul class="list"><li>Tee-off 타임이 없습니다.</li></ul></div>';

type HomeReply = { status?: number; body: string };

function mockOneTheClub(
  scraper: OneTheClubScraper,
  homeReply: (code: string) => HomeReply,
) {
  return vi
    .spyOn(scraper as unknown as { fetch: typeof globalThis.fetch }, 'fetch')
    .mockImplementation(async (url, init) => {
      const u = String(url);
      const body = String(init?.body ?? '');
      if (u.includes('/reservation/ajax/golfTimeList')) {
        const code = new URLSearchParams(body).get('selCompany') ?? '';
        const r = homeReply(code);
        return new Response(r.body, { status: r.status ?? 200 });
      }
      if (u.includes('/reservation/golfPartner?')) {
        return new Response('<form id="mainForm"><input name="a" value="1"></form>');
      }
      // login, home page GET, partner time list (no partner slots)
      return new Response('<ul class="list"></ul>');
    });
}

describe('OneTheClubScraper — single-session member account', () => {
  beforeEach(() => {
    process.env.ONETHECLUB_MEMBER_ID = 'm';
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.ONETHECLUB_MEMBER_ID;
  });

  it('parses home course slots when the session is valid', async () => {
    const s = new OneTheClubScraper('20261018', CREDS);
    mockOneTheClub(s, (code) =>
      code === 'J53' ? { body: homeHtml('신라CC', ['06:30', '06:37']) } : { body: homeHtml('파주CC', []) },
    );
    const r = await s.run();
    expect(r.success).toBe(true);
    expect(r.teeTimes.filter((t) => t.cc_name === '신라CC')).toHaveLength(2);
  });

  it('a genuinely closed day (heading present, no slots) is still a success', async () => {
    const s = new OneTheClubScraper('20261020', CREDS);
    mockOneTheClub(s, () => ({ body: homeHtml('신라CC', []) }));
    const r = await s.run();
    expect(r.success).toBe(true);
  });

  it('fails the whole scrape when a home course comes back with a blank heading (session kicked)', async () => {
    const s = new OneTheClubScraper('20261018', CREDS);
    mockOneTheClub(s, (code) =>
      code === 'J53' ? { body: KICKED_HTML } : { body: homeHtml('파주CC', ['05:42']) },
    );
    const r = await s.run();
    // Must NOT report success: a success advances S and hides every 본진 row.
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/session/i);
  });

  it('fails on a 302 or empty body from the time list', async () => {
    const s1 = new OneTheClubScraper('20261018', CREDS);
    mockOneTheClub(s1, (code) => (code === 'J53' ? { status: 302, body: '' } : { body: homeHtml('파주CC', []) }));
    expect((await s1.run()).success).toBe(false);

    const s2 = new OneTheClubScraper('20261018', CREDS);
    mockOneTheClub(s2, (code) => (code === 'D01' ? { body: '' } : { body: homeHtml('신라CC', []) }));
    expect((await s2.run()).success).toBe(false);
  });

  it('fails when a partner page errors instead of silently dropping that cc', async () => {
    const s = new OneTheClubScraper('20261018', CREDS);
    const spy = mockOneTheClub(s, () => ({ body: homeHtml('신라CC', []) }));
    const base = spy.getMockImplementation()!;
    spy.mockImplementation(async (url, init) => {
      if (String(url).includes('sel=P10')) throw new Error('ECONNRESET');
      return base(url, init);
    });
    expect((await s.run()).success).toBe(false);
  });
});
