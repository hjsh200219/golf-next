import { BaseScraper, TeeTimeRow } from './base';

interface AuthResponse {
  accessToken: string;
  [key: string]: unknown;
}

interface ReservationTimeWithPrice {
  resveTime: string;
  resveCourse: number;
  price: number | string;
  [key: string]: unknown;
}

interface CalenderItem {
  bsnDate: string;
  reservationTimeWithPrices: ReservationTimeWithPrice[];
  [key: string]: unknown;
}

interface CalenderResponse {
  data: {
    calenders: CalenderItem[];
  };
}

const COURSE_MAP: Record<number, string> = {
  1: 'EAST',
  2: 'WEST',
};

export default class OrangeDunesYjScraper extends BaseScraper {
  get clubId(): string {
    return 'orangedunesyj';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const apiBase = 'https://api.orangedunesyj.com';

    // Login to get JWT
    const authRes = await this.postJson(
      `${apiBase}/v1/auth/issue`,
      {
        idHpNo: this.credentials.id,
        password: this.credentials.pw,
      },
      {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    );

    const authData: AuthResponse = await authRes.json();
    const accessToken = authData.accessToken;

    const mm = String(this.month).padStart(2, '0');
    const dd = String(this.day).padStart(2, '0');
    const calUrl = `${apiBase}/v1/reservation-calender?year=${this.year}&month=${mm}&date=${dd}`;

    const dataRes = await this.fetch(calUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      },
    });

    const json: CalenderResponse = await dataRes.json();
    const rows: TeeTimeRow[] = [];

    const calenders = json?.data?.calenders ?? [];
    for (const calItem of calenders) {
      if (calItem.bsnDate !== this.dateDash) continue;

      for (const slot of calItem.reservationTimeWithPrices ?? []) {
        const teeoff = this.formatTime(slot.resveTime ?? '');
        const courseNum = slot.resveCourse;
        const course = COURSE_MAP[courseNum] ?? String(courseNum);
        const price = slot.price;

        if (!teeoff) continue;

        rows.push({
          date: this.dateDash,
          cc_name: '오렌지듄스영종GC',
          teeoff,
          course,
          price: typeof price === 'number' ? price : String(price ?? ''),
          event: '',
        });
      }
    }

    return rows;
  }
}
