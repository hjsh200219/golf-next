import { BaseScraper, TeeTimeRow } from './base';
import * as crypto from 'crypto';

export default class TaekwangScraper extends BaseScraper {
  get clubId(): string {
    return 'taekwang';
  }

  /** AES-128-CBC encryption matching the site's CryptoJS implementation */
  private encryptData(data: string, secretKey: string): string {
    const key = Buffer.from(secretKey, 'utf-8');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    cipher.setAutoPadding(true);
    const encrypted = Buffer.concat([cipher.update(data, 'utf-8'), cipher.final()]);
    return Buffer.concat([iv, encrypted]).toString('base64');
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.taekwangcc.co.kr';

    // Step 1: GET login page - extract ASP.NET tokens AND secretKey for AES encryption
    const loginPageRes = await this.fetch(`${origin}/Member/Login.aspx`, {
      headers: {
        ...this.commonHeaders(origin, origin),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const loginHtml = await loginPageRes.text();
    const $login = this.parseHtml(loginHtml);

    const viewState = $login('input#__VIEWSTATE').val() as string || '';
    const viewStateGenerator = $login('input#__VIEWSTATEGENERATOR').val() as string || '';
    const eventValidation = $login('input#__EVENTVALIDATION').val() as string || '';
    const secretKey = $login('input#secretKey').val() as string || '';

    // Step 2: POST login with AES-encrypted credentials
    const encId = this.encryptData(this.credentials.id, secretKey);
    const encPwd = this.encryptData(this.credentials.pw4, secretKey);

    await this.postForm(
      `${origin}/Member/Login.aspx`,
      {
        __EVENTTARGET: 'ctl00$contents$lnkBtnLogin',
        __VIEWSTATE: viewState,
        __VIEWSTATEGENERATOR: viewStateGenerator,
        __EVENTVALIDATION: eventValidation,
        rdoDiviceType: 'and',
        'ctl00$contents$txtId': encId,
        'ctl00$contents$txtPwd': encPwd,
      },
      this.commonHeaders(origin, `${origin}/Member/Login.aspx`),
    );

    // Step 3: GET reservation page and extract tokens
    const reservationUrl = `${origin}/Reservation/Reservation.aspx?rcode=p`;
    const resTokens = await this.extractAspNetTokens(reservationUrl);

    const now = new Date();
    const ediDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');

    const today = new Date().toISOString().slice(0, 10);

    // Step 4: POST to fetch tee time data via UpdatePanel
    const res = await this.postForm(
      reservationUrl,
      {
        'ctl00$contents$ScptManager': 'ctl00$contents$ScptManager|ctl00$contents$btnUpd',
        rdoDiviceType: 'and',
        PayMethod: 'CARD',
        GoodsCnt: '1',
        GoodsCl: '0',
        TransType: '0',
        SocketYN: 'Y',
        BuyerName: this.credentials.name,
        BuyerTel: this.credentials.mobile,
        MID: 'taekwang1m',
        EncodeParameters: 'Amt,CardNo,CardExpire,CardPwd',
        EdiDate: ediDate,
        sPGPayYn: 'N',
        strReserveType: '1',
        strClubCode: 'M',
        holeSelect: 'on',
        'ctl00$contents$ddlReserveInwon': '4',
        'ctl00$contents$rblYangdoYN': 'N',
        'ctl00$contents$htbArgs': `LIST|${today}|${this.dateDash}|Y|1|p||`,
        __EVENTTARGET: 'ctl00$contents$btnUpd',
        __VIEWSTATE: resTokens.viewState,
        __VIEWSTATEGENERATOR: resTokens.viewStateGenerator,
        __EVENTVALIDATION: resTokens.eventValidation,
        __ASYNCPOST: 'true',
      },
      this.commonHeaders(origin, reservationUrl),
    );

    const html = await res.text();

    // The response is an ASP.NET UpdatePanel response;
    // extract the <table class="reserve"> from it
    const tableMatch = html.match(/<table class="reserve">([\s\S]*?)<\/table>/);
    if (!tableMatch) return [];

    const tableHtml = `<table class="reserve">${tableMatch[1]}</table>`;
    const $ = this.parseHtml(tableHtml);
    const rows: TeeTimeRow[] = [];

    // Columns: 시간(0), 코스(1), 홀(2), 정상가(3), 할인가(4), 예약(5), 비고(6)
    $('tbody tr').each((_, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 5) return;

      const teeoff = this.formatTime($(tds[0]).text().trim());
      const course = $(tds[1]).text().trim();
      const rawPrice = $(tds[4]).text().trim(); // 할인가 column
      const rawEvent = tds.length >= 7 ? $(tds[6]).text().trim() : '';

      if (!teeoff) return;

      const { price, event } = this.processPrice(rawPrice, rawEvent);

      rows.push({
        date: this.dateDash,
        cc_name: '태광CC',
        teeoff,
        course,
        price,
        event,
      });
    });

    return rows;
  }
}
