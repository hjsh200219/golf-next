import { BaseScraper, TeeTimeRow } from './base';

interface TeeListRow {
  BK_TIME: string;
  BK_COS_NM: string;
  BK_BASIC_CHARGE: string;
  BK_CHARGE: string;
  [key: string]: unknown;
}

interface TeeListResponse {
  rows: TeeListRow[];
}

export default class ThePlayersScraper extends BaseScraper {
  get clubId(): string {
    return 'theplayers';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.clubd.com';
    const loginUrl = `${origin}/clubd/member/actionLogin.do`;
    const dataUrl = `${origin}/clubd/reservation/getTeeList.do`;

    await this.postForm(
      loginUrl,
      {
        coDiv: '06',
        id: this.credentials.id,
        password: this.credentials.pw,
        type: 'I',
      },
      this.commonHeaders(origin, `${origin}/clubd/member/loginForm.do`),
    );

    const res = await this.postForm(
      dataUrl,
      {
        coDiv: '06',
        date: this.date,
      },
      this.commonHeaders(origin, `${origin}/clubd/reservation/teeTimeList.do`),
    );

    const json: TeeListResponse = await res.json();
    const rows: TeeTimeRow[] = [];

    for (const item of json.rows ?? []) {
      const teeoff = this.formatTime(item.BK_TIME ?? '');
      const course = item.BK_COS_NM ?? '';
      const priceRaw = item.BK_BASIC_CHARGE ?? '';
      const chargeRaw = item.BK_CHARGE ?? '';

      if (!teeoff) continue;

      // Extract event info from BK_CHARGE by splitting away the price portion
      const event = chargeRaw.replace(priceRaw, '').trim();

      rows.push({
        date: this.dateDash,
        cc_name: '더플레이어스',
        teeoff,
        course,
        price: priceRaw,
        event,
      });
    }

    return rows;
  }
}
