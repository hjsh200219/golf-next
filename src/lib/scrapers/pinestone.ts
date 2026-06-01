import { BaseScraper, TeeTimeRow } from './base';

interface PsTimeInfo {
  bookingTime?: string;
  courseName?: string;
  greenFeeDiscountAmt?: number;
  availablePerson?: number;
}
interface PsBookingResponse {
  contents?: { reservationTimeInfoList?: PsTimeInfo[] };
}
interface PsLoginResponse {
  contents?: { accessToken?: string };
}

const GOLF_CLUB_ID = '40';

export default class PineStoneScraper extends BaseScraper {
  get clubId(): string {
    return 'pinestone';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    // Site rebuilt as a Next.js SPA backed by a JSON API; the old ASP endpoint is gone.
    // Login returns a JWT in the body, which the booking API wants as a Bearer token
    // (the Set-Cookie alone is not accepted). Date is dotted (YYYY.MM.DD).
    const origin = 'https://www.pinestonecc.com';

    const loginRes = await this.postJson(
      `${origin}/api/v1/auth/login`,
      { userId: this.credentials.id, password: this.credentials.pw },
      { golfclubid: GOLF_CLUB_ID, Origin: origin, Referer: `${origin}/member/login` },
    );
    const login = (await loginRes.json()) as PsLoginResponse;
    const token = login.contents?.accessToken;
    if (!token) {
      throw new Error('pinestone: login returned no accessToken');
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
