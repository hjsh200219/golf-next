import { BaseScraper, TeeTimeRow } from './base';

export default class FerrumScraper extends BaseScraper {
  get clubId(): string {
    return 'ferrum';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.ferrumclub.com';
    const loginReferer = 'https://www.ferrumclub.com/lounge/login.asp';

    // Login
    await this.postForm(
      'https://www.ferrumclub.com/lounge/login_ok.asp',
      {
        mem_id: this.credentials.id,
        usr_pwd: this.credentials.pw,
      },
      this.commonHeaders(origin, loginReferer),
    );

    // Fetch tee time list
    const res = await this.postForm(
      'https://www.ferrumclub.com/reservation/real_timelist_ajax_list.asp',
      {
        golfrestype: 'real',
        courseid: '0',
        usrmemcd: '10',
        pointdate: this.date,
        openyn: '1',
        dategbn: '3',
        choice_time: '00',
        inputtype: 'I',
      },
      this.commonHeaders(origin, 'https://www.ferrumclub.com/reservation/real_timelist.asp'),
    );

    const html = await this.textWithEncoding(res, 'euc-kr');
    const $ = this.parseHtml(html);
    const rows: TeeTimeRow[] = [];

    $('table.default3').each((_tableIdx, table) => {
      $(table).find('tr').each((_i, tr) => {
        const tds = $(tr).find('td');
        if (tds.length < 4) return;

        const teeoff = this.formatTime($(tds[2]).text().trim());
        const course = $(tds[1]).text().trim();
        const rawPrice = $(tds[3]).text().trim();
        const { price, event } = this.processPrice(rawPrice, '');

        if (!teeoff) return;

        rows.push({
          date: this.dateDash,
          cc_name: '페럼클럽CC',
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
