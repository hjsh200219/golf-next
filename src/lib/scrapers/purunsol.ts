import { BaseScraper, TeeTimeRow } from './base';

const GOLF_GBN = '160';

export default class PurunsolScraper extends BaseScraper {
  get clubId(): string {
    return 'purunsol';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.purunsol.co.kr';

    // The tee-time list is public (no login needed; 예약 buttons just link to login).
    // Visit the calendar page first to seed the ASP.NET session cookie.
    await this.fetch(`${origin}/Booking/GolfCalendar.aspx`, {
      headers: { ...this.commonHeaders(origin, origin), Accept: 'text/html' },
    });

    const res = await this.postJson(
      `${origin}/_AJAX/reservation/services.asmx/GetGolfTimeList`,
      {
        p_golfgbn: GOLF_GBN,
        p_date: this.dateDash, // server wants YYYY-MM-DD
        p_cos: '',
        p_rtype: '',
        p_rmode: 'h',
      },
      {
        ...this.commonHeaders(origin, `${origin}/Booking/GolfCalendar.aspx`),
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
      },
    );

    // Response is { d: "<json string>" }; the inner .html is a BARE <tr> fragment.
    const outer = (await res.json()) as { d?: string };
    if (!outer.d) return [];

    let html = '';
    try {
      const inner = JSON.parse(outer.d) as { html?: string };
      html = inner.html ?? '';
    } catch {
      return [];
    }

    // cheerio drops orphan <tr>; wrap in <table> so the rows parse.
    const $ = this.parseHtml(`<table>${html}</table>`);
    const rows: TeeTimeRow[] = [];

    $('tr').each((_, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 5) return;

      const teeoff = this.formatTime($(tds[1]).text().trim());
      if (!/^\d{1,2}:\d{2}$/.test(teeoff)) return;

      const course = $(tds[2]).text().replace(/\s+/g, ' ').trim();
      const price = $(tds[4]).text().replace(/[원,]/g, '').trim();

      rows.push({
        date: this.dateDash,
        cc_name: '푸른솔GC 포천',
        teeoff,
        course,
        price,
        event: '',
      });
    });

    return rows;
  }
}
