import { BaseScraper, TeeTimeRow } from './base';

export default class Cc360Scraper extends BaseScraper {
  get clubId(): string {
    return 'cc360';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.360cc.co.kr';
    const loginReferer = 'https://www.360cc.co.kr/user/sign/login.do';

    // Login
    await this.postForm(
      'https://www.360cc.co.kr/user/sign/setLoginCheck.do',
      {
        calltype: 'AJAX',
        usrId: this.credentials.id,
        usrPwd: this.credentials.pw,
      },
      this.commonHeaders(origin, loginReferer),
    );

    // Fetch tee time list
    const res = await this.postForm(
      'https://www.360cc.co.kr/reservation/list/ajax_real_timeinfo_list.do',
      {
        pointDate: this.date,
        inputType: 'I',
      },
      this.commonHeaders(origin, 'https://www.360cc.co.kr/reservation/list/real_timeinfo_list.do'),
    );

    const html = await this.textWithEncoding(res, 'euc-kr');
    const $ = this.parseHtml(html);
    const rows: TeeTimeRow[] = [];

    $('tbody tr').each((_i, tr) => {
      const tds = $(tr).find('td');
      const teeoff = this.formatTime($(tds[2]).text().trim());
      const course = $(tds[1]).text().trim();
      const rawPrice = $(tds[4]).text().trim();
      const rawEvent = $(tds[5]).text().trim();
      const { price, event } = this.processPrice(rawPrice, rawEvent);

      if (!teeoff) return;

      rows.push({
        date: this.dateDash,
        cc_name: '360CC',
        teeoff,
        course,
        price,
        event,
      });
    });

    return rows;
  }
}
