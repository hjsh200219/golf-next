import { BaseScraper, TeeTimeRow } from './base';

export default class SunningPointScraper extends BaseScraper {
  get clubId(): string {
    return 'sunningpoint';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.sunningpoint.com';
    const loginReferer = 'https://www.sunningpoint.com/login/login.asp';

    // Login
    await this.postForm(
      'https://www.sunningpoint.com/login/login_ok.asp',
      {
        mem_id: this.credentials.id,
        usr_pwd: this.credentials.pw,
      },
      this.commonHeaders(origin, loginReferer),
    );

    // Fetch tee time list
    const res = await this.postForm(
      'https://www.sunningpoint.com/golfRes/real_timeList.asp',
      {
        pointdate: this.date,
        openyn: '1',
        dategbn: '3',
      },
      this.commonHeaders(origin, 'https://www.sunningpoint.com/golfRes/real_timeList.asp'),
    );

    const html = await res.text();
    const $ = this.parseHtml(html);
    const rows: TeeTimeRow[] = [];

    $('table.df_table').each((_tableIdx, table) => {
      $(table).find('tbody tr').each((_i, tr) => {
        const tds = $(tr).find('td');
        if (tds.length < 5) return;

        const teeoff = this.formatTime($(tds[2]).text().trim());
        const course = $(tds[1]).text().trim();
        const rawPrice = $(tds[4]).text().trim();
        const { price, event } = this.processPrice(rawPrice, '');

        if (!teeoff) return;

        rows.push({
          date: this.dateDash,
          cc_name: '써닝포인트CC',
          teeoff,
          course,
          price,
          event,
        });
      });
    });

    return rows;
  }
}
