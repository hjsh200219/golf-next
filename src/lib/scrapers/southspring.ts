import { BaseScraper, TeeTimeRow } from './base';

const COURSE_MAP: Record<string, string> = {
  '1': '레이크',
  '2': '마운틴',
};

interface SouthSpringSheet {
  teeTime?: string;
  courseCode?: string | number;
  greenFee?: string | number;
}

export default class SouthSpringScraper extends BaseScraper {
  get clubId(): string {
    return 'southspring';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.sscc.co.kr';
    const loginReferer = 'https://www.sscc.co.kr/hp/member/login';

    // Login
    await this.postJson(
      'https://www.sscc.co.kr/hp/api/member/login',
      {
        loginId: this.credentials.id,
        loginPw: this.credentials.pw,
      },
      this.commonHeaders(origin, loginReferer),
    );

    // Fetch tee time data
    const res = await this.fetch(
      `https://www.sscc.co.kr/hp/api/reservation/sheets/non-member/KBLFG/${this.dateDash}`,
      {
        headers: {
          ...this.commonHeaders(origin, 'https://www.sscc.co.kr/hp/reservation/'),
          Accept: 'application/json',
        },
      },
    );

    let data: { data?: SouthSpringSheet[] };
    try {
      data = await res.json();
    } catch {
      return [];
    }

    if (!data.data || !Array.isArray(data.data)) return [];

    const rows: TeeTimeRow[] = [];

    for (const sheet of data.data) {
      const teeoff = this.formatTime(String(sheet.teeTime ?? ''));
      const courseKey = String(sheet.courseCode ?? '');
      const course = COURSE_MAP[courseKey] ?? courseKey;
      const rawPrice = String(sheet.greenFee ?? '');
      const { price, event } = this.processPrice(rawPrice, '');

      if (!teeoff) continue;

      rows.push({
        date: this.dateDash,
        cc_name: '사우스스프링스CC',
        teeoff,
        course,
        price,
        event,
      });
    }

    return rows;
  }
}
