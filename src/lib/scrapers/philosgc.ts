import { BaseScraper, TeeTimeRow } from './base';

export default class PhilosGCScraper extends BaseScraper {
  get clubId(): string {
    return 'philosgc';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.philosgc.com';

    // Step 1: GET login page and extract ASP.NET tokens
    const loginTokens = await this.extractAspNetTokens(`${origin}/login/login.asp`);

    // Step 2: POST login form with tokens
    await this.postForm(
      `${origin}/login/login.asp`,
      {
        __VIEWSTATE: loginTokens.viewState,
        __VIEWSTATEGENERATOR: loginTokens.viewStateGenerator,
        __EVENTVALIDATION: loginTokens.eventValidation,
        txtID: this.credentials.id,
        txtPW: this.credentials.pw,
      },
      this.commonHeaders(origin, `${origin}/login/login.asp`),
    );

    // Step 3: GET reservation page for the target date (after login)
    const reservationUrl = `${origin}/Reservation/Reservation.aspx?SelectedDate=${this.date}`;
    const res = await this.fetch(reservationUrl, {
      headers: {
        ...this.commonHeaders(origin, `${origin}/Reservation/Reservation.aspx`),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const html = await res.text();
    const $ = this.parseHtml(html);

    const rows: TeeTimeRow[] = [];

    $('table.reserveTable tr').each((_, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 4) return;

      // td[0]=teeoff (strip spaces, split by '(' to remove extra info)
      const rawTeeoff = $(tds[0]).text().trim().replace(/\s/g, '');
      const teeoff = this.formatTime(rawTeeoff.split('(')[0]);
      const course = $(tds[1]).text().trim();
      const price = $(tds[2]).text().trim();
      const event = $(tds[3]).text().trim();

      if (!teeoff) return;

      rows.push({
        date: this.dateDash,
        cc_name: '필로스CC',
        teeoff,
        course,
        price,
        event,
      });
    });

    return rows;
  }
}
