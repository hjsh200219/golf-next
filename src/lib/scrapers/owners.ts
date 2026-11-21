import { BaseScraper, TeeTimeRow } from './base';
import { SECTIGO_DV_R36 } from './intermediate-certs';

export default class OwnersScraper extends BaseScraper {
  // Matches the golf_clubs row id (seeded as owners_new); /api/scrape dispatches by row id.
  get clubId(): string {
    return 'owners_new';
  }

  // ownersgc.co.kr omits its intermediate certificate → Node fetch fails with
  // UNABLE_TO_VERIFY_LEAF_SIGNATURE (2026-11-21). Supply it and keep verification on.
  protected get extraCaCerts(): string[] {
    return [SECTIGO_DV_R36];
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.ownersgc.co.kr';
    const loginUrl = `${origin}/html/member/login.asp`;

    // Step 1: the phone login form now carries a _csrf token (POST without it → 403).
    const loginPage = await this.fetch(loginUrl, { headers: this.commonHeaders(origin, `${origin}/`) });
    const csrf = String(
      this.parseHtml(await loginPage.text())('form[name="loginForm2"] input[name="_csrf"]').val() ?? '',
    );
    if (!csrf) throw new Error('owners: login form _csrf not found');

    const login = await this.postForm(
      `${origin}/html/member/login_ok1.asp`,
      {
        gopath: '',
        memb_passpw: '',
        phone_no1: '010',
        phone_no2: this.credentials.mobile.slice(3, 7),
        phone_no3: this.credentials.mobile.slice(7, 11),
        memb_inet_pass_re: this.credentials.pw,
        _csrf: csrf,
      },
      this.commonHeaders(origin, loginUrl),
    );
    const loginBody = await login.text();
    if (login.status !== 200 || !loginBody.includes("location.replace('/index.asp')")) {
      throw new Error(`owners: login failed (status ${login.status})`);
    }

    // Step 2: POST the reservation page with the target date (site's Date_Click form).
    const res = await this.postForm(
      `${origin}/html/reservation/reservation_01_01.asp`,
      { book_date_bd: this.date },
      {
        ...this.commonHeaders(origin, `${origin}/html/reservation/reservation_01_01.asp`),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    );
    const html = await this.textWithEncoding(res, 'utf-8');
    if (html.includes('/html/member/login.asp?gopath=')) {
      throw new Error('owners: not logged in — reservation page bounced to login');
    }

    const $ = this.parseHtml(html);
    const tableDiv = $('div.table_con');
    if (!tableDiv.length) throw new Error('owners: div.table_con not found');

    // Course per column from the header row (힐 코스 / 레이크 코스), not by position.
    const headers = $('thead th').map((_i, th) => $(th).text().trim()).get();
    if (!headers.length) throw new Error('owners: course header not found');

    const rows: TeeTimeRow[] = [];
    tableDiv.find('tbody tr').each((_r, tr) => {
      $(tr).children('td').each((col, td) => {
        const course = headers[col];
        if (!course) return;
        $(td).find('div.rev_time').each((_d, div) => {
          const teeoff = this.formatTime($(div).text().trim().split(/\s+/)[0]);
          if (!this.isTeeTime(teeoff)) return;
          const { price, event } = this.processPrice($(div).find('span.time_price').text().trim(), '');
          rows.push({ date: this.dateDash, cc_name: '오너스GC', teeoff, course, price, event });
        });
      });
    });
    return rows;
  }
}
