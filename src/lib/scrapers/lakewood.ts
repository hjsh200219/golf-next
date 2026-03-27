import { BaseScraper, TeeTimeRow } from './base';

export default class LakewoodScraper extends BaseScraper {
  get clubId(): string {
    return 'lakewood';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://lakewood.co.kr';
    const loginUrl = `${origin}/member/loginChk`;
    const dataUrl = `${origin}/reservation/ajax/golfTimeList`;

    const yyyymm = this.date.slice(0, 6);

    await this.postForm(
      loginUrl,
      {
        usrId: this.credentials.id,
        usrPwd: this.credentials.pw,
      },
      this.commonHeaders(origin, `${origin}/member/login`),
    );

    const res = await this.postForm(
      dataUrl,
      {
        clickTdId: this.date,
        workMonth: yyyymm,
        workDate: this.date,
        bookgCourse: 'ALL',
        memberCd: '61',
      },
      this.commonHeaders(origin, `${origin}/reservation/golfTime`),
    );

    const html = await res.text();
    const $ = this.parseHtml(html);
    const rows: TeeTimeRow[] = [];

    $('tbody tr').each((_i, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 3) return;

      const course = $(tds[1]).text().trim();
      const teeoff = this.formatTime($(tds[2]).text().trim());

      if (!teeoff) return;

      rows.push({
        date: this.dateDash,
        cc_name: '레이크우드CC',
        teeoff,
        course,
        price: '',
        event: '',
      });
    });

    return rows;
  }
}
