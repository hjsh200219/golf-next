import { BaseScraper, TeeTimeRow } from './base';

interface LassaCalendarItem {
  date: string; // YYYYMMDD
  dayOfWeek: string;
  dayType: string;
  teamCount: number;
  openDateTime: string;
  cancellableDateTime: string;
}

interface LassaTeeTime {
  part: string;
  courseName: string;
  time: string; // HHMM
  chargeValue: number;
  remark: string;
  [key: string]: unknown;
}

export default class LassaGcScraper extends BaseScraper {
  get clubId(): string {
    return 'lassagc';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.lassagc.com';

    // Login via new JSON API
    const loginRes = await this.postJson(
      `${origin}/api/open/member/login`,
      {
        username: this.credentials.id,
        password: this.credentials.pw,
        rememberMe: false,
        isAdmin: false,
        isMis: false,
      },
      {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json',
      },
    );

    if (!loginRes.ok) {
      // Login failed — try to get calendar data as fallback (open API)
      const mm = String(this.month).padStart(2, '0');
      const yearMonth = `${this.year}${mm}`;
      const calRes = await this.fetch(`${origin}/api/open/booking/calendar?yearMonth=${yearMonth}`, {
        headers: { 'Accept': 'application/json' },
      });

      if (calRes.ok) {
        const calendar: LassaCalendarItem[] = await calRes.json();
        const dayItem = calendar.find((d) => d.date === this.date);
        if (dayItem && dayItem.teamCount > 0) {
          // Return a single summary row indicating available teams
          return [
            {
              date: this.dateDash,
              cc_name: '라싸GC',
              teeoff: '00:00',
              course: '',
              price: '',
              event: `잔여 ${dayItem.teamCount}팀 (로그인 필요)`,
            },
          ];
        }
      }
      return [];
    }

    // Fetch tee times for all courses (empty course = all)
    const rows: TeeTimeRow[] = [];
    const courses = ['', 'A', 'B', 'C'];

    for (const course of courses) {
      const params = new URLSearchParams({ date: this.date });
      if (course) params.set('course', course);

      const timeRes = await this.fetch(`${origin}/api/booking/time?${params}`, {
        headers: { 'Accept': 'application/json' },
      });

      if (!timeRes.ok) continue;

      const times: LassaTeeTime[] = await timeRes.json();

      for (const t of times) {
        const rawTime = String(t.time ?? '');
        const teeoff = this.formatTime(rawTime);
        if (!teeoff) continue;

        const noCaddy = t.part === '3' ? '노캐디' : '';
        const remark = String(t.remark ?? '');
        const event = [noCaddy, remark].filter(Boolean).join(' ');

        rows.push({
          date: this.dateDash,
          cc_name: '라싸GC',
          teeoff,
          course: String(t.courseName ?? ''),
          price: t.chargeValue ?? '',
          event,
        });
      }

      // If first call (empty course) returns data, no need to try individual courses
      if (course === '' && times.length > 0) break;
      // If first call returns nothing, try individual courses
      if (course === '' && times.length === 0) continue;
    }

    return rows;
  }
}
