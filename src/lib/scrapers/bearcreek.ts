import { BaseScraper, TeeTimeRow } from './base';

export default class BearCreekScraper extends BaseScraper {
  get clubId(): string {
    return 'bearcreek';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.bearcreek.co.kr';

    // NOTE: bearcreek.co.kr is protected by WAF (_fec_sbu) that returns 406 for all
    // non-browser requests. This scraper requires browser automation (Playwright).
    // The Python version (bearcreek_login_new) also used Playwright for this reason.

    // Step 1: GET login page and extract ASP.NET tokens
    const tokens = await this.extractAspNetTokens(`${origin}/Member/Login.aspx`);

    // Step 2: POST login form with tokens
    await this.postForm(
      `${origin}/Member/Login.aspx`,
      {
        __EVENTTARGET: 'ctl00$ContentPlaceHolder1$lbtLogin',
        __VIEWSTATE: tokens.viewState,
        __VIEWSTATEGENERATOR: tokens.viewStateGenerator,
        __EVENTVALIDATION: tokens.eventValidation,
        'ctl00$ContentPlaceHolder1$hdfSaveID': 'MEMNO',
        'ctl00$ContentPlaceHolder1$txtMemNo': this.credentials.id2,
        'ctl00$ContentPlaceHolder1$txtPassword1': this.credentials.pw5,
        'ctl00$ContentPlaceHolder1$ddlMobile1': '010',
        'ctl00$ContentPlaceHolder1$hdfLoginType': 'NO',
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

    $('table.timeTbl').each((_, table) => {
      const courseName = $(table).find('caption').text().trim();
      $(table).find('tr').each((__, tr) => {
        const tds = $(tr).find('td');
        if (tds.length < 2) return;

        const teeoff = this.formatTime($(tds[0]).text().trim());
        const rawPrice = $(tds[1]).text().trim();

        if (!teeoff) return;

        const { price, event } = this.processPrice(rawPrice, '');

        rows.push({
          date: this.dateDash,
          cc_name: '베어크리크',
          teeoff,
          course: courseName,
          price,
          event,
        });
      });
    });

    return rows;
  }
}
