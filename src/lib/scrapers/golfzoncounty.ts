import { BaseScraper, TeeTimeRow } from './base';

interface GzTeetime {
  bookgTime?: string;
  courseName?: string;
  amt4?: string;
  amt3?: string;
  amt2?: string;
}
interface GzClub {
  golfclubName?: string;
  teetime?: GzTeetime[];
}
interface GzResponse {
  result?: number;
  data?: { reserveDayTeetimeList?: GzClub[] };
}

export default class GolfzonCountyScraper extends BaseScraper {
  get clubId(): string {
    return 'golfzoncounty';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.golfzoncounty.com';

    // Step 1: Login (form-urlencoded) — sets nw_gzFsessionid
    await this.postForm(
      `${origin}/login/userLogin`,
      {
        userId: this.credentials.id,
        userPw: this.credentials.pw1,
        autoLogin: 'Y',
      },
      {
        ...this.commonHeaders(origin, `${origin}/login`),
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
      },
    );

    // Step 2: Fetch tee times across the operator's courses via the JSON API.
    // golfclubSeq: 64=이글몬트, 53=안성H, 2=안성W, 68=송도
    const seqArr = '64,53,2,68';
    const url =
      `${origin}/reserve/multiple/teetime/getList?selectDate=${this.date}` +
      `&selectHoleCnt=&selectPersonCnt=&selectTimeSection=&selectCaddieType=` +
      `&golfclubSeqArr=${encodeURIComponent(seqArr)}`;

    const res = await this.fetch(url, {
      headers: {
        ...this.commonHeaders(origin, `${origin}/reserve/multiple/teetime`),
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    const json = (await res.json()) as GzResponse;
    const list = json.data?.reserveDayTeetimeList ?? [];

    const rows: TeeTimeRow[] = [];
    for (const club of list) {
      const ccName = club.golfclubName ?? '';
      for (const t of club.teetime ?? []) {
        const teeoff = this.formatTime(t.bookgTime ?? '');
        if (!/^\d{1,2}:\d{2}$/.test(teeoff)) continue;

        rows.push({
          date: this.dateDash,
          cc_name: ccName,
          teeoff,
          course: t.courseName ?? '',
          price: t.amt4 ?? t.amt3 ?? t.amt2 ?? '',
          event: '',
        });
      }
    }

    return rows;
  }
}
