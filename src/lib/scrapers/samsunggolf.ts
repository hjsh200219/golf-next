import { BaseScraper, TeeTimeRow } from './base';

// courseIdM → club name (verified from original Python scraper)
// 레이크사이드CC is scraped separately (not included here)
const CODE_TO_CLUB: Record<string, string> = {
  '5': '가평베네스트GC',
  '6': '안성베네스트GC',
  '7': '동래베네스트GC',
  '8': '글렌로스GC',
};

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

    // Step 2: Fetch data for each course group
    // 5=가평베네스트, 6=안성베네스트, 7=동래베네스트, 8=글렌로스
    const courseGroups = ['5', '6', '7', '8'];

    const rows: TeeTimeRow[] = [];

    for (const code of courseGroups) {
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
          cc_name: CODE_TO_CLUB[code] ?? '삼성골프',
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
