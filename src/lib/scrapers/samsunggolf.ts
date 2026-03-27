import { BaseScraper, TeeTimeRow } from './base';

export default class SamsungGolfScraper extends BaseScraper {
  get clubId(): string {
    return 'samsunggolf';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.lakeside.kr';

    // Step 1: Login
    await this.postForm(
      `${origin}/user/sign/setLoginCheck.do`,
      {
        usrId: this.credentials.id,
        usrPwd: this.credentials.pw,
      },
      this.commonHeaders(origin, `${origin}/user/sign/login.do`),
    );

    // Step 2: Fetch data for each course
    const courses: Record<string, string> = {
      '5': 'course1',
      '6': 'course2',
      '8': 'course3',
    };

    const rows: TeeTimeRow[] = [];

    for (const [code] of Object.entries(courses)) {
      const res = await this.postForm(
        `${origin}/reservation/list/ajax_real_timeinfo_list_golf_samsung.do`,
        {
          courseIdM: code,
          pointDate: this.date,
          inputType: 'I',
        },
        {
          ...this.commonHeaders(origin, `${origin}/reservation/list/real_timeinfo_list_golf.do`),
          Accept: '*/*',
          'X-Requested-With': 'XMLHttpRequest',
        },
      );

      const html = await res.text();
      const $ = this.parseHtml(html);

      $('tbody tr').each((_, tr) => {
        const tds = $(tr).find('td');
        if (tds.length < 6) return;

        const teeoff = this.formatTime($(tds[1]).text().trim());
        const course = $(tds[2]).text().trim();
        const price = $(tds[4]).text().trim();
        const event = $(tds[5]).text().trim();

        if (!teeoff) return;

        rows.push({
          date: this.dateDash,
          cc_name: '삼성골프',
          teeoff,
          course,
          price,
          event,
        });
      });
    }

    return rows;
  }
}
