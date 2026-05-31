import { BaseScraper, TeeTimeRow } from './base';

export default class TpcGolfScraper extends BaseScraper {
  get clubId(): string {
    return 'tpcgolf';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.tpcgolf.co.kr';
    const loginUrl = `${origin}/Member/login_ok.asp`;
    const dataUrl = `${origin}/Reservation/Inc/TimeTable_Amt.asp`;

    await this.postForm(
      loginUrl,
      {
        mem_id: this.credentials.id,
        usr_pwd: this.credentials.pw,
        id_save: 'on',
      },
      this.commonHeaders(origin, `${origin}/Member/login.asp`),
    );

    const res = await this.postForm(
      dataUrl,
      {
        str_date: this.date,
        str_dd: '1',
      },
      this.commonHeaders(origin, `${origin}/Reservation/TimeTable.asp`),
    );

    const html = await this.textWithEncoding(res, 'euc-kr');
    const $ = this.parseHtml(html);
    const rows: TeeTimeRow[] = [];

    const trList = $('tr').toArray();
    // Skip first 2 header rows
    trList.slice(2).forEach((tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 5) return;

      const course = $(tds[0]).text().trim();
      const teeoff = this.formatTime($(tds[1]).text().trim());
      const priceRaw = $(tds[4]).text().trim();

      if (!teeoff) return;

      rows.push({
        date: this.dateDash,
        cc_name: '양평TPC',
        teeoff,
        course,
        price: priceRaw,
        event: '',
      });
    });

    return rows;
  }
}
