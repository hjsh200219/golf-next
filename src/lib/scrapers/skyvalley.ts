import { BaseScraper, TeeTimeRow } from './base';

const LOGIN_ATTEMPTS = 3;
// 3s between back-to-back logins was enough in every live probe (2026-11-21).
const LOGIN_RETRY_DELAY_MS = 3_000;

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
    // Overlapping logins on the same account get success:"E" and an unauthenticated
    // session whose list is empty — retry after a pause, then fail (never a silent zero).
    let loginMsg = '';
    for (let attempt = 1; attempt <= LOGIN_ATTEMPTS; attempt++) {
      if (attempt > 1) await this.sleep(LOGIN_RETRY_DELAY_MS);
      const loginRes = await this.postForm(
        'https://www.skyvalley.co.kr/skyvalley/member/loginChk',
        {
          companyCd: 'J35',
          usrId: this.credentials.id,
          usrPwd: this.credentials.pw,
        },
        this.commonHeaders(origin, loginReferer),
      );
      const body = (await loginRes.json().catch(() => ({}))) as { success?: string; returnMsg?: string };
      if (body.success === 'S') { loginMsg = ''; break; }
      loginMsg = body.returnMsg ?? `status ${loginRes.status}`;
    }
    if (loginMsg) throw new Error(`skyvalley: login failed after ${LOGIN_ATTEMPTS} attempts — ${loginMsg}`);

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

    // Columns by header: 2026-11 inserted 캐디 after 번호, shifting every index.
    const headers = $('thead th').map((_i, th) => $(th).text().trim()).get();
    const timeIdx = this.findColumn(headers, '시간');
    const courseIdx = this.findColumn(headers, '코스');
    const priceIdx = this.findColumn(headers, '인터넷회원'); // discount; 정상가 is list price

    $('tbody tr').each((_i, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 2) return; // "Tee-off 타임이 없습니다." colspan row
      if (timeIdx < 0 || courseIdx < 0 || priceIdx < 0) {
        throw new Error(`skyvalley: tee table header not recognized [${headers.join(',')}]`);
      }

      const teeoff = this.formatTime($(tds[timeIdx]).text().trim());
      if (!this.isTeeTime(teeoff)) return;
      const course = $(tds[courseIdx]).text().trim();
      const { price, event } = this.processPrice($(tds[priceIdx]).text().trim(), '');

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
