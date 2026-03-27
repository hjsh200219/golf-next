import { BaseScraper, TeeTimeRow } from './base';

export default class EdenBlueScraper extends BaseScraper {
  get clubId(): string {
    return 'edenblue';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.edenblue.co.kr';
    const loginReferer = 'https://www.edenblue.co.kr/login/login.asp';

    // Login
    await this.postForm(
      'https://www.edenblue.co.kr/login/login_ok.asp',
      {
        mem_id: this.credentials.id,
        usr_pwd: this.credentials.pw,
      },
      this.commonHeaders(origin, loginReferer),
    );

    // Fetch tee time list
    const res = await this.postForm(
      'https://www.edenblue.co.kr/GolfRes/onepage/real_timelist_ajax_list.asp',
      {
        pointdate: this.date,
      },
      this.commonHeaders(origin, 'https://www.edenblue.co.kr/GolfRes/onepage/real_timelist.asp'),
    );

    const html = await this.textWithEncoding(res, 'euc-kr');
    const $ = this.parseHtml(html);
    const rows: TeeTimeRow[] = [];

    $('tbody tr').each((_i, tr) => {
      const tds = $(tr).find('td');
      const teeoff = this.formatTime($(tds[2]).text().trim());
      const course = $(tds[1]).text().trim();
      const rawPrice = $(tds[5]).text().trim();
      const { price, event } = this.processPrice(rawPrice, '');

      if (!teeoff) return;

      rows.push({
        date: this.dateDash,
        cc_name: '에덴블루CC',
        teeoff,
        course,
        price,
        event,
      });
    });

    return rows;
  }
}
