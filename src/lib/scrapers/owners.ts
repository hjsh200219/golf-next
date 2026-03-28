import { BaseScraper, TeeTimeRow } from './base';

export default class OwnersScraper extends BaseScraper {
  get clubId(): string {
    return 'owners';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.ownersgc.co.kr';

    // Step 1: Login via phone form (login_ok1.asp)
    await this.postForm(
      `${origin}/html/member/login_ok1.asp`,
      {
        phone_no1: '010',
        phone_no2: this.credentials.mobile.slice(3, 7),
        phone_no3: this.credentials.mobile.slice(7, 11),
        memb_inet_pass_re: this.credentials.pw,
      },
      this.commonHeaders(origin, `${origin}/html/member/login.asp`),
    );

    // Step 2: POST to reservation page with target date
    // The site uses form submission (Date_Click) to load tee times for a specific date
    const res = await this.postForm(
      `${origin}/html/reservation/reservation_01_01.asp`,
      {
        book_date_bd: this.date,
      },
      {
        ...this.commonHeaders(origin, `${origin}/html/reservation/reservation_01_01.asp`),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    );

    const html = await this.textWithEncoding(res, 'euc-kr');
    const $ = this.parseHtml(html);
    const rows: TeeTimeRow[] = [];

    // Parse tee time data: div.table_con contains TDs for each course
    // TD 0 = 힐 코스, TD 1 = 레이크 코스
    const tableDiv = $('div.table_con');
    if (tableDiv.length) {
      const tds = tableDiv.find('> table td, td');
      const courseNames = ['힐 코스', '레이크 코스'];

      tds.each((idx, td) => {
        const course = idx < courseNames.length ? courseNames[idx] : null;
        if (!course) return;

        $(td).find('div.rev_time').each((_, div) => {
          const text = $(div).text().trim();
          const teeoff = this.formatTime(text.split(' ')[0]);
          const priceSpan = $(div).find('span.time_price').text().trim();

          if (!teeoff) return;

          const { price, event } = this.processPrice(priceSpan, '');

          rows.push({
            date: this.dateDash,
            cc_name: '오너스GC',
            teeoff,
            course,
            price,
            event,
          });
        });
      });
    }

    return rows;
  }
}
