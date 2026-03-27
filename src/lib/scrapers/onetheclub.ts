import { BaseScraper, TeeTimeRow } from './base';

export default class OneTheClubScraper extends BaseScraper {
  get clubId(): string {
    return 'onetheclub';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.onetheclub.com';

    // Step 1: Login
    await this.postForm(
      `${origin}/member/loginChk`,
      {
        usrId: this.credentials.id,
        usrPwd: this.credentials.pw,
      },
      this.commonHeaders(origin, `${origin}/member/login`),
    );

    // Step 2: Fetch tee time list
    const res = await this.postForm(
      `${origin}/reservation/ajax/golfTimeList`,
      {
        workDate: this.date,
        selectMember: '90',
        selectCompany: 'ALL',
      },
      {
        ...this.commonHeaders(origin, `${origin}/reservation/golf`),
        Accept: '*/*',
        'X-Requested-With': 'XMLHttpRequest',
      },
    );

    const html = await res.text();
    const $ = this.parseHtml(html);

    const rows: TeeTimeRow[] = [];

    // Collect cc_names from span.company_name
    const ccNames: string[] = [];
    $('span.company_name').each((_, el) => {
      ccNames.push($(el).text().trim());
    });

    // Each ul corresponds to a club section
    $('ul').each((ulIdx, ul) => {
      const ccName = ccNames[ulIdx] || '';

      $(ul).find('li').each((_, li) => {
        const spans = $(li).find('span');
        if (spans.length < 3) return;

        const teeoff = this.formatTime($(spans[0]).text().trim());
        const course = $(spans[1]).text().trim();
        const price = $(spans[2]).text().trim();
        const event = spans.length > 4 ? $(spans[4]).text().trim() : '';

        if (!teeoff) return;

        rows.push({
          date: this.dateDash,
          cc_name: ccName,
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
