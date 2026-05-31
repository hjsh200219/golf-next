import { BaseScraper, TeeTimeRow } from './base';

export default class TheCrosbyScraper extends BaseScraper {
  get clubId(): string {
    return 'thecrosby';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.thecrosbygc.co.kr';

    // Step 1: GET login page and extract ASP.NET tokens
    const tokens = await this.extractAspNetTokens(`${origin}/Member/Login.aspx`);

    // Step 2: POST login form with tokens
    await this.postForm(
      `${origin}/Member/Login.aspx`,
      {
        __EVENTTARGET: 'ctl00$ContentPlaceHolder1$SendLoginButton',
        __EVENTARGUMENT: '',
        __VIEWSTATE: tokens.viewState,
        __VIEWSTATEGENERATOR: tokens.viewStateGenerator,
        __EVENTVALIDATION: tokens.eventValidation,
        rdoDiviceType: 'pc',
        'ctl00$ContentPlaceHolder1$userID': this.credentials.id,
        'ctl00$ContentPlaceHolder1$userPass': this.credentials.pw,
        'ctl00$ContentPlaceHolder1$ReturnURL': '',
      },
      this.commonHeaders(origin, `${origin}/Member/Login.aspx`),
    );

    // Step 3: GET reservation page for the target date
    const res = await this.fetch(
      `${origin}/Reservation/Reservation.aspx?SelectedDate=${this.date}`,
      {
        headers: {
          ...this.commonHeaders(origin, `${origin}/Reservation/Reservation.aspx`),
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      },
    );

    const html = await res.text();
    const $ = this.parseHtml(html);

    const rows: TeeTimeRow[] = [];

    $('table.timeTbl tr').each((_, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 6) return;

      // Table has a leading row-index column:
      // [0]index [1]time [2]course [3]hole [4]인원 [5]price
      const teeoff = this.formatTime($(tds[1]).text().trim());
      const course = $(tds[2]).text().trim();
      const price = $(tds[5]).text().trim();

      if (!/^\d{1,2}:\d{2}$/.test(teeoff)) return;

      rows.push({
        date: this.dateDash,
        cc_name: '더크로스비GC',
        teeoff,
        course,
        price,
        event: '',
      });
    });

    return rows;
  }
}
