import { BaseScraper, TeeTimeRow } from './base';

export default class SkyValleyScraper extends BaseScraper {
  get clubId(): string {
    return 'skyvalley';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.skyvalley.co.kr';
    const loginReferer = 'https://www.skyvalley.co.kr/skyvalley/member/login';

    // Login — must use the skyvalley path; the J35 login also succeeds via the
    // hilldeloci path but the session is not bound to the skyvalley reservation
    // context, so golfTimeList returns "Tee-off 타임이 없습니다" (silent zero).
    await this.postForm(
      'https://www.skyvalley.co.kr/skyvalley/member/loginChk',
      {
        companyCd: 'J35',
        usrId: this.credentials.id,
        usrPwd: this.credentials.pw,
      },
      this.commonHeaders(origin, loginReferer),
    );

    // Fetch tee time list
    const res = await this.postForm(
      'https://www.skyvalley.co.kr/reservation/ajax/golfTimeList',
      {
        companyCd: 'J35',
        workDate: this.date,
        bookgCourse: 'ALL',
      },
      this.commonHeaders(origin, 'https://www.skyvalley.co.kr/skyvalley/reservation/'),
    );

    const html = await res.text();
    const $ = this.parseHtml(html);
    const rows: TeeTimeRow[] = [];

    $('tbody tr').each((_i, tr) => {
      const tds = $(tr).find('td');
      const teeoff = this.formatTime($(tds[3]).text().trim());
      const course = $(tds[1]).text().trim();
      const rawPrice = $(tds[6]).text().trim(); // 인터넷회원가 (discount); tds[5] is 정상가
      const { price, event } = this.processPrice(rawPrice, '');

      if (!teeoff) return;

      rows.push({
        date: this.dateDash,
        cc_name: '스카이밸리CC',
        teeoff,
        course,
        price,
        event,
      });
    });

    return rows;
  }
}
