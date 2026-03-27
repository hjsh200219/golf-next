import { BaseScraper, TeeTimeRow } from './base';

export default class YangjuScraper extends BaseScraper {
  get clubId(): string {
    return 'yangju';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.yangjucc.co.kr';

    // Step 1: Login
    await this.postForm(
      `${origin}/login/login_ok.asp`,
      {
        mem_id: this.credentials.id,
        usr_pwd: this.credentials.pw,
      },
      this.commonHeaders(origin, `${origin}/login/login.asp`),
    );

    // Step 2: Fetch tee time list
    const res = await this.postForm(
      `${origin}/GolfRes/onepage/real_timelist_ajax_list.asp`,
      {
        golfrestype: 'real',
        courseid: '0',
        usrmemcd: '80',
        pointdate: this.date,
        openyn: '1',
        dategbn: '5',
        choice_time: '00',
        cssncourseum: '',
        inputtype: 'I',
      },
      {
        ...this.commonHeaders(origin, `${origin}/GolfRes/onepage/real_timelist.asp`),
        Accept: '*/*',
        'X-Requested-With': 'XMLHttpRequest',
      },
    );

    const html = await res.text();
    const $ = this.parseHtml(html);

    const rows: TeeTimeRow[] = [];

    $('table tr').each((_, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 3) return;

      const course = $(tds[1]).text().trim();
      const teeoff = this.formatTime($(tds[2]).text().replace(/\s/g, ''));

      if (!teeoff) return;

      rows.push({
        date: this.dateDash,
        cc_name: '양주CC',
        teeoff,
        course,
        price: '',
        event: '',
      });
    });

    return rows;
  }
}
