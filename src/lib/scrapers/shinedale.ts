import { BaseScraper, TeeTimeRow } from './base';

export default class ShineDaleScraper extends BaseScraper {
  get clubId(): string {
    return 'shinedale';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.shinedale.com';

    // Step 1: GET login page and extract ASP.NET tokens
    const loginTokens = await this.extractAspNetTokens(`${origin}/Member/Login.aspx`);

    // Step 2: POST login form with tokens
    await this.postForm(
      `${origin}/Member/Login.aspx`,
      {
        __EVENTTARGET: 'ctl00$ContentPlaceHolder1$lbtLogin',
        __VIEWSTATE: loginTokens.viewState,
        __VIEWSTATEGENERATOR: loginTokens.viewStateGenerator,
        __EVENTVALIDATION: loginTokens.eventValidation,
        'ctl00$ContentPlaceHolder1$txtLoginID': this.credentials.id,
        'ctl00$ContentPlaceHolder1$txtLoginPassword': this.credentials.pw,
      },
      this.commonHeaders(origin, origin),
    );

    // Step 3: GET reservation page to get fresh tokens
    const reservationUrl = `${origin}/Reservation/Reservation.aspx`;
    const pageRes = await this.fetch(reservationUrl, {
      headers: this.commonHeaders(origin, origin),
    });
    const pageHtml = await pageRes.text();
    const page$ = this.parseHtml(pageHtml);

    const viewState = page$('input#__VIEWSTATE').val() as string || '';
    const viewStateGenerator = page$('input#__VIEWSTATEGENERATOR').val() as string || '';
    const eventValidation = page$('input#__EVENTVALIDATION').val() as string || '';

    // today in YYYY-MM-DD format (matching Python's self.today)
    const today = new Date().toISOString().slice(0, 10);

    // Step 4: POST to get tee time data via UpdatePanel
    const res = await this.postForm(
      reservationUrl,
      {
        'ctl00$ContentPlaceHolder1$ScriptManager1':
          'ctl00$ContentPlaceHolder1$ScriptManager1|ctl00$ContentPlaceHolder1$btnUpdate',
        strReserveType: '1',
        strClubCode: 'M',
        'ctl00$ContentPlaceHolder1$htbArgs': `LIST|${today}|${this.dateDash}|Y|1||`,
        __EVENTTARGET: 'ctl00$ContentPlaceHolder1$btnUpdate',
        __VIEWSTATE: viewState,
        __VIEWSTATEGENERATOR: viewStateGenerator,
        __EVENTVALIDATION: eventValidation,
        __ASYNCPOST: 'true',
      },
      this.commonHeaders(origin, `${origin}/Reservation/Reservation.aspx`),
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
          cc_name: '샤인데일',
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
