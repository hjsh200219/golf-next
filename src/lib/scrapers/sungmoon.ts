import { BaseScraper, TeeTimeRow } from './base';

const PT_SIGNATURE =
  'LSe2tvv1aNTHEoOmDAVVocQWBWVPKj4CV6lRhyvK5QZztHpZJW1EHWRMdYpFwmjRcNgFaFzYmCYbWYSR3uw5wiQgEtglNSJUv4+vgoPivE1ni3+oHFWd959Bt7ub+sB+mfnzYLYld4Q8JIZP4sFOiFlFRwITb2coIKsHIgvzNAI=';

interface SungmoonEntity {
  r_TIME?: string;
  ROUND_TYPE_DESC?: string;
  ACT_GREENFEE?: string | number;
  [key: string]: unknown;
}

interface SungmoonResponse {
  entitys?: SungmoonEntity[];
  [key: string]: unknown;
}

export default class SungmoonScraper extends BaseScraper {
  get clubId(): string {
    return 'sungmoon';
  }

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://reservation.oakvalley.co.kr';

    // Step 1: Login
    await this.postForm(
      `${origin}/frontMember.pns?login`,
      {
        usrId: this.credentials.id,
        usrPwd: this.credentials.pw,
      },
      this.commonHeaders(origin, `${origin}/frontMember.pns?loginForm`),
    );

    // Step 2: Fetch course data
    const res = await this.postForm(
      `${origin}/golf.course.pns?getCourse_G`,
      {
        ptSignature: PT_SIGNATURE,
        V_IN_GOLF_ID: 'S1',
        V_IN_DATE: this.dateDash,
        V_IN_COURSE: 'O',
        V_IN_ROUND_TYPE: '4',
        ID_REF_CD: '0',
        V_IN_MEMNO: '',
      },
      {
        ...this.commonHeaders(origin, `${origin}/golf.course.pns?courseMain`),
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
      },
    );

    const json = await res.json() as SungmoonResponse;
    const entitys = json.entitys || [];

    const rows: TeeTimeRow[] = [];

    for (const entity of entitys) {
      const teeoff = this.formatTime(String(entity.r_TIME || ''));
      const course = String(entity.ROUND_TYPE_DESC || '');
      const price = String(entity.ACT_GREENFEE || '');

      if (!teeoff) continue;

      rows.push({
        date: this.dateDash,
        cc_name: '성문안CC',
        teeoff,
        course,
        price,
        event: '',
      });
    }

    return rows;
  }
}
