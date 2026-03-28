import { BaseScraper, TeeTimeRow } from './base';

interface ReservationTimeWithPrice {
  resveTime: string;
  resveCourse: number | string;
  price: number | string;
  timeStatus: string;
  [key: string]: unknown;
}

interface CalenderItem {
  bsnDate: string;
  reservationTimeWithPrices: ReservationTimeWithPrice[];
  [key: string]: unknown;
}

interface CalenderResponse {
  status: string;
  data: {
    calenders: CalenderItem[];
  } | null;
}

const COURSE_MAP: Record<string, string> = {
  '1': 'EAST',
  '2': 'WEST',
};

export default class OrangeDunesYjScraper extends BaseScraper {
  get clubId(): string {
    return 'orangedunesyj';
  }

  private get deviceHeaders(): Record<string, string> {
    return {
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'https://www.orangedunesyj.com',
      'Referer': 'https://www.orangedunesyj.com/',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
      'device-browser': 'Chrome',
      'device-os': 'Mac OS',
      'device-platform': 'PC',
      'device-user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
    };
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const apiBase = 'https://api.orangedunesyj.com';

    // Login — session is maintained via cookies (no Authorization header needed)
    await this.postJson(
      `${apiBase}/v1/auth/issue`,
      {
        idHpNo: this.credentials.id,
        password: this.credentials.pw4,
      },
      { ...this.deviceHeaders, 'Content-Type': 'application/json' },
    );

    // Fetch reservation calendar — month is current month (not target month)
    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    const calUrl = `${apiBase}/v1/reservation-calender?year=${this.year}&month=${currentMonth}&date=${this.dateDash}`;

    const dataRes = await this.fetch(calUrl, {
      method: 'GET',
      headers: this.deviceHeaders,
    });

    if (!dataRes.ok) {
      const errText = await dataRes.text().catch(() => '');
      throw new Error(`Reservation API failed: ${dataRes.status} ${errText.slice(0, 100)}`);
    }

    const json: CalenderResponse = await dataRes.json();
    const rows: TeeTimeRow[] = [];

    const calenders = json?.data?.calenders ?? [];
    for (const calItem of calenders) {
      if (calItem.bsnDate !== this.dateDash) continue;

      for (const slot of calItem.reservationTimeWithPrices ?? []) {
        if (slot.timeStatus !== 'EMPTY') continue;

        const teeoff = this.formatTime(slot.resveTime ?? '');
        const courseKey = String(slot.resveCourse);
        const course = COURSE_MAP[courseKey] ?? courseKey;
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
