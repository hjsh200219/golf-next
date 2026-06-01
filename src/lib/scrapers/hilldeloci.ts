import { BaseScraper, TeeTimeRow } from './base';

interface HdResveTime {
  timeId?: number;
  timeStatus?: string;
  resveCourse?: string;
  resveTime?: string;
  promtnPrice?: number;
}
interface HdCalender {
  bsnDate?: string;
  resveTimes?: HdResveTime[];
}
interface HdResponse {
  status?: string;
  data?: { calenders?: HdCalender[] };
}

// resveCourse code -> course name (1=Birch, 2=Pine)
const COURSE_MAP: Record<string, string> = { '1': 'Birch', '2': 'Pine' };

export default class HilldelociScraper extends BaseScraper {
  get clubId(): string {
    return 'hilldeloci';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    // Site moved off skyvalley.co.kr to a public JSON API (no login required).
    // courseClass=P returns all open slots (both courses); B is always empty,
    // but query both and union by timeId so a future class flip can't silently zero us.
    const base = 'https://api.hilldeloci.co.kr/v1/reservation-calender';
    const qs = `year=${this.year}&month=${this.month}&date=${this.dateDash}`;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      Accept: 'application/json',
    };

    const seen = new Set<number>();
    const rows: TeeTimeRow[] = [];

    for (const courseClass of ['P', 'B']) {
      const res = await this.fetch(`${base}?${qs}&courseClass=${courseClass}`, { headers });
      const json = (await res.json()) as HdResponse;
      const calender = (json.data?.calenders ?? []).find((c) => c.bsnDate === this.dateDash);

      for (const t of calender?.resveTimes ?? []) {
        if (t.timeStatus !== 'EMPTY') continue;
        if (t.timeId != null && seen.has(t.timeId)) continue;
        if (t.timeId != null) seen.add(t.timeId);

        const teeoff = this.formatTime(t.resveTime ?? '');
        if (!/^\d{1,2}:\d{2}$/.test(teeoff)) continue;

        rows.push({
          date: this.dateDash,
          cc_name: '힐드로사이CC',
          teeoff,
          course: COURSE_MAP[t.resveCourse ?? ''] ?? t.resveCourse ?? '',
          price: t.promtnPrice ?? '',
          event: '',
        });
      }
    }

    return rows;
  }
}
