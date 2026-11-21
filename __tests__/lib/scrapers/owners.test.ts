import { describe, it, expect, vi, afterEach } from 'vitest';
import OwnersScraper from '@/lib/scrapers/owners';
import { createScraper } from '@/lib/scrapers';
import { CLUB_REGION_MAP } from '@/lib/constants/regions';
import type { LoginCredentials } from '@/lib/scrapers/base';

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'id', id2: 'test2', email: 'test@test.com',
  pw: 'OWN_PW', pw1: 'pw1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5', pw6: 'pw6',
  name: 'Test', mobile: '01012345678',
};

// Live ownersgc.co.kr responses (2026-11-21, phone/CSRF values replaced).
const LOGIN_PAGE = `<form id="loginForm2" name="loginForm2" method="post" action="login_ok1.asp">
<input type="hidden" name="gopath" value=""><input type="hidden" name="memb_passpw" value="">
<input type="text" name="phone_no1"><input type="text" name="phone_no2"><input type="text" name="phone_no3">
<input type="password" name="memb_inet_pass_re">
<input type="hidden" name="_csrf" value="CSRF_TOKEN_FIXTURE"></form>`;
const LOGIN_OK = `<Script Language="JavaScript" ><!--
\t\tlocation.replace('/index.asp');
\t//--></Script>`;
const NOT_LOGGED_IN = `<Script Language="JavaScript"><!--
\t\tparent.location.replace('/html/member/login.asp?gopath=/html/reservation/reservation_01_01.asp&b_idx=');
\t//--></Script>`;
const VIEW = `<table><thead><tr><th scope="col">힐 코스</th><th scope="col">레이크 코스</th></tr></thead></table>
<div class="table_con"><table summary="전체코스" class="course_list_table"><caption>전체코스</caption><tbody>
<tr>
  <td>
    <div class="rev_time">07:22 <span class="time_price">130,000</span><a href="JavaScript:Book_Confirm1('20261123','월','1', 'HILL','0722');"><span>18홀예약</span></a></div>
  </td>
  <td>
    <div class="rev_time">07:42 <span class="time_price">180,000</span><a href="JavaScript:Book_Confirm1('20261123','월','2', 'LAKE','0742');"><span>18홀예약</span></a></div>
    <div class="rev_time">08:05 <span class="time_price">180,000</span><a href="JavaScript:Book_Confirm1('20261123','월','2', 'LAKE','0805');"><span>18홀예약</span></a></div>
  </td>
</tr></tbody></table></div>`;

afterEach(() => vi.restoreAllMocks());

interface Opts { loginPage?: string; loginBody?: string; loginStatus?: number; view?: string }
function mockFetch(scraper: OwnersScraper, cap: { bodies: Record<string, string> }, o: Opts = {}) {
  return vi.spyOn(scraper as unknown as { fetch: typeof globalThis.fetch }, 'fetch')
    .mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      if (init?.body) cap.bodies[u.split('/').pop()!] = String(init.body);
      if (u.endsWith('/html/member/login.asp')) return new Response(o.loginPage ?? LOGIN_PAGE);
      if (u.endsWith('/login_ok1.asp')) return new Response(o.loginBody ?? LOGIN_OK, { status: o.loginStatus ?? 200 });
      if (u.endsWith('/reservation_01_01.asp')) return new Response(new TextEncoder().encode(o.view ?? VIEW));
      return new Response('', { status: 404 });
    });
}

describe('OwnersScraper', () => {
  it('is registered under the golf_clubs row id owners_new, region 강원 (춘천)', () => {
    const s = createScraper('owners_new', '20261123', MOCK_CREDENTIALS);
    expect(s).not.toBeNull();
    expect(s!.clubId).toBe('owners_new');
    expect(CLUB_REGION_MAP.owners_new).toBe('강원');
  });

  it('keeps TLS verification on and supplies the missing Sectigo DV R36 intermediate', () => {
    // The site omits its intermediate certificate. Turning verification off would send
    // the password over an unverified connection — add the intermediate instead.
    const s = new OwnersScraper('20261123', MOCK_CREDENTIALS) as unknown as {
      tlsRejectUnauthorized: boolean; extraCaCerts: string[];
    };
    expect(s.tlsRejectUnauthorized).toBe(true);
    expect(s.extraCaCerts).toHaveLength(1);
    expect(s.extraCaCerts[0]).toMatch(/^-----BEGIN CERTIFICATE-----/);
  });

  it('sends the login form _csrf with phone + password', async () => {
    const cap = { bodies: {} as Record<string, string> };
    const s = new OwnersScraper('20261123', MOCK_CREDENTIALS);
    mockFetch(s, cap);
    await s.scrape();
    const body = new URLSearchParams(cap.bodies['login_ok1.asp']);
    expect(body.get('_csrf')).toBe('CSRF_TOKEN_FIXTURE');
    expect(body.get('phone_no2')).toBe('1234');
    expect(body.get('phone_no3')).toBe('5678');
    expect(body.get('memb_inet_pass_re')).toBe('OWN_PW');
  });

  it('maps course by header and parses time + price', async () => {
    const s = new OwnersScraper('20261123', MOCK_CREDENTIALS);
    mockFetch(s, { bodies: {} });
    const rows = await s.scrape();
    expect(rows).toEqual([
      { date: '2026-11-23', cc_name: '오너스GC', teeoff: '07:22', course: '힐 코스', price: '130000', event: '' },
      { date: '2026-11-23', cc_name: '오너스GC', teeoff: '07:42', course: '레이크 코스', price: '180000', event: '' },
      { date: '2026-11-23', cc_name: '오너스GC', teeoff: '08:05', course: '레이크 코스', price: '180000', event: '' },
    ]);
  });

  it('throws when the login form has no _csrf', async () => {
    const s = new OwnersScraper('20261123', MOCK_CREDENTIALS);
    mockFetch(s, { bodies: {} }, { loginPage: '<form name="loginForm2"></form>' });
    await expect(s.scrape()).rejects.toThrow(/owners: login form _csrf not found/);
  });

  it('throws when login does not redirect to /index.asp', async () => {
    const s = new OwnersScraper('20261123', MOCK_CREDENTIALS);
    mockFetch(s, { bodies: {} }, { loginBody: 'Forbidden', loginStatus: 403 });
    await expect(s.scrape()).rejects.toThrow(/owners: login failed/);
  });

  it('throws when the reservation page bounces to login (not an empty success)', async () => {
    const s = new OwnersScraper('20261123', MOCK_CREDENTIALS);
    mockFetch(s, { bodies: {} }, { view: NOT_LOGGED_IN });
    await expect(s.scrape()).rejects.toThrow(/owners: not logged in/);
  });
});
