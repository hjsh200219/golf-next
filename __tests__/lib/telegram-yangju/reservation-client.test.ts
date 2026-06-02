import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import iconv from 'iconv-lite';
import { YangjuReservationClient } from '@/lib/telegram-yangju/reservation-client';

const ORIGIN = 'https://www.yangjucc.co.kr';
const LOGIN = `${ORIGIN}/login/login_ok.asp`;
const LIST = `${ORIGIN}/GolfRes/onepage/real_timelist_ajax_list.asp`;
const MY = `${ORIGIN}/GolfRes/onepage/my_golfreslist.asp`;
const RESOK = `${ORIGIN}/GolfRes/onepage/real_resOk.asp`;

// Build a euc-kr response from a JS string (the yangju site serves euc-kr).
function html(body: string) {
  return new HttpResponse(iconv.encode(body, 'euc-kr'), {
    headers: { 'Content-Type': 'text/html; charset=euc-kr' },
  });
}

const LOGIN_OK = '<script>alert("신승호고객님 환영합니다.");document.location.href="/";</script>';
const LOGIN_BADPW = '<script>alert("아이디 또는 비밀번호가 일치하지 않습니다.");history.back();</script>';
const LOGIN_PWEXPIRED =
  '<script>alert(" 비밀번호 변경기간이 경과되었습니다.\\n 비밀번호 변경 페이지로 이동합니다. ");document.location.href="/login/pwchange.asp";</script>';

const LIST_HTML = `<table>
<tr><td>1</td><td class="cm_zhtm">서</td><td>06:12</td><td>18홀</td>
<td><a id="timeresbtn_2_0612" href="javascript:subcmd('R','2','0612','서','2026년 6월 30일','18홀','I','UNABLE','','','','','N')"><img alt="신청[0612]" /></a></td></tr>
<tr><td>2</td><td class="cm_zhtm">동</td><td>06:19</td><td>18홀</td>
<td><a id="timeresbtn_1_0619" href="javascript:subcmd('R','1','0619','동','2026년 6월 30일','18홀','I','UNABLE','','','','','N')"><img alt="신청[0619]" /></a></td></tr>
</table>`;

const MY_EMPTY = '<table><tr class="cm_end"><td colspan="8">등록된 예약이 없습니다.</td></tr></table>';
const MY_ONE =
  '<table><tr><td>1</td><td>2026-06-30</td><td>06:12</td><td>서</td><td>18홀</td></tr></table>';

// resOk handler that FAILS the test if ever hit (no DRY-RUN test may reach it)
let resOkHits = 0;
const failIfResOk = http.post(RESOK, () => {
  resOkHits += 1;
  return HttpResponse.json({ error: 'resOk must NOT be called in tests' }, { status: 599 });
});

const server = setupServer(failIfResOk);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers(failIfResOk);
  resOkHits = 0;
  delete process.env.YANGJU_BOOK_LIVE;
});
afterAll(() => server.close());

const creds = { id: 'testid', pw: 'testpw' };

describe('YangjuReservationClient.login', () => {
  it('succeeds on 환영합니다 (positive signal)', async () => {
    server.use(http.post(LOGIN, () => html(LOGIN_OK)));
    const c = new YangjuReservationClient(creds);
    await expect(c.login()).resolves.toBeUndefined();
  });

  it('throws on wrong-password alert', async () => {
    server.use(http.post(LOGIN, () => html(LOGIN_BADPW)));
    const c = new YangjuReservationClient(creds);
    await expect(c.login()).rejects.toThrow();
  });

  it('pw-expiry is NOT a failure — session still usable, login resolves', async () => {
    // yangju issues a usable session cookie even when the password-change period
    // has elapsed (verified by live probe); treat it as success, not a throw.
    server.use(http.post(LOGIN, () => html(LOGIN_PWEXPIRED)));
    const c = new YangjuReservationClient(creds);
    await expect(c.login()).resolves.toBeUndefined();
  });

  it('throws on an unrecognized body (no 환영, no known alert) — unauth bounce', async () => {
    server.use(http.post(LOGIN, () => html('<script>location.href="/login/login.asp";</script>')));
    const c = new YangjuReservationClient(creds);
    await expect(c.login()).rejects.toThrow();
  });
});

describe('YangjuReservationClient.fetchSlots', () => {
  it('parses subcmd(...) rows into {pointid,pointtime,pointname,pointhole}', async () => {
    server.use(http.post(LOGIN, () => html(LOGIN_OK)), http.post(LIST, () => html(LIST_HTML)));
    const c = new YangjuReservationClient(creds);
    await c.login();
    const slots = await c.fetchSlots('20260630');
    expect(slots).toHaveLength(2);
    expect(slots[0]).toMatchObject({ pointid: '2', pointtime: '0612', pointname: '서', pointhole: '18홀' });
    expect(slots[1]).toMatchObject({ pointid: '1', pointtime: '0619', pointname: '동' });
  });

  it('throws on login-redirect bounce (single-session / unauth)', async () => {
    const bounce = '<script>location.href="/login/login.asp?returnurl=x";</script>';
    server.use(http.post(LOGIN, () => html(LOGIN_OK)), http.post(LIST, () => html(bounce)));
    const c = new YangjuReservationClient(creds);
    await c.login();
    await expect(c.fetchSlots('20260630')).rejects.toThrow();
  });
});

describe('YangjuReservationClient.checkMyBookings', () => {
  it('returns [] when 등록된 예약이 없습니다', async () => {
    server.use(http.post(LOGIN, () => html(LOGIN_OK)), http.get(MY, () => html(MY_EMPTY)));
    const c = new YangjuReservationClient(creds);
    await c.login();
    expect(await c.checkMyBookings()).toEqual([]);
  });

  it('returns existing bookings when present', async () => {
    server.use(http.post(LOGIN, () => html(LOGIN_OK)), http.get(MY, () => html(MY_ONE)));
    const c = new YangjuReservationClient(creds);
    await c.login();
    const bookings = await c.checkMyBookings();
    expect(bookings.length).toBeGreaterThan(0);
  });

  it('THROWS on login-redirect bounce (fail-closed preflight, not false-empty)', async () => {
    const bounce = '<script>location.href="/login/login.asp?returnurl=x";</script>';
    server.use(http.post(LOGIN, () => html(LOGIN_OK)), http.get(MY, () => html(bounce)));
    const c = new YangjuReservationClient(creds);
    await c.login();
    await expect(c.checkMyBookings()).rejects.toThrow();
  });

  it('THROWS on an unrecognized page (no empty-marker, no rows)', async () => {
    server.use(
      http.post(LOGIN, () => html(LOGIN_OK)),
      http.get(MY, () => html('<table><tr><td>점검중</td></tr></table>')),
    );
    const c = new YangjuReservationClient(creds);
    await c.login();
    await expect(c.checkMyBookings()).rejects.toThrow();
  });
});

describe('YangjuReservationClient.submitReservation', () => {
  const slot = { pointdate: '20260630', pointid: '1', pointtime: '0612', pointname: '동', pointhole: '18홀' };
  const booker = { hand_tel1: '010', hand_tel2: '8002', hand_tel3: '8080' };
  const body = 'cmd=ins&pointname=%25uB3D9'; // pre-built by buildResOkBody (caller)

  it('DRY-RUN by default (no env): returns full Request, NO resOk call', async () => {
    server.use(http.post(LOGIN, () => html(LOGIN_OK)));
    const c = new YangjuReservationClient(creds);
    await c.login();
    const result = await c.submitReservation(slot, body, { live: true }); // live:true but env unset
    expect(result.mode).toBe('dry_run');
    expect(result.request.url).toBe(RESOK);
    expect(result.request.method).toBe('POST');
    expect(result.request.body).toBe(body);
    // Full header map — the live branch reuses this exact object, so asserting it
    // here is the max coverage of the live wire shape the no-live-test rule allows.
    expect(result.request.headers).toEqual({
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      Origin: ORIGIN,
      Referer: `${ORIGIN}/GolfRes/onepage/real_reservation.asp`,
    });
    expect(resOkHits).toBe(0);
  });

  it('DRY-RUN when opts.live=false even if env=1: NO resOk call', async () => {
    process.env.YANGJU_BOOK_LIVE = '1';
    server.use(http.post(LOGIN, () => html(LOGIN_OK)));
    const c = new YangjuReservationClient(creds);
    await c.login();
    const result = await c.submitReservation(slot, body, { live: false });
    expect(result.mode).toBe('dry_run');
    expect(resOkHits).toBe(0);
  });

  it('DRY-RUN when env=garbage even if opts.live=true: NO resOk call', async () => {
    process.env.YANGJU_BOOK_LIVE = 'true'; // not strictly '1'
    server.use(http.post(LOGIN, () => html(LOGIN_OK)));
    const c = new YangjuReservationClient(creds);
    await c.login();
    const result = await c.submitReservation(slot, body, { live: true });
    expect(result.mode).toBe('dry_run');
    expect(resOkHits).toBe(0);
  });
});
