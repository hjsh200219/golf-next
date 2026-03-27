import { BaseScraper, TeeTimeRow } from './base';

export default class EhsccScraper extends BaseScraper {
  get clubId(): string {
    return 'ehscc';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.ehscc.co.kr';
    const loginReferer = 'https://www.ehscc.co.kr/Member/Login';

    // Login
    await this.postForm(
      'https://www.ehscc.co.kr/Member/LoginAction',
      {
        id: this.credentials.id,
        pwd: this.credentials.pw,
        type: 'I',
      },
      this.commonHeaders(origin, loginReferer),
    );

    // Fetch tee time list
    const res = await this.postForm(
      'https://www.ehscc.co.kr/Ajax/Time',
      {
        coGubun: 'M',
        date: this.date,
      },
      this.commonHeaders(origin, 'https://www.ehscc.co.kr/Reservation/Time'),
    );

    const html = await res.text();
    const $ = this.parseHtml(html);
    const rows: TeeTimeRow[] = [];

    $('tr').each((_i, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 3) return;

      const rawTeeoff = $(tds[1]).text().trim();
      const teeoff = this.formatTime(rawTeeoff.slice(0, 5));
      if (!teeoff) return;

      const td2 = $(tds[2]);
      const rawPrice = td2.find('span').text().trim();
      const td2Text = td2.text().trim();
      const td2Parts = td2Text.split(/\s+/);
      const rawEvent = td2Parts[td2Parts.length - 1] ?? '';
      const { price, event } = this.processPrice(rawPrice, rawEvent);

      rows.push({
        date: this.dateDash,
        cc_name: '은화삼CC',
        teeoff,
        course: '',
        price,
        event,
      });
    });

    return rows;
  }
}
