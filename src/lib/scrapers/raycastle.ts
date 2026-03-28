import { BaseScraper, TeeTimeRow } from './base';

export default class RayCastleScraper extends BaseScraper {
  get clubId(): string {
    return 'raycastle';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.sjraycastle.com';

    // Reservation page is accessible without login
    const res = await this.fetch(
      `${origin}/Golf/Booking/Reservation.aspx?SelectedDate=${this.dateDash}`,
      {
        headers: {
          ...this.commonHeaders(origin, `${origin}/Golf/Booking/Reservation.aspx`),
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      },
    );

    const html = await res.text();
    const $ = this.parseHtml(html);
    const rows: TeeTimeRow[] = [];

    // Structure: timeTbl (course header) followed by timeScroll (tee time data)
    // timeTbl row 0 = course name, row 1 = "1부" "2부" headers
    // timeScroll rows = [time_1bu, time_2bu] columns
    const timeTblTables = $('table.timeTbl').toArray();
    const timeScrollTables = $('table.timeScroll').toArray();

    for (let i = 0; i < timeTblTables.length; i++) {
      // Extract course name from timeTbl first row
      const headerRows = $(timeTblTables[i]).find('tr');
      let courseName = '';
      if (headerRows.length > 0) {
        courseName = $(headerRows[0]).text().trim();
      }

      // Extract tee times from corresponding timeScroll table
      if (i < timeScrollTables.length) {
        $(timeScrollTables[i]).find('tr').each((_, tr) => {
          const tds = $(tr).find('td');
          // Column 0 = 1부 time, Column 1 = 2부 time
          tds.each((colIdx, td) => {
            const timeText = $(td).text().trim();
            if (!timeText || timeText === '') return;

            const teeoff = this.formatTime(timeText);
            if (!teeoff) return;

            rows.push({
              date: this.dateDash,
              cc_name: '레이캐슬 골프&리조트',
              teeoff,
              course: courseName,
              price: '',
              event: '',
            });
          });
        });
      }
    }

    return rows;
  }
}
