import { BaseScraper, TeeTimeRow } from './base';

// 남춘천CC runs on the holeinonecloud.com multi-tenant golf platform.
// SPA (www.namchuncheon.co.kr) calls a separate JSON API host; auth is JWT.
const API = 'https://namchuncheoncc-hp-api.holeinonecloud.com';
const ORIGIN = 'https://www.namchuncheon.co.kr';
const GOLF_CLUB_ID = '2'; // tenant id for 남춘천 on the platform

interface LoginResponse {
  contents: { accessToken?: string } | null;
  result: { resultCode?: string };
}

interface ReservationTime {
  courseName: string;
  bookingTime: string; // HH:MM
  orgGreenFeeAmt: number;
  greenFeeDiscountAmt: number; // store the discount tier
  eventRemark: string;
}

interface BookingResponse {
  contents: { reservationTimeInfoList?: ReservationTime[] } | null;
  result: { resultCode?: string; resultMessage?: string | null };
}

export default class NamchuncheonScraper extends BaseScraper {
  get clubId(): string {
    return 'namchuncheon_new';
  }

  private platformHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
      Accept: 'application/json, text/plain, */*',
      golfclubid: GOLF_CLUB_ID,
      ...extra,
    };
  }

  async scrape(): Promise<TeeTimeRow[]> {
    // 1) JWT login
    const loginRes = await this.postJson(
      `${API}/api/v1/auth/login`,
      { userId: this.credentials.id, password: this.credentials.pw },
      this.platformHeaders(),
    );
    const login: LoginResponse = await loginRes.json();
    const token = login.contents?.accessToken;
    if (!token) {
      throw new Error(`namchuncheon login failed: ${login.result?.resultCode ?? loginRes.status}`);
    }

    // 2) Booking list — date as YYYY.MM.DD (dotted)
    const dotDate = `${this.date.slice(0, 4)}.${this.date.slice(4, 6)}.${this.date.slice(6, 8)}`;
    const params = new URLSearchParams({ bookingDate: dotDate, bookingQueryType: 'ALL' });
    const res = await this.fetch(`${API}/api/v1/booking/list/token?${params}`, {
      headers: this.platformHeaders({ Authorization: `Bearer ${token}` }),
    });
    const data: BookingResponse = await res.json();

    // Auth-rejected / error → throw, never silent success:0 (liveness invariant)
    if (data.result?.resultCode && data.result.resultCode !== 'SN_COMMON_000') {
      throw new Error(
        `namchuncheon booking error: ${data.result.resultCode} ${data.result.resultMessage ?? ''}`.trim(),
      );
    }

    const list = data.contents?.reservationTimeInfoList ?? [];
    return list
      .map((t): TeeTimeRow | null => {
        const teeoff = this.formatTime(String(t.bookingTime ?? ''));
        if (!teeoff) return null;
        return {
          date: this.dateDash,
          cc_name: '남춘천CC',
          teeoff,
          course: String(t.courseName ?? ''),
          price: t.greenFeeDiscountAmt ?? t.orgGreenFeeAmt ?? '',
          event: String(t.eventRemark ?? '').trim(),
        };
      })
      .filter((r): r is TeeTimeRow => r !== null);
  }
}
