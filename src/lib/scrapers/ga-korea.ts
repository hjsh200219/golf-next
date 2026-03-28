import { BaseScraper, TeeTimeRow } from './base';

const COURSES: Record<string, string> = {
  '611': '골드CC',
  '612': '코리아CC',
  '601': '강화웰빌CC',
};

export default class GaKoreaScraper extends BaseScraper {
  get clubId(): string {
    return 'ga';
  }

  protected get tlsRejectUnauthorized(): boolean {
    return false;
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.gakorea.com';
    const loginReferer = 'https://www.gakorea.com/join/login.asp';

    // Login
    await this.postForm(
      'https://www.gakorea.com/join/login.asp',
      {
        txtId: this.credentials.id,
        txtPw: this.credentials.pw,
      },
      this.commonHeaders(origin, loginReferer),
    );

    const rows: TeeTimeRow[] = [];

    for (const [code, courseName] of Object.entries(COURSES)) {
      const res = await this.postForm(
        'https://www.gakorea.com/controller/ReservationController.asp',
        {
          method: 'getTeeList',
          coDiv: code,
          date: this.date,
          cos: 'All',
          msDivision: '21',
          msClass: '10',
          msLevel: '00',
        },
        this.commonHeaders(origin, 'https://www.gakorea.com/Reservation/ReservationList.asp'),
      );

      let data: { rows?: Array<Record<string, string>> };
      try {
        data = await res.json();
      } catch {
        continue;
      }

      if (!data.rows || !Array.isArray(data.rows)) continue;

      for (const row of data.rows) {
        const teeoff = this.formatTime(String(row['BK_TIME'] ?? ''));
        const course = String(row['BK_COS_NM'] ?? courseName);
        const rawPrice = String(row['BK_B_CHARGE_NM'] ?? '');
        const rawEvent = String(row['BK_S_CHARGE_NM'] ?? '');
        const { price, event } = this.processPrice(rawPrice, rawEvent);
        const ccName = COURSES[String(row['CO_DIV'])] ?? courseName;

        rows.push({
          date: this.dateDash,
          cc_name: ccName,
          teeoff,
          course,
          price,
          event,
        });
      }
    }

    return rows;
  }
}
