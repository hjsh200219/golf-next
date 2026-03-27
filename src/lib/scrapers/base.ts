import { CookieJar } from 'tough-cookie';
import fetchCookie from 'fetch-cookie';
import * as cheerio from 'cheerio';
import type { ScraperResult } from '@/lib/types/tee-time';

export interface ClubConfig {
  id: string;
  name: string;
  url: string;
  origin: string;
  refererLogin: string;
  refererReservation: string;
  loginPath: string;
  reservationPath: string;
}

export interface TeeTimeRow {
  date: string;
  cc_name: string;
  teeoff: string;
  course: string;
  price: string | number;
  event: string;
}

export interface LoginCredentials {
  id: string;
  id2: string;
  email: string;
  pw: string;
  pw1: string;
  pw2: string;
  pw3: string;
  pw4: string;
  pw5: string;
  name: string;
  mobile: string;
}

export abstract class BaseScraper {
  protected cookieJar: CookieJar;
  protected fetch: typeof globalThis.fetch;
  protected date: string; // YYYYMMDD
  protected dateDash: string; // YYYY-MM-DD
  protected year: number;
  protected month: number;
  protected day: number;
  protected credentials: LoginCredentials;

  constructor(date: string, credentials: LoginCredentials) {
    this.cookieJar = new CookieJar();
    this.fetch = fetchCookie(globalThis.fetch, this.cookieJar) as typeof globalThis.fetch;
    this.date = date.replace(/-/g, '');
    this.dateDash = `${this.date.slice(0, 4)}-${this.date.slice(4, 6)}-${this.date.slice(6, 8)}`;
    this.year = parseInt(this.date.slice(0, 4));
    this.month = parseInt(this.date.slice(4, 6));
    this.day = parseInt(this.date.slice(6, 8));
    this.credentials = credentials;
  }

  abstract get clubId(): string;
  abstract scrape(): Promise<TeeTimeRow[]>;

  async run(): Promise<ScraperResult> {
    const start = Date.now();
    try {
      const rows = await this.scrape();
      return {
        clubId: this.clubId,
        ccName: rows[0]?.cc_name ?? '',
        teeTimes: rows.map((r) => ({
          club_id: this.clubId,
          cc_name: r.cc_name,
          date: this.dateDash,
          teeoff: r.teeoff,
          course: r.course || null,
          price: typeof r.price === 'number' ? r.price : this.parsePrice(r.price),
          event: r.event || null,
        })),
        success: true,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        clubId: this.clubId,
        ccName: '',
        teeTimes: [],
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  protected parsePrice(price: string): number | null {
    if (!price) return null;
    const cleaned = price
      .replace(/정상가\s*/g, '')
      .replace(/원/g, '')
      .replace(/,/g, '')
      .replace(/\s/g, '')
      .replace(/27홀예약/g, '')
      .replace(/그린피\s*/g, '')
      .replace(/사전체크인시그린피/g, '')
      .replace(/2인플레이가능\.?/g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? null : num;
  }

  protected processPrice(price: string, event: string): { price: string; event: string } {
    const replaceList = [
      '정상가 ', '원', ',', ' ', '27홀예약', '그린피 ',
      '사전체크인시그린피', '2인플레이가능.', '2인플레이가능',
    ];
    let p = price;
    let e = event;
    for (const r of replaceList) {
      p = p.replace(r, '');
      e = e.replace(r, '');
    }
    return { price: p, event: e };
  }

  protected commonHeaders(origin: string, referer: string): Record<string, string> {
    return {
      'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      Origin: origin,
      Referer: referer,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      'Sec-Ch-Ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    };
  }

  protected async postForm(
    url: string,
    data: Record<string, string>,
    headers?: Record<string, string>,
  ): Promise<Response> {
    const body = new URLSearchParams(data);
    return this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...headers,
      },
      body: body.toString(),
      redirect: 'manual',
    });
  }

  protected async postJson(
    url: string,
    data: unknown,
    headers?: Record<string, string>,
  ): Promise<Response> {
    return this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });
  }

  protected parseHtml(html: string) {
    return cheerio.load(html);
  }

  protected async extractAspNetTokens(url: string): Promise<{
    viewState: string;
    viewStateGenerator: string;
    eventValidation: string;
  }> {
    const res = await this.fetch(url);
    const html = await res.text();
    const $ = this.parseHtml(html);
    return {
      viewState: $('input#__VIEWSTATE').val() as string || '',
      viewStateGenerator: $('input#__VIEWSTATEGENERATOR').val() as string || '',
      eventValidation: $('input#__EVENTVALIDATION').val() as string || '',
    };
  }

  protected async textWithEncoding(res: Response, encoding?: string): Promise<string> {
    if (!encoding || encoding === 'utf-8') {
      return res.text();
    }
    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder(encoding);
    return decoder.decode(buffer);
  }

  protected formatTime(time: string): string {
    const t = time.replace(/\s/g, '');
    if (t.length === 4 && !t.includes(':')) {
      return `${t.slice(0, 2)}:${t.slice(2)}`;
    }
    return t.slice(0, 5);
  }
}
