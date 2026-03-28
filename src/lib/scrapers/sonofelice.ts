import { BaseScraper, TeeTimeRow } from './base';

interface TimeItem {
  dcAmtf: string;
  rsLabel: string;
  fRsvDvNm: string;
  [key: string]: unknown;
}

interface TimeScdResponse {
  times: TimeItem[];
}

const COURSE_CODES: Record<string, string> = {
  '60': '비발디 East',
  '01': '소노펠리체CC 델피노',
  '61': '비발디 West',
};

export default class SonoFeliceScraper extends BaseScraper {
  get clubId(): string {
    return 'sonofelice';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.sonofelicecc.com';
    const loginUrl = `${origin}/doLogin.dp/dmparse.dm`;
    const dataUrl = `${origin}/rsv.selectTimeScd.dp/dmparse.dm`;

    await this.postForm(
      loginUrl,
      {
        cyberId: this.credentials.email,
        cyberPass: this.credentials.pw,
      },
      this.commonHeaders(origin, `${origin}/login.dp/dmparse.dm`),
    );

    const rows: TeeTimeRow[] = [];

    for (const [code, ccName] of Object.entries(COURSE_CODES)) {
      const res = await this.postForm(
        dataUrl,
        {
          fRsvD: this.date,
          fJiyukCd: code,
        },
        this.commonHeaders(origin, `${origin}/rsv.timeScd.dp/dmparse.dm`),
      );

      const json: TimeScdResponse = await res.json();

      for (const item of json.times ?? []) {
        const priceRaw = item.dcAmtf ?? '';
        // Skip entries with price '0'
        if (priceRaw === '0' || priceRaw === '') continue;

        const teeoff = this.formatTime(item.rsLabel ?? '');
        const course = item.fRsvDvNm ?? '';

        if (!teeoff) continue;

        rows.push({
          date: this.dateDash,
          cc_name: ccName,
          teeoff,
          course,
          price: priceRaw,
          event: '',
        });
      }
    }

    return rows;
  }
}
