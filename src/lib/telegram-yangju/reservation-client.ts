import { CookieJar } from 'tough-cookie';
import fetchCookie from 'fetch-cookie';
import * as cheerio from 'cheerio';
import { createLogger } from '@/lib/logger';
import type { SlotInfo } from './resok-payload';

const log = createLogger('telegram-yangju/reservation');

const ORIGIN = 'https://www.yangjucc.co.kr';
const LOGIN_URL = `${ORIGIN}/login/login_ok.asp`;
const LIST_URL = `${ORIGIN}/GolfRes/onepage/real_timelist_ajax_list.asp`;
const MY_URL = `${ORIGIN}/GolfRes/onepage/my_golfreslist.asp`;
const RESOK_URL = `${ORIGIN}/GolfRes/onepage/real_resOk.asp`;

export interface MyBooking {
  date: string;
  tee: string;
  course: string;
}

export interface ReservationRequest {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: string;
}

export interface ReservationResult {
  mode: 'dry_run' | 'live';
  request: ReservationRequest;
  /** Present only when mode==='live'. */
  status?: number;
}

/** Live booking is enabled ONLY when the env flag is the exact string '1'. */
function envLiveEnabled(): boolean {
  return process.env.YANGJU_BOOK_LIVE === '1';
}

/**
 * Reservation HTTP client for yangju. Login -> list re-fetch -> resOk POST over ONE
 * cookie session. Responses are euc-kr; the request body is UTF-8 (built elsewhere
 * by `buildResOkBody`). Built on the same cookie-jar/header pattern as BaseScraper
 * but NOT a Scraper (a booking is not a scrape).
 *
 * `submitReservation` is a pure gated send: it assumes the CALLER already won the
 * idempotency CAS (Phase 4 webhook sequences claim -> CAS -> preflight -> submit).
 * It does NOT re-implement the idempotency guard.
 */
export class YangjuReservationClient {
  private jar = new CookieJar();
  private fetch: typeof globalThis.fetch;

  constructor(private creds: { id: string; pw: string }) {
    this.fetch = fetchCookie(globalThis.fetch, this.jar) as typeof globalThis.fetch;
  }

  private headers(referer: string, extra?: Record<string, string>): Record<string, string> {
    return {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      Origin: ORIGIN,
      Referer: referer,
      ...extra,
    };
  }

  private async decode(res: Response): Promise<string> {
    return new TextDecoder('euc-kr').decode(Buffer.from(await res.arrayBuffer()));
  }

  /**
   * Log in. Throws on genuine credential failure. The pw-expiry case
   * (비밀번호 변경기간이 경과) is NOT a failure: yangju still issues a usable session
   * cookie and the reservation/list endpoints work under it (verified by live
   * probe) — so it is treated as a successful login and only logged as a warning.
   * Success requires a POSITIVE signal: either 환영합니다 OR the pw-expiry alert;
   * any other body (no welcome, no known alert) is an unauthenticated bounce → throw.
   */
  async login(): Promise<void> {
    const res = await this.fetch(LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...this.headers(`${ORIGIN}/login/login.asp`),
      },
      body: new URLSearchParams({ mem_id: this.creds.id, usr_pwd: this.creds.pw }).toString(),
      redirect: 'manual',
    });
    const body = await this.decode(res);

    if (/아이디 또는 비밀번호가 일치하지 않습니다/.test(body)) {
      throw new Error('yangju login: wrong id/password');
    }
    const pwExpired = /비밀번호 변경기간이 경과/.test(body);
    if (pwExpired) {
      // Session is still usable for booking; surface as a warning, do not block.
      log.warn('yangju login: password-change period elapsed (session still usable; rotate soon)');
      return;
    }
    if (!/환영합니다/.test(body)) {
      throw new Error('yangju login: no success signal (환영합니다) — not authenticated');
    }
  }

  /** Fetch open slots for a date, parsing the per-row `subcmd(...)` reservation hook. */
  async fetchSlots(date: string): Promise<SlotInfo[]> {
    const res = await this.fetch(LIST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: '*/*',
        'X-Requested-With': 'XMLHttpRequest',
        ...this.headers(`${ORIGIN}/GolfRes/onepage/real_timelist.asp`),
      },
      body: new URLSearchParams({
        golfrestype: 'real',
        courseid: '0',
        usrmemcd: '80',
        pointdate: date,
        openyn: '1',
        dategbn: '2',
        choice_time: '00',
        cssncourseum: '',
        inputtype: 'I',
      }).toString(),
      redirect: 'manual',
    });
    const body = await this.decode(res);

    // Single-session / unauth bounce: the data endpoint redirects to login.
    if (/location\.href\s*=\s*["'][^"']*login\.asp/.test(body)) {
      throw new Error('yangju fetchSlots: login redirect — session conflict or unauthenticated');
    }

    const slots: SlotInfo[] = [];
    // subcmd('R','<pointid>','<pointtime>','<pointname>','<dateText>','<pointhole>',...)
    const re = /subcmd\(\s*'R'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'[^']*'\s*,\s*'([^']*)'/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      slots.push({
        pointdate: date,
        pointid: m[1],
        pointtime: m[2],
        pointname: m[3],
        pointhole: m[4],
      });
    }
    return slots;
  }

  /**
   * Preflight: existing bookings from my_golfreslist. Empty list = no bookings.
   *
   * Fail-CLOSED on a bounced/dead session: this is the preflight gate immediately
   * before the irreversible POST, so a session bounce must NOT silently look like
   * "no bookings" (which a caller could read as safe-to-book). Throws on a
   * login-redirect, and requires a POSITIVE signal (the empty-marker OR a parseable
   * booking table) — an unrecognized page throws rather than returning [].
   */
  async checkMyBookings(): Promise<MyBooking[]> {
    const res = await this.fetch(MY_URL, {
      method: 'GET',
      headers: this.headers(`${ORIGIN}/GolfRes/onepage/real_reservation.asp`),
      redirect: 'manual',
    });
    const body = await this.decode(res);

    if (/location\.href\s*=\s*["'][^"']*login\.asp/.test(body)) {
      throw new Error('yangju checkMyBookings: login redirect — session conflict or unauthenticated');
    }

    if (/등록된 예약이 없습니다/.test(body)) {
      return [];
    }

    const $ = cheerio.load(body);
    const bookings: MyBooking[] = [];
    $('table tr').each((_, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 4) return;
      const date = $(tds[1]).text().trim();
      const tee = $(tds[2]).text().trim();
      const course = $(tds[3]).text().trim();
      if (/\d{4}-\d{2}-\d{2}/.test(date)) {
        bookings.push({ date, tee, course });
      }
    });

    // Positive-signal requirement: we got here without the empty-marker, so the
    // page MUST yield at least one parseable booking row. Zero rows here means an
    // unrecognized page (a bounce that slipped the redirect check, a layout change)
    // — fail closed rather than report a false "no bookings".
    if (bookings.length === 0) {
      throw new Error('yangju checkMyBookings: unrecognized page (no empty-marker, no booking rows)');
    }
    return bookings;
  }

  /**
   * Gated reservation send. `body` is the pre-built `buildResOkBody` output.
   * Fail-closed live gate: the real POST fires ONLY when BOTH `opts.live === true`
   * AND `YANGJU_BOOK_LIVE === '1'`. Any other combination is DRY-RUN: the full
   * Request (url + headers + body) is assembled, logged, and returned WITHOUT
   * sending — that returned Request is the maximum coverage the no-live-test
   * constraint allows, so assert its full shape in tests.
   */
  async submitReservation(
    slot: SlotInfo,
    body: string,
    opts: { live: boolean },
  ): Promise<ReservationResult> {
    const request: ReservationRequest = {
      url: RESOK_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        ...this.headers(`${ORIGIN}/GolfRes/onepage/real_reservation.asp`),
      },
      body,
    };

    const live = opts.live === true && envLiveEnabled();

    if (!live) {
      log.info('yangju reservation DRY-RUN (no live POST)', {
        url: request.url,
        date: slot.pointdate,
        tee: slot.pointtime,
        course: slot.pointname,
        bodyLen: body.length,
      });
      return { mode: 'dry_run', request };
    }

    // The ONLY irreversible line in the codebase.
    log.warn('yangju reservation LIVE POST', { url: request.url, date: slot.pointdate, tee: slot.pointtime });
    const res = await this.fetch(request.url, {
      method: 'POST',
      headers: request.headers,
      body: request.body,
      redirect: 'manual',
    });
    return { mode: 'live', request, status: res.status };
  }
}
