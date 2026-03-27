import { BaseScraper, TeeTimeRow } from './base';

interface LassaRow {
  BK_TIME: string;
  BK_COS_NM: string;
  BK_CHARGE: string;
  BK_BUTTON: string;
  [key: string]: unknown;
}

interface LassaResponse {
  rows: LassaRow[];
}

export default class LassaGcScraper extends BaseScraper {
  get clubId(): string {
    return 'lassagc';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.lassagc.com';
    const dataUrl = `${origin}/controller/ReservationController.asp`;

    const res = await this.postForm(
      dataUrl,
      {
        method: 'getTeeList',
        coDiv: '860',
        date: this.date,
      },
      this.commonHeaders(origin, `${origin}/reservation/tee-time`),
    );

    const json: LassaResponse = await res.json();
    const rows: TeeTimeRow[] = [];

    for (const item of json.rows ?? []) {
      const rawTime = item.BK_TIME ?? '';
      // Format to HH:MM
      const teeoff = this.formatTime(rawTime);
      const course = item.BK_COS_NM ?? '';
      const priceRaw = item.BK_CHARGE ?? '';
      const button = item.BK_BUTTON ?? '';
      const event = button.includes('27홀예약') ? '27홀예약' : '';

      if (!teeoff) continue;

      rows.push({
        date: this.dateDash,
        cc_name: '라싸GC',
        teeoff,
        course,
        price: priceRaw,
        event,
      });
    }

    return rows;
  }
}
