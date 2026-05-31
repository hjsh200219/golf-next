import { BaseScraper, TeeTimeRow } from './base';

export default class GolfzonCountyScraper extends BaseScraper {
  get clubId(): string {
    return 'golfzoncounty';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.golfzoncounty.com';

    // Step 1: Login via JSON
    await this.postJson(
      `${origin}/member/ajax/loginChk`,
      {
        usrId: this.credentials.id,
        usrPwd: this.credentials.pw1,
      },
      {
        ...this.commonHeaders(origin, `${origin}/member/login`),
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
      },
    );

    // Step 2: Fetch data for each course
    const courses: Record<string, string> = {
      '10001': '이글몬트CC',
      '10003': '안성W',
      '10009': '안성H',
    };

    const rows: TeeTimeRow[] = [];

    for (const [code, ccName] of Object.entries(courses)) {
      const res = await this.postForm(
        `${origin}/reserve/ajax/bookgInfo`,
        {
          bookgDate: this.date,
          openWeek: '0',
          openWeekend: '0',
          accountId: code,
        },
        {
          ...this.commonHeaders(origin, `${origin}/reserve/reserveMain`),
          Accept: '*/*',
          'X-Requested-With': 'XMLHttpRequest',
        },
      );

      const html = await res.text();
      const $ = this.parseHtml(html);

      $('li.selectTee').each((_, li) => {
        const el = $(li);
        const teeoff = this.formatTime(el.attr('data-tee_time') || '');
        const course = el.attr('data-course_name') || '';
        const orgPrice2 = el.attr('data-org_price2') || '';
        const price2 = el.attr('data-price2') || '';
        const price = orgPrice2 || price2;

        if (!teeoff) return;

        rows.push({
          date: this.dateDash,
          cc_name: ccName,
          teeoff,
          course,
          price,
          event: '',
        });
      });
    }

    return rows;
  }
}
