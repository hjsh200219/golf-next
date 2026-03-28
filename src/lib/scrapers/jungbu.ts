import { BaseScraper, TeeTimeRow } from './base';

export default class JungbuScraper extends BaseScraper {
  get clubId(): string {
    return 'jungbu';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    // The jungbu (akdjbcc.co.kr) site has been rebuilt as a Vue.js SPA.
    // The original Python scraper also had a stub (empty url in jungbu_list).
    // Server-rendered HTML scraping is not possible; requires browser automation.
    // Login endpoint still exists:
    const origin = 'https://www.akdjbcc.co.kr';

    await this.postForm(
      `${origin}/html/member/login_ok.asp`,
      {
        memb_inet_no: this.credentials.id,
        memb_inet_pass: this.credentials.pw,
      },
      this.commonHeaders(origin, `${origin}/html/member/login_ok.asp`),
    );

    // The site returns a Vue SPA shell without server-rendered tee time data.
    // Cannot extract tee times without browser automation (Playwright).
    return [];
  }
}
