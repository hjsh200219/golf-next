import { BaseScraper, TeeTimeRow } from './base';

export default class PurunsolScraper extends BaseScraper {
  get clubId(): string {
    return 'purunsol';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.purunsol.co.kr';

    // Step 1: Login via JSON (uses pw1!)
    await this.postJson(
      `${origin}/AJAX/member/services.asmx/Login`,
      {
        userID: this.credentials.id,
        userPW: this.credentials.pw1,
      },
      {
        ...this.commonHeaders(origin, `${origin}/Login.aspx`),
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
      },
    );

    // Step 2: Fetch tee time list via JSON
    const res = await this.postJson(
      `${origin}/_AJAX/reservation/services.asmx/GetGolfTimeList`,
      {
        reservationDate: this.date,
        courseType: '',
      },
      {
        ...this.commonHeaders(origin, `${origin}/Reservation/GolfReservation.aspx`),
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
      },
    );

    // Step 3: Response is JSON with .d containing a JSON string which is HTML
    const json = await res.json() as { d?: string };
    if (!json.d) return [];

    let htmlContent: string;
    try {
      const parsed = JSON.parse(json.d) as unknown;
      if (typeof parsed === 'string') {
        htmlContent = parsed;
      } else if (Array.isArray(parsed)) {
        htmlContent = (parsed as string[]).join('');
      } else {
        htmlContent = json.d;
      }
    } catch {
      htmlContent = json.d;
    }

    const $ = this.parseHtml(htmlContent);

    const rows: TeeTimeRow[] = [];

    $('tr').each((_, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 5) return;

      const teeoff = this.formatTime($(tds[1]).text().trim());
      const course = $(tds[2]).text().trim();
      const rawPrice = $(tds[4]).text().trim().replace(/,/g, '');

      if (!teeoff) return;

      rows.push({
        date: this.dateDash,
        cc_name: '푸른솔GC 포천',
        teeoff,
        course,
        price: rawPrice,
        event: '',
      });
    });

    return rows;
  }
}
