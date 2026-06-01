import { BaseScraper, TeeTimeRow } from './base';

export default class TpcGolfScraper extends BaseScraper {
  get clubId(): string {
    return 'tpcgolf';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.tpcgolf.co.kr';
    const loginUrl = `${origin}/Member/login_ok.asp`;
    // Site moved the timetable to /Inc/Time_Remaining_TimeTable_amt.asp; the old
    // /Reservation/Inc/TimeTable_Amt.asp now 500s. New endpoint wants a dashed date.
    const dataUrl = `${origin}/Inc/Time_Remaining_TimeTable_amt.asp`;

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
        str_date: this.dateDash,
        str_dd: '1',
      },
      this.commonHeaders(origin, `${origin}/`),
    );

    const html = await this.textWithEncoding(res, 'euc-kr');
    const $ = this.parseHtml(html);
    const rows: TeeTimeRow[] = [];
    const seen = new Set<string>();

    // Response has 4 tabs (All/Lunar/Solar/Stellar); the All tab is the union of
    // the others, so each slot is duplicated. Take only clean 5-cell data rows
    // (a container <tr> over-captures nested cells) and dedupe by course+time.
    $('tr').each((_i, tr) => {
      const tds = $(tr).find('td');
      if (tds.length !== 5) return;

      const course = $(tds[0]).text().trim();
      const teeoff = this.formatTime($(tds[1]).text().trim());
      if (!/^\d{1,2}:\d{2}$/.test(teeoff)) return;

      const dedupeKey = `${course}@${teeoff}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      rows.push({
        date: this.dateDash,
        cc_name: '양평TPC',
        teeoff,
        course,
        price: $(tds[4]).text().trim(),
        event: '',
      });
    });

    return rows;
  }
}
