import { BaseScraper, TeeTimeRow } from './base';

export default class RainbowHillsScraper extends BaseScraper {
  get clubId(): string {
    return 'rainbowhills';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.rainbowhills.co.kr';
    const loginUrl = `${origin}/login/login_ok.asp`;
    const dataUrl = `${origin}/GolfRes/onepage/real_timelist_ajax_list.asp`;

    await this.postForm(
      loginUrl,
      {
        calltype: 'AJAX',
        mem_id: this.credentials.id,
        usr_pwd: this.credentials.pw,
      },
      this.commonHeaders(origin, `${origin}/login/login.asp`),
    );

    const res = await this.postForm(
      dataUrl,
      {
        golfrestype: 'T',
        courseid: '0',
        usrmemcd: '91',
        pointdate: this.date,
        openyn: '1',
        dategbn: '3',
        choice_time: '00',
        cssncourseum: '',
        inputtype: 'Q',
      },
      this.commonHeaders(origin, `${origin}/GolfRes/onepage/real_timelist.asp`),
    );

    const html = await res.text();
    const $ = this.parseHtml(html);
    const rows: TeeTimeRow[] = [];

    $('table.cm_time_list_tbl tbody tr').each((_i, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 5) return;

      const teeoff = this.formatTime($(tds[2]).text().trim());
      const course = $(tds[1]).text().trim();
      const priceRaw = $(tds[4]).text().trim();

      if (!teeoff) return;

      rows.push({
        date: this.dateDash,
        cc_name: '레인보우힐스CC',
        teeoff,
        course,
        price: priceRaw,
        event: '',
      });
    });

    return rows;
  }
}
