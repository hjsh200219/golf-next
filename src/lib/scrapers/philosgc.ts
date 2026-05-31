import { BaseScraper, TeeTimeRow } from './base';

export default class PhilosGCScraper extends BaseScraper {
  get clubId(): string {
    return 'philosgc';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.philosgc.com';
    const loginUrl = `${origin}/Member/Login.aspx`;

    // Step 1: GET login page, extract ASP.NET tokens
    const loginTokens = await this.extractAspNetTokens(loginUrl);

    // Step 2: POST login (mobile + pw6, ASP.NET __doPostBack fields)
    await this.postForm(
      loginUrl,
      {
        __EVENTTARGET: 'ctl00$ContentPlaceHolder1$ibtnLogin',
        __EVENTARGUMENT: '',
        __VIEWSTATE: loginTokens.viewState,
        __VIEWSTATEGENERATOR: loginTokens.viewStateGenerator,
        __EVENTVALIDATION: loginTokens.eventValidation,
        'ctl00$ContentPlaceHolder1$txtUserID': this.credentials.mobile,
        'ctl00$ContentPlaceHolder1$txtPassword': this.credentials.pw6,
      },
      this.commonHeaders(origin, loginUrl),
    );

    // Step 3: GET reservation page — collect fresh tokens + hidden state fields.
    const reservationUrl = `${origin}/Reservation/Reservation.aspx?SelectedDate=${this.date}`;
    const pageRes = await this.fetch(reservationUrl, {
      headers: {
        ...this.commonHeaders(origin, `${origin}/Reservation/Reservation.aspx`),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const pageHtml = await pageRes.text();
    const $page = this.parseHtml(pageHtml);

    const fields: Record<string, string> = {};
    $page('input[type=hidden]').each((_, el) => {
      const name = $page(el).attr('name');
      if (name) fields[name] = ($page(el).val() as string) ?? '';
    });

    // Step 4: UpdatePanel async postback that populates the grid for the target date.
    const todayDash = new Date().toISOString().slice(0, 10);
    const body = new URLSearchParams({
      ...fields,
      'ctl00$ContentPlaceHolder1$ScriptManager1':
        'ctl00$ContentPlaceHolder1$ScriptManager1|ctl00$ContentPlaceHolder1$btnUpdate',
      __EVENTTARGET: 'ctl00$ContentPlaceHolder1$btnUpdate',
      __EVENTARGUMENT: '',
      __ASYNCPOST: 'true',
      'ctl00$ContentPlaceHolder1$htbArgs': `LIST|${todayDash}|${this.dateDash}|Y|1`,
    });

    const res = await this.fetch(reservationUrl, {
      method: 'POST',
      headers: {
        ...this.commonHeaders(origin, reservationUrl),
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-MicrosoftAjax': 'Delta=true',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: body.toString(),
      redirect: 'follow',
    });

    const html = await res.text();
    const $ = this.parseHtml(html);

    const rows: TeeTimeRow[] = [];

    // Columns: [0]시간 [1]코스 [2]일반그린피 [3]4인요금 [4]예약 (no event column)
    $('table.reserveTable tr').each((_, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 4) return;

      const rawTeeoff = $(tds[0]).text().trim().replace(/\s/g, '');
      const teeoff = this.formatTime(rawTeeoff.split('(')[0]);
      const course = $(tds[1]).text().trim().split('(')[0].trim();
      const price = $(tds[2]).text().trim();

      if (!/^\d{1,2}:\d{2}$/.test(teeoff)) return;

      rows.push({
        date: this.dateDash,
        cc_name: '필로스CC',
        teeoff,
        course,
        price,
        event: '',
      });
    });

    return rows;
  }
}
