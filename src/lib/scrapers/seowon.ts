import { BaseScraper, TeeTimeRow } from './base';

interface SeowonTimeEntry {
  date: string;
  course: string;
  time: string;
  part: number;
  chargeType: string;
  chargeValue: number;
  defaultChargeValue: number;
  personnelCode: string;
  isSelfRound: boolean;
  [key: string]: unknown;
}

interface SeowonLoginResponse {
  token: string;
  expiration: string;
  clubId: string;
}

export default class SeowonScraper extends BaseScraper {
  get clubId(): string {
    return 'seowon';
  }

  private static readonly CLUB_ID = '65';

  private static readonly COURSE_NAMES: Record<string, string> = {
    A: '이스트',
    B: '웨스트',
    C: '사우스',
  };

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.seowongolf.co.kr';

    // Step 1: Login to get JWT token
    const loginRes = await this.postJson(
      `${origin}/pub-api/member/login`,
      {
        clubId: SeowonScraper.CLUB_ID,
        id: this.credentials.id,
        pw: this.credentials.pw,
        keepLoggedIn: false,
      },
      {
        ...this.commonHeaders(origin, `${origin}/hills/reservation/main`),
      },
    );

    const loginData = (await loginRes.json()) as SeowonLoginResponse;
    const token = loginData.token;

    // Step 2: Fetch tee time list (public API also works, but use sec-api when logged in)
    const apiBase = token ? '/sec-api' : '/pub-api';
    const headers: Record<string, string> = {
      ...this.commonHeaders(origin, `${origin}/hills/reservation/main`),
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await this.fetch(
      `${origin}${apiBase}/booking/times?clubId=${SeowonScraper.CLUB_ID}&date=${this.date}`,
      { headers },
    );

    const times = (await res.json()) as SeowonTimeEntry[];
    const rows: TeeTimeRow[] = [];

    for (const item of times ?? []) {
      const timeStr = String(item.time ?? '');
      if (!timeStr || timeStr.length < 4) continue;

      const teeoff = `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}`;
      const courseLetter = item.course ?? '';
      const course = SeowonScraper.COURSE_NAMES[courseLetter] ?? courseLetter;
      const price = String(item.chargeValue ?? '');

      rows.push({
        date: this.dateDash,
        cc_name: '서원힐스CC',
        teeoff,
        course,
        price,
        event: item.chargeType !== 'NORMAL' ? item.chargeType : '',
      });
    }

    return rows;
  }
}
