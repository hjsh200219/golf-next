import { BaseScraper, TeeTimeRow } from './base';

interface TkTime {
  hourDisplay?: string;
  courseCode?: string;
  discountPrice?: number;
  isLock?: boolean;
}

// courseCode → course name. 11/22/33 = 회원제(M) 코스 조합, 44 = 대중제(P).
const COURSE_MAP: Record<string, string> = {
  '11': '북서',
  '22': '남북',
  '33': '서남',
  '44': '동',
};

// Next.js Server Action ID for /reservation/realtime. This is a build hash — it
// changes when taekwang redeploys, which makes the action stop resolving and the
// endpoint return page RSC instead of data. We throw on that (see scrape()) so a
// stale ID surfaces as a failed scrape, never success:0.
const NEXT_ACTION = '601b7f961286bd7438c6bb4fae29aeae8187f927ab';
const ROUTER_STATE_TREE =
  '%5B%22%22%2C%7B%22children%22%3A%5B%22(routes)%22%2C%7B%22children%22%3A%5B%22reservation%22%2C%7B%22children%22%3A%5B%22realtime%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%2Cfalse%5D%7D%2Cnull%2Cnull%2Cfalse%5D%7D%2Cnull%2Cnull%2Cfalse%5D%7D%2Cnull%2Cnull%2Cfalse%5D%7D%2Cnull%2Cnull%2Ctrue%5D';

export default class TaekwangScraper extends BaseScraper {
  get clubId(): string {
    return 'taekwang';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    // Site rebuilt as a Next.js SPA. Login is POST /api/auth/login with the user's
    // credentials pre-encrypted client-side; the encrypted blobs are static, so we
    // replay them from env (TAEKWANG_ENC_ID / TAEKWANG_ENC_PW) — never the plaintext.
    const origin = 'https://taekwangcc.co.kr';
    const encryptedId = process.env.TAEKWANG_ENC_ID ?? '';
    const encryptedPassword = process.env.TAEKWANG_ENC_PW ?? '';
    if (!encryptedId || !encryptedPassword) {
      throw new Error('taekwang: TAEKWANG_ENC_ID / TAEKWANG_ENC_PW env not set');
    }

    await this.postJson(
      `${origin}/api/auth/login`,
      { encryptedId, encryptedPassword },
      { Origin: origin, Referer: `${origin}/login` },
    );

    // 회원제(M, 3 course combos) + 대중제(P, 동 course) are separate calls.
    const rows: TeeTimeRow[] = [];
    for (const { coGubun, courseCode } of [
      { coGubun: 'M', courseCode: '' },
      { coGubun: 'P', courseCode: '$undefined' },
    ]) {
      rows.push(...(await this.fetchCourse(origin, coGubun, courseCode)));
    }
    return rows;
  }

  private async fetchCourse(origin: string, coGubun: string, courseCode: string): Promise<TeeTimeRow[]> {
    const res = await this.fetch(`${origin}/reservation/realtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        Accept: 'text/x-component',
        Origin: origin,
        Referer: `${origin}/reservation/realtime`,
        'next-action': NEXT_ACTION,
        'next-router-state-tree': ROUTER_STATE_TREE,
      },
      body: JSON.stringify([
        { coGubun, golfLGubun: '160', reserveDate: this.date, courseCode },
        null,
      ]),
    });

    const text = await this.textWithEncoding(res, 'utf-8');

    // RSC stream: the data lives on the `1:` line as { availableTimes: [...] }.
    const line = text.match(/^1:(\{.*"availableTimes".*\})\s*$/m);
    if (!line) {
      // No data line → the next-action ID is stale (build redeployed) and the
      // endpoint returned page RSC. Fail loudly so prod marks the scrape failed.
      throw new Error('taekwang: no availableTimes in response — next-action ID likely stale');
    }

    const payload = JSON.parse(line[1]) as { availableTimes?: TkTime[] };
    const rows: TeeTimeRow[] = [];
    for (const t of payload.availableTimes ?? []) {
      if (t.isLock) continue;
      const teeoff = this.formatTime(t.hourDisplay ?? '');
      if (!/^\d{1,2}:\d{2}$/.test(teeoff)) continue;

      rows.push({
        date: this.dateDash,
        cc_name: '태광CC',
        teeoff,
        course: COURSE_MAP[t.courseCode ?? ''] ?? t.courseCode ?? '',
        price: t.discountPrice ?? '',
        event: '',
      });
    }
    return rows;
  }
}
