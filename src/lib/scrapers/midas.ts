import { BaseScraper, TeeTimeRow } from './base';

export default class MidasScraper extends BaseScraper {
  get clubId(): string {
    return 'midas';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.midasgolf.co.kr';

    // Step 1: GET login page to extract __RequestVerificationToken
    const loginPageRes = await this.fetch(`${origin}/Member/Login`, {
      headers: {
        ...this.commonHeaders(origin, `${origin}/Member/Login`),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const loginPageHtml = await loginPageRes.text();
    const $loginPage = this.parseHtml(loginPageHtml);
    const token = $loginPage('input[name="__RequestVerificationToken"]').val() as string || '';

    // Step 2: POST login form
    await this.postForm(
      `${origin}/Member/Login`,
      {
        __RequestVerificationToken: token,
        mem_id: this.credentials.id,
        usr_pwd: this.credentials.pw,
      },
      this.commonHeaders(origin, `${origin}/Member/Login`),
    );

    // Step 3: Fetch data for each course
    const courses: Record<string, string> = {
      '113': '마이다스레이크 이천',
      '109': '마이다스밸리 청평',
    };

    const rows: TeeTimeRow[] = [];

    for (const [code, ccName] of Object.entries(courses)) {
      const res = await this.postForm(
        `${origin}/Reservation/AjaxTimeList`,
        {
          lgubun: code,
          date: this.date,
        },
        {
          ...this.commonHeaders(origin, `${origin}/Reservation/Reservation`),
          Accept: '*/*',
          'X-Requested-With': 'XMLHttpRequest',
        },
      );

      const html = await res.text();
      const $ = this.parseHtml(html);

      $('tbody tr').each((_, tr) => {
        const tds = $(tr).find('td');
        if (tds.length < 3) return;

        const course = $(tds[0]).text().trim();
        const teeoff = this.formatTime($(tds[1]).text().trim());
        const price = $(tds[2]).text().trim();

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
