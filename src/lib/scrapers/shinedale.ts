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

    // 2026-11 layout: one table, th header row [부, 코스, 시간, 정상가요금, 할인가요금, 예약, 프로모션],
    // course per row (no caption). Map by header so inserted columns can't shift teeoff.
    $('table.timeTbl').each((_, table) => {
      const headers = $(table).find('tr').first().find('th').map((_i, th) => $(th).text().trim()).get();
      const timeIdx = this.findColumn(headers, '시간');
      const courseIdx = this.findColumn(headers, '코스');
      const priceIdx = this.findColumn(headers, '할인가요금', '할인가');
      const listPriceIdx = this.findColumn(headers, '정상가요금', '정상가');
      const promoIdx = this.findColumn(headers, '프로모션');
      if (timeIdx < 0 || courseIdx < 0 || (priceIdx < 0 && listPriceIdx < 0)) {
        throw new Error(`shinedale: tee table header not recognized [${headers.join(',')}]`);
      }

      $(table).find('tr').each((__, tr) => {
        const tds = $(tr).find('td');
        if (tds.length < 2) return;

        const teeoff = this.formatTime($(tds[timeIdx]).text().trim());
        if (!this.isTeeTime(teeoff)) return;

        const course = $(tds[courseIdx]).text().trim();
        const event = promoIdx >= 0 ? $(tds[promoIdx]).text().replace(/\s+/g, ' ').trim() : '';
        // 할인가요금 is "-" on days without a discount → use 정상가요금.
        const cell = (i: number) => (i >= 0 ? this.processPrice($(tds[i]).text().trim(), '').price : '');
        const discount = cell(priceIdx);
        const price = /^\d+$/.test(discount) ? discount : cell(listPriceIdx);

        rows.push({
          date: this.dateDash,
          cc_name: '샤인데일',
          teeoff,
          course,
          price,
          event,
        });
      });
    });

    return rows;
  }
}
