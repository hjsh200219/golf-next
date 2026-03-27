import { BaseScraper, TeeTimeRow } from './base';

export default class PineStoneScraper extends BaseScraper {
  get clubId(): string {
    return 'pinestone';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.pinestonecc.com';
    const loginUrl = `${origin}/login/login_ok.asp`;
    const dataUrl = `${origin}/GolfRes/onepage/real_timelist_ajax_list.asp`;

    await this.postForm(
      loginUrl,
      {
        mem_id: this.credentials.id,
        usr_pwd: this.credentials.pw,
      },
      this.commonHeaders(origin, `${origin}/login/login.asp`),
    );

    const res = await this.postForm(
      dataUrl,
      {
        golfrestype: 'real',
        courseid: '0',
        usrmemcd: '10',
        pointdate: this.date,
        openyn: '1',
        dategbn: '4',
        choice_time: '00',
        inputtype: 'I',
      },
      this.commonHeaders(origin, `${origin}/GolfRes/onepage/real_timelist.asp`),
    );

    const html = await res.text();
    const $ = this.parseHtml(html);
    const rows: TeeTimeRow[] = [];

    $('tbody tr').each((_i, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 5) return;

      const teeoff = this.formatTime($(tds[2]).text().trim());
      const course = $(tds[1]).text().trim();
      const priceRaw = $(tds[4]).text().trim();

      if (!teeoff) return;

      rows.push({
        date: this.dateDash,
        cc_name: '파인스톤CC',
        teeoff,
        course,
        price: priceRaw,
        event: '',
      });
    });

    return rows;
  }
}
