import crypto from 'node:crypto';
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

// Next.js Server Action IDs are build hashes that change on every taekwang redeploy
// (the 2026-06 hardcoded ID went stale and every scrape failed for 5 months).
// getAvailableTimesAction is discovered from the realtime page's chunks each run.
// getPublicKeyAction sits in a lazily loaded chunk, so it stays a constant — a stale
// value fails loudly at login ("public key").
const PUBLIC_KEY_ACTION = '0063d04d1469440e5b5626d47834affd9d9b3b36b8';
const TIMES_ACTION_RE =
  /createServerReference\)\("([0-9a-f]{40,44})",[^)]*"getAvailableTimesAction"\)/;
const ROUTER_STATE_TREE =
  '%5B%22%22%2C%7B%22children%22%3A%5B%22(routes)%22%2C%7B%22children%22%3A%5B%22reservation%22%2C%7B%22children%22%3A%5B%22realtime%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%2Cfalse%5D%7D%2Cnull%2Cnull%2Cfalse%5D%7D%2Cnull%2Cnull%2Cfalse%5D%7D%2Cnull%2Cnull%2Cfalse%5D%7D%2Cnull%2Cnull%2Ctrue%5D';

export default class TaekwangScraper extends BaseScraper {
  get clubId(): string {
    return 'taekwang';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    // Site is a Next.js SPA. Login: the browser RSA-OAEP(SHA-256) encrypts id/password
    // with a public key from getPublicKeyAction and POSTs /api/auth/login; the server
    // rotated that key in 2026 (old replayed blobs → "복호화 중 오류"), so encrypt per run.
    const origin = 'https://taekwangcc.co.kr';
    const password = process.env.TAEKWANG_PW ?? '';
    if (!password) throw new Error('taekwang: TAEKWANG_PW env not set');

    const timesAction = await this.discoverTimesAction(origin);
    const publicKey = await this.fetchPublicKey(origin);
    const token = await this.login(origin, publicKey, this.credentials.id, password);

    // 회원제(M, 3 course combos) + 대중제(P, 동 course) are separate calls.
    const rows: TeeTimeRow[] = [];
    for (const { coGubun, courseCode } of [
      { coGubun: 'M', courseCode: '' },
      { coGubun: 'P', courseCode: '$undefined' },
    ]) {
      rows.push(...(await this.fetchCourse(origin, timesAction, token, coGubun, courseCode)));
    }
    return rows;
  }

  private async discoverTimesAction(origin: string): Promise<string> {
    const page = await (await this.fetch(`${origin}/reservation/realtime`)).text();
    const chunks = [...new Set(page.match(/\/_next\/static\/chunks\/[\w.-]+\.js/g) ?? [])];
    for (const path of chunks) {
      const js = await (await this.fetch(`${origin}${path}`)).text();
      const m = js.match(TIMES_ACTION_RE);
      if (m) return m[1];
    }
    throw new Error(`taekwang: getAvailableTimesAction not found in ${chunks.length} page chunks`);
  }

  private async fetchPublicKey(origin: string): Promise<string> {
    const res = await this.fetch(`${origin}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        Accept: 'text/x-component',
        Origin: origin,
        Referer: `${origin}/login`,
        'next-action': PUBLIC_KEY_ACTION,
      },
      body: '[]',
    });
    const line = (await res.text()).match(/^1:(\{.*\})\s*$/m);
    const payload = line ? (JSON.parse(line[1]) as { success?: boolean; publicKey?: string }) : {};
    if (!payload.success || !payload.publicKey) {
      throw new Error(`taekwang: public key action failed (status ${res.status}) — PUBLIC_KEY_ACTION likely stale`);
    }
    return payload.publicKey;
  }

  private async login(origin: string, publicKey: string, id: string, password: string): Promise<string> {
    const enc = (v: string) => crypto.publicEncrypt(
      { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
      Buffer.from(v),
    ).toString('base64');
    const res = await this.postJson(
      `${origin}/api/auth/login`,
      { encryptedId: enc(id), encryptedPassword: enc(password) },
      { Origin: origin, Referer: `${origin}/login` },
    );
    const body = (await res.json().catch(() => ({}))) as {
      success?: boolean; message?: string; token?: string; accessToken?: string;
    };
    const token = body.token ?? body.accessToken;
    if (!res.ok || !body.success || !token) {
      throw new Error(`taekwang: login failed (status ${res.status}) ${body.message ?? ''}`.trim());
    }
    return token;
  }

  private async fetchCourse(
    origin: string,
    action: string,
    token: string,
    coGubun: string,
    courseCode: string,
  ): Promise<TeeTimeRow[]> {
    const res = await this.fetch(`${origin}/reservation/realtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        Accept: 'text/x-component',
        Origin: origin,
        Referer: `${origin}/reservation/realtime`,
        'next-action': action,
        'next-router-state-tree': ROUTER_STATE_TREE,
      },
      body: JSON.stringify([
        { coGubun, golfLGubun: '160', reserveDate: this.date, courseCode },
        token,
      ]),
    });

    const text = await this.textWithEncoding(res, 'utf-8');

    // RSC stream: the data lives on the `1:` line as { availableTimes: [...] }.
    const line = text.match(/^1:(\{.*"availableTimes".*\})\s*$/m);
    if (!line) {
      // No data line → page RSC instead of action data. Fail loudly (never success:0).
      throw new Error(`taekwang: no availableTimes in response (status ${res.status})`);
    }

    const payload = JSON.parse(line[1]) as { availableTimes?: TkTime[]; needsLogin?: boolean };
    if (payload.needsLogin) {
      // Unauthenticated → empty list. An empty "success" would hide every open slot.
      throw new Error('taekwang: needsLogin — token rejected by getAvailableTimesAction');
    }
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
