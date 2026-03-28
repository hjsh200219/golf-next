import { BaseScraper, TeeTimeRow } from './base';

export default class BearsBestScraper extends BaseScraper {
  get clubId(): string {
    return 'bearsbest';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.bearsbestcheongnagc.com';

    // NOTE: bearsbestcheongnagc.com is protected by WAF (_fec_sbu) that returns 403/406
    // for all non-browser requests. The Python version sent a pre-obtained FECU token.
    // This scraper will return 0 results until browser automation is added.

    // Step 1: Login
    await this.postForm(
      `${origin}/Member/LoginAction`,
      {
        memberId: this.credentials.id,
        memberPw: this.credentials.pw,
      },
      this.commonHeaders(origin, `${origin}/Member/Login`),
    );

    // Step 2: Fetch tee time list (returns HTML)
    const res = await this.postForm(
      `${origin}/Booking/AjaxGetTime`,
      {
        day: this.date,
      },
      this.commonHeaders(origin, `${origin}/Booking`),
    );

    const html = await res.text();
    const $ = this.parseHtml(html);
    const rows: TeeTimeRow[] = [];

    const table = $('table.timeTbl');
    if (table.length) {
      table.find('tbody tr').each((_, tr) => {
        const tds = $(tr).find('td');
        if (tds.length < 5) return;

        const course = $(tds[0]).text().trim();
        const teeoff = this.formatTime($(tds[2]).text().trim());
        const rawPrice = $(tds[3]).text().trim();
        const rawEvent = $(tds[4]).text().trim();

        if (!teeoff) return;

        const { price, event } = this.processPrice(rawPrice, rawEvent);

        rows.push({
          date: this.dateDash,
          cc_name: '베어즈베스트',
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
