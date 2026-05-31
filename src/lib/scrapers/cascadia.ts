import { BaseScraper, TeeTimeRow } from './base';

export default class CascadiaScraper extends BaseScraper {
  get clubId(): string {
    return 'cascadia';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://cascadia.kr';

    // Step 1: Login (uses usrId/usrPwd field names)
    await this.postForm(
      `${origin}/member/loginChk`,
      {
        usrId: this.credentials.id,
        usrPwd: this.credentials.pw,
      },
      this.commonHeaders(origin, `${origin}/member/login`),
    );

    // Step 2: Fetch tee time list
    const res = await this.postForm(
      `${origin}/reservation/ajax/golfTimeList`,
      {
        clickTdId: `A${this.date}`,
        workMonth: this.date.slice(0, 6),
        workDate: this.date,
        bookgCourse: 'ALL',
        memberCd: '89',
      },
      {
        ...this.commonHeaders(origin, `${origin}/reservation/golf`),
        Accept: '*/*',
        'X-Requested-With': 'XMLHttpRequest',
      },
    );

    const html = await res.text();
    const $ = this.parseHtml(html);
    const rows: TeeTimeRow[] = [];

    $('tbody tr').each((_i, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 3) return;

      const course = $(tds[1]).text().trim();
      // Site added a 부 column; time moved from tds[2] to tds[4].
      const teeoff = this.formatTime($(tds[4]).text().trim());

      // Guard: only accept HH:MM so non-time cells (주중/주말 등) never parse.
      if (!/^\d{1,2}:\d{2}$/.test(teeoff)) return;

      rows.push({
        date: this.dateDash,
        cc_name: '카스카디아CC',
        teeoff,
        course,
        price: '',
        event: '',
      });
    });

    return rows;
  }
}
