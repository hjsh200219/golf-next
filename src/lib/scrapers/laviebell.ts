import { BaseScraper, TeeTimeRow } from './base';

export default class LavieBellScraper extends BaseScraper {
  get clubId(): string {
    return 'laviebell';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://lavieestbellegolfnresort.com';
    const loginUrl = `${origin}/oldcourse/login/login_ok.asp`;
    const dataUrl = `${origin}/oldcourse/GolfRes/onepage/real_timelist_ajax_list.asp`;

    await this.postForm(
      loginUrl,
      {
        mem_id: this.credentials.id,
        usr_pwd: this.credentials.pw,
      },
      this.commonHeaders(origin, `${origin}/oldcourse/login/login.asp`),
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
      this.commonHeaders(origin, `${origin}/oldcourse/GolfRes/onepage/real_timelist.asp`),
    );

    const html = await res.text();
    const $ = this.parseHtml(html);
    const rows: TeeTimeRow[] = [];

    $('table tr').each((_i, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 4) return;

      const teeoff = this.formatTime($(tds[2]).text().trim());
      const course = $(tds[1]).text().trim();
      const priceRaw = $(tds[3]).text().trim();

      if (!teeoff) return;

      rows.push({
        date: this.dateDash,
        cc_name: '라비에벨CC',
        teeoff,
        course,
        price: priceRaw,
        event: '',
      });
    });

    return rows;
  }
}
