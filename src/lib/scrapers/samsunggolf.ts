import { BaseScraper, TeeTimeRow } from './base';

// Course name → actual golf club name mapping
const COURSE_TO_CLUB: Record<string, string> = {
  '서': '레이크사이드CC',
  '동': '레이크사이드CC',
  '남': '레이크사이드CC',
  '북': '안성베네스트GC',
  'Birch': '가평베네스트GC',
  'Maple': '가평베네스트GC',
  'Pine': '가평베네스트GC',
  'GLRS': '글렌로스GC',
};

function getClubName(course: string): string {
  return COURSE_TO_CLUB[course] ?? '삼성골프';
}

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
    const courseGroups: Record<string, string> = {
      '5': 'group1',
      '6': 'group2',
      '8': 'group3',
    };

    const rows: TeeTimeRow[] = [];

    for (const [code] of Object.entries(courseGroups)) {
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
          cc_name: getClubName(course),
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
