import { BaseScraper, TeeTimeRow } from './base';

interface PsTimeInfo {
  bookingTime?: string;
  courseName?: string;
  greenFeeDiscountAmt?: number;
  availablePerson?: number;
}
interface PsResult {
  resultCode?: string;
  resultMessage?: string | null;
}
interface PsBookingResponse {
  contents?: { reservationTimeInfoList?: PsTimeInfo[] } | null;
  result?: PsResult;
}
interface PsLoginResponse {
  contents?: { accessToken?: string } | null;
  result?: PsResult;
}

const GOLF_CLUB_ID = '40';
const OK = 'SN_COMMON_000';
const LOGIN_ATTEMPTS = 3;
// Logins started <1s apart are refused (FN_COMMON_001); ≥1s succeeded 18/18 (2026-11-21).
const LOGIN_RETRY_DELAY_MS = 1_500;

export default class PineStoneScraper extends BaseScraper {
  get clubId(): string {
    return 'pinestone';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    // Site rebuilt as a Next.js SPA backed by a JSON API; the old ASP endpoint is gone.
    // Login returns a JWT in the body, which the booking API wants as a Bearer token
    // (the Set-Cookie alone is not accepted). Date is dotted (YYYY.MM.DD).
    const origin = 'https://www.pinestonecc.com';

    // One session per account: an overlapping login is refused with FN_COMMON_001.
    // Dates are dispatched serially (SINGLE_SESSION_CLUBS); retry covers back-to-back logins.
    let token: string | undefined;
    let loginErr = '';
    for (let attempt = 1; attempt <= LOGIN_ATTEMPTS && !token; attempt++) {
      if (attempt > 1) await this.sleep(LOGIN_RETRY_DELAY_MS);
      const loginRes = await this.postJson(
        `${origin}/api/v1/auth/login`,
        { userId: this.credentials.id, password: this.credentials.pw },
        { golfclubid: GOLF_CLUB_ID, Origin: origin, Referer: `${origin}/member/login` },
      );
      const login = (await loginRes.json().catch(() => ({}))) as PsLoginResponse;
      token = login.contents?.accessToken;
      if (!token) loginErr = `${login.result?.resultCode ?? `status ${loginRes.status}`} ${login.result?.resultMessage ?? ''}`.trim();
    }
    if (!token) {
      throw new Error(`pinestone: login failed after ${LOGIN_ATTEMPTS} attempts — ${loginErr}`);
    }

    const dateDotted = `${this.date.slice(0, 4)}.${this.date.slice(4, 6)}.${this.date.slice(6, 8)}`;
    const res = await this.fetch(
      `${origin}/api/v1/booking/list/token?bookingDate=${dateDotted}&bookingQueryType=ALL`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          golfclubid: GOLF_CLUB_ID,
          Origin: origin,
          Referer: `${origin}/booking`,
          Accept: 'application/json',
        },
      },
    );

    const json = (await res.json()) as PsBookingResponse;
    // A kicked token (FM_LOGIN_002) returns 200 with contents:null — an empty "success"
    // would advance liveness S and hide every open slot.
    const code = json.result?.resultCode;
    if (code && code !== OK) {
      throw new Error(`pinestone: booking list ${code} ${json.result?.resultMessage ?? ''}`.trim());
    }
    const list = json.contents?.reservationTimeInfoList ?? [];

    const rows: TeeTimeRow[] = [];
    for (const t of list) {
      if ((t.availablePerson ?? 0) <= 0) continue;
      const teeoff = this.formatTime(t.bookingTime ?? '');
      if (!/^\d{1,2}:\d{2}$/.test(teeoff)) continue;

      rows.push({
        date: this.dateDash,
        cc_name: '파인스톤CC',
        teeoff,
        course: t.courseName ?? '',
        price: t.greenFeeDiscountAmt ?? '',
        event: '',
      });
    }

    return rows;
  }
}
