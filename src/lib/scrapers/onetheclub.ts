import { BaseScraper, TeeTimeRow } from './base';

/**
 * 원더클럽(www.onetheclub.com)은 여러 제휴 골프장을 묶는 B2B 예약 플랫폼이다.
 *
 * 2026-03 말 사이트 리뉴얼 이후 예약 구조가 달라져 기존 `/reservation/ajax/golfTimeList`
 * 호출 방식은 제휴 CC 목록(9곳)만 반환하고 실제 tee time 데이터는 포함하지 않는다.
 * 각 제휴 CC의 실제 tee time은 다음 2단계 플로우로 긁어야 한다.
 *
 * 1. `GET /reservation/golfPartner?sel={code}&date={YYYYMMDD}` — 세션 쿠키와 mainForm
 *    hidden 필드(30여 개)를 확보한다.
 * 2. `POST /reservation/ajax/golfPartnerTimeList` — mainForm 필드를 그대로 직렬화해서
 *    보내면 해당 CC의 tee time HTML 블록이 반환된다.
 *
 * 응답 HTML의 각 `<li>` 안에는 `<button onclick="golfConfirm(...)">`가 있고, onclick
 * 인자에 cc_name, 날짜, 시간, 코스명, 가격이 모두 포함돼 있어 그것을 파싱한다.
 */

interface Partner {
  code: string;
  name: string;
}

const PARTNERS: Partner[] = [
  { code: 'P01', name: '제주아덴힐' },
  { code: 'P09', name: '해피니스CC' },
  { code: 'P10', name: '하이원CC' },
  { code: 'P11', name: '세이지우드 홍천' },
  { code: 'P12', name: '세이지우드 여수' },
  { code: 'P13', name: '파인힐스' },
  { code: 'P14', name: '사우스스프링스' },
  { code: 'P08', name: '해피니스CC(회원제)' },
  { code: 'P15', name: '크리스밸리' },
];

export default class OneTheClubScraper extends BaseScraper {
  get clubId(): string {
    return 'onetheclub';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://www.onetheclub.com';

    // Step 1: Login (세션 쿠키 획득)
    await this.postForm(
      `${origin}/member/loginChk`,
      {
        usrId: this.credentials.id,
        usrPwd: this.credentials.pw,
      },
      this.commonHeaders(origin, `${origin}/member/login`),
    );

    const rows: TeeTimeRow[] = [];

    // Step 2: 제휴 CC 9곳 순회. 한 곳이 실패해도 다른 곳은 계속 긁는다.
    for (const partner of PARTNERS) {
      try {
        const partnerRows = await this.scrapePartner(origin, partner);
        rows.push(...partnerRows);
      } catch (error) {
        console.error(
          `[onetheclub] failed to scrape partner ${partner.code} (${partner.name}):`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    return rows;
  }

  private async scrapePartner(origin: string, partner: Partner): Promise<TeeTimeRow[]> {
    // 파트너 예약 페이지를 먼저 GET해서 세션/mainForm을 준비한다.
    const pageUrl = `${origin}/reservation/golfPartner?sel=${partner.code}&date=${this.date}`;
    const pageRes = await this.fetch(pageUrl, {
      method: 'GET',
      headers: this.commonHeaders(origin, origin),
    });
    const pageHtml = await pageRes.text();
    const $page = this.parseHtml(pageHtml);

    // mainForm의 모든 input(hidden 포함) 수집 — 서버가 기대하는 30여 개 필드를 그대로 전송해야 한다.
    const mainForm: Record<string, string> = {};
    $page('#mainForm input').each((_, el) => {
      const name = $page(el).attr('name');
      if (!name) return;
      mainForm[name] = $page(el).attr('value') ?? '';
    });

    // tee time 조회에 필요한 값 덮어쓰기
    const body: Record<string, string> = {
      ...mainForm,
      clickTdId: `A${this.date}`,
      workMonth: this.date.slice(0, 6),
      workDate: this.date,
      bookgCourse: 'ALL',
      partnerCd: partner.code,
    };

    const res = await this.postForm(
      `${origin}/reservation/ajax/golfPartnerTimeList`,
      body,
      {
        ...this.commonHeaders(origin, pageUrl),
        Accept: 'text/html, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
      },
    );
    const html = await res.text();
    const $ = this.parseHtml(html);

    const fallbackName = `[제휴]${partner.name}`;
    const rows: TeeTimeRow[] = [];

    $('ul.list > li').each((_, li) => {
      const onclick = $(li).find('button[onclick*="golfConfirm"]').attr('onclick') || '';
      const match = onclick.match(/golfConfirm\(([\s\S]*?)\)/);
      if (!match) return;

      // 인자 파싱: 'J99','P01','[제휴]제주아덴힐','20260410','0644','1','왕이메','06:44','18홀','172,000','115,000',...
      // 숫자에 콤마가 포함될 수 있으므로 split(',') 대신 따옴표 경계로 추출한다.
      const args = [...match[1].matchAll(/'([^']*)'/g)].map((m) => m[1]);
      if (args.length < 11) return;

      const ccName = args[2] || fallbackName;
      const bookgTimeDisp = args[7];        // "06:44"
      const bookgCourseNm = args[6];        // "왕이메"
      const baseAmt = args[9];              // "172,000"
      const dcAmt = args[10];               // "115,000"

      if (!bookgTimeDisp || !/^\d{1,2}:\d{2}$/.test(bookgTimeDisp)) return;

      // 할인가(이벤트가)가 있고 정상가와 다르면 그걸 price로, 정상가는 event 표기에 사용
      const hasDiscount = dcAmt && dcAmt !== '0' && dcAmt !== baseAmt;
      const price = hasDiscount ? `${dcAmt}원` : `${baseAmt}원`;
      const event = hasDiscount ? `정상가 ${baseAmt}원` : '';

      rows.push({
        date: this.dateDash,
        cc_name: ccName,
        teeoff: this.formatTime(bookgTimeDisp),
        course: bookgCourseNm || '',
        price,
        event,
      });
    });

    return rows;
  }
}
