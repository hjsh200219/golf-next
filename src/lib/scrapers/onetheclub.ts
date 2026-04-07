import { BaseScraper, TeeTimeRow } from './base';

/**
 * 원더클럽(www.onetheclub.com) 스크래퍼.
 *
 * 2026-03 말 사이트 리뉴얼 이후 예약 구조가 본진(자체 운영 CC)과 제휴 CC로 분리되었다.
 * 각 그룹이 별도 엔드포인트를 사용한다.
 *
 * 본진 CC (3곳 확정, 2곳 추가 탐색 필요):
 *   - J53 신라CC / J54 파주CC / J5A 듄스코스
 *   - POST /reservation/ajax/golfTimeList
 *   - 필수 필드: selectMember (회원 고유 ID), memberCd=90, companyCd(빈값),
 *     selCompany/selectCompany=J##, bookgCourse=ALL, workMonth, workDate,
 *     clickTdId=A{YYYYMMDD}, timeOpenYn=N, companyOpenYn=N
 *   - Referer 필수: /reservation/golf?sel=J##&date=YYYYMMDD
 *   - selectMember는 로그인 계정의 고유 번호. 환경변수 ONETHECLUB_MEMBER_ID로 주입.
 *
 * 제휴 CC (9곳):
 *   - P01/P08~P15
 *   - GET /reservation/golfPartner?sel=P## → mainForm 추출
 *   - POST /reservation/ajax/golfPartnerTimeList with mainForm.serialize()
 *
 * 응답 HTML의 각 <li> 안에 <button onclick="golfConfirm(...)">가 있고, onclick 인자에
 * cc_name, 날짜, 시간, 코스명, 가격이 모두 들어있어 onclick 파싱으로 데이터를 뽑는다.
 *
 * 인자 순서가 본진과 제휴에서 다르므로 두 파서를 분리한다.
 * - 본진: golfBtn[0], seqRecruit[1], companyCd[2], companyCdNm[3], bookgDate[4],
 *         bookgTime[5], bookgCourse[6], bookgCourseNm[7], bookgTimeDisp[8],
 *         bookgHole[9], baseAmt[10], dcAmt[11], ...
 * - 제휴: companyCd[0], partnerCd[1], companyCdNm[2], bookgDate[3], bookgTime[4],
 *         bookgCourse[5], bookgCourseNm[6], bookgTimeDisp[7], bookgHole[8],
 *         baseAmt[9], dcAmt[10], ...
 */

interface Partner {
  code: string;
  name: string;
}

interface HomeCourse {
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

const HOME_COURSES: HomeCourse[] = [
  { code: 'J53', name: '신라CC' },
  { code: 'J54', name: '파주CC' },
  { code: 'J5A', name: '듄스코스' },
  // D01은 사용자 입력 alias이고 실제 응답의 companyCd는 J57이며 4개 코스 섹션
  // (바다 레이크/클래식/오션, 하늘+연습장)이 한 응답에 들어 있다.
  // golfConfirm 시그니처는 본진(J##)과 동일하게 처리된다.
  { code: 'D01', name: '클럽72CC' },
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

    // Step 2: 본진 CC (selectMember가 있을 때만 호출)
    const selectMember = process.env.ONETHECLUB_MEMBER_ID || '';
    if (selectMember) {
      for (const course of HOME_COURSES) {
        try {
          const courseRows = await this.scrapeHomeCourse(origin, course, selectMember);
          rows.push(...courseRows);
        } catch (error) {
          console.error(
            `[onetheclub] failed to scrape home ${course.code} (${course.name}):`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    } else {
      console.warn(
        '[onetheclub] ONETHECLUB_MEMBER_ID env is not set — skipping home courses',
      );
    }

    // Step 3: 제휴 CC 9곳 (한 곳이 실패해도 다른 곳은 계속 긁는다)
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

  // --- 본진 CC ---
  private async scrapeHomeCourse(
    origin: string,
    course: HomeCourse,
    selectMember: string,
  ): Promise<TeeTimeRow[]> {
    // 본진 CC 예약 페이지를 먼저 GET해서 세션 쿠키를 확보한다 (Referer로도 사용).
    const pageUrl = `${origin}/reservation/golf?sel=${course.code}&date=${this.date}`;
    await this.fetch(pageUrl, {
      method: 'GET',
      headers: this.commonHeaders(origin, origin),
    });

    // 브라우저가 보내는 것과 동일한 전체 payload를 재현. selectMember와 selCompany/
    // selectCompany=J##이 핵심이고, companyCd는 빈 값으로 둬야 한다.
    const body: Record<string, string> = {
      companyCd: '',
      clickTdId: `A${this.date}`,
      clickTdClass: '',
      workMonth: this.date.slice(0, 6),
      workDate: this.date,
      bookgDate: '',
      bookgTime: '',
      bookgCourse: 'ALL',
      bookgDate2: '',
      bookgTime2: '',
      searchTime: '',
      selfTYn: '',
      temp001: '',
      bookgComment: '',
      temp007: '',
      certSeq: '',
      selectTime: '',
      payGubun: '',
      payAmt: '',
      eventYn: '',
      eventGubun: '',
      cponYn: '',
      tabSessionId: '',
      joinYn: '',
      flagCd: '',
      cartAvlYn: '',
      timeOpenYn: 'N',
      companyOpenYn: 'N',
      selCompany: course.code,
      delegYn: '',
      agencyReservationYn: '',
      eventAmtFix: '',
      eventAmtFix2: '',
      prdNo: '',
      prdNoAmt: '',
      BOOKG_5_IN_YN: '',
      memberCd: '90',
      earlyBirdYn: '',
      earlyBirdAmt: '',
      earlySunbulYn: '',
      earlySunbulAmt: '',
      earlyBirdEventCode: '',
      selectMember,
      selectCompany: course.code,
      agencyBookgName: '',
      agencyHp1: '010',
      agencyHp2: '',
      agencyHp3: '',
      certNoChk: '',
      certNo2Chk: '',
      certNo3Chk: '',
    };

    const res = await this.postForm(
      `${origin}/reservation/ajax/golfTimeList`,
      body,
      {
        ...this.commonHeaders(origin, pageUrl),
        Accept: 'text/html, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
      },
    );
    const html = await res.text();
    const $ = this.parseHtml(html);

    const rows: TeeTimeRow[] = [];

    $('ul.list > li').each((_, li) => {
      const onclick = $(li).find('button[onclick*="golfConfirm"]').attr('onclick') || '';
      const match = onclick.match(/golfConfirm\(([\s\S]*?)\)/);
      if (!match) return;

      // 본진 golfConfirm 시그니처:
      // (golfBtn, seqRecruit, companyCd, companyCdNm, bookgDate, bookgTime,
      //  bookgCourse, bookgCourseNm, bookgTimeDisp, bookgHole, baseAmt, dcAmt, ...)
      const args = [...match[1].matchAll(/'([^']*)'/g)].map((m) => m[1]);
      if (args.length < 12) return;

      const ccName = args[3] || course.name;
      const bookgCourseNm = args[7];
      const bookgTimeDisp = args[8];
      const baseAmt = args[10];
      const dcAmt = args[11];

      if (!bookgTimeDisp || !/^\d{1,2}:\d{2}$/.test(bookgTimeDisp)) return;

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

  // --- 제휴 CC ---
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

      // 제휴 golfConfirm 시그니처:
      // (companyCd, partnerCd, companyCdNm, bookgDate, bookgTime, bookgCourse,
      //  bookgCourseNm, bookgTimeDisp, bookgHole, baseAmt, dcAmt, ...)
      const args = [...match[1].matchAll(/'([^']*)'/g)].map((m) => m[1]);
      if (args.length < 11) return;

      const ccName = args[2] || fallbackName;
      const bookgCourseNm = args[6];
      const bookgTimeDisp = args[7];
      const baseAmt = args[9];
      const dcAmt = args[10];

      if (!bookgTimeDisp || !/^\d{1,2}:\d{2}$/.test(bookgTimeDisp)) return;

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
