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
        __VIEWSTATE: tokens.viewState,
        __VIEWSTATEGENERATOR: tokens.viewStateGenerator,
        __EVENTVALIDATION: tokens.eventValidation,
        txtLoginID: this.credentials.id,
        txtLoginPW: this.credentials.pw,
        btnLogin: '',
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
      if (tds.length < 5) return;

      const teeoff = this.formatTime($(tds[0]).text().trim());
      const course = $(tds[1]).text().trim();
      const price = $(tds[4]).text().trim();

      if (!teeoff) return;

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
