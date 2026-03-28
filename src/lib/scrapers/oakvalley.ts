import { BaseScraper, TeeTimeRow } from './base';

interface OakValleyEntity {
  r_TIME?: string;
  ROUND_TYPE_DESC?: string;
  ACT_GREENFEE?: string;
  [key: string]: unknown;
}

interface OakValleyResponse {
  entitys?: OakValleyEntity[];
  [key: string]: unknown;
}

export default class OakValleyScraper extends BaseScraper {
  get clubId(): string {
    return 'oakvalley';
  }

  private static readonly PT_SIGNATURE =
    'LSe2tvv1aNTHEoOmDAVVocQWBWVPKj4CV6lRhyvK5QZztHpZJW1EHWRMdYpFwmjRcNgFaFzYmCYbWYSR3uw5wiQgEtglNSJUv4+vgoPivE1ni3+oHFWd959Bt7ub+sB+mfnzYLYld4Q8JIZP4sFOiFlFRwITb2coIKsHIgvzNAI=';

  private static readonly GOLF_IDS: Record<string, string> = {
    S1: '성문안CC',
    G2: '오크힐스CC',
    P1: '월송리CC',
  };

  async scrape(): Promise<TeeTimeRow[]> {
    const origin = 'https://reservation.oakvalley.co.kr';
    const rows: TeeTimeRow[] = [];

    // Fetch tee times for all courses (S1, G2, P1) using _oakvalley_get_tee_list approach
    // This endpoint works without login using ptSignature
    for (const [golfId, ccName] of Object.entries(OakValleyScraper.GOLF_IDS)) {
      const courseRows = await this.fetchCourse(origin, golfId, ccName);
      rows.push(...courseRows);
    }

    return rows;
  }

  private async fetchCourse(origin: string, golfId: string, ccName: string): Promise<TeeTimeRow[]> {
    const res = await this.postForm(
      `${origin}/golf.course.pns?getCourse_G`,
      {
        ptSignature: OakValleyScraper.PT_SIGNATURE,
        V_IN_GOLF_ID: golfId,
        V_IN_DATE: this.dateDash,
        V_IN_COURSE: 'O',
        V_IN_ROUND_TYPE: '4',
        ID_REF_CD: '0',
        V_IN_MEMNO: '',
      },
      {
        ...this.commonHeaders(origin, `${origin}/reservation/golf.do`),
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
      },
    );

    const json = (await res.json()) as OakValleyResponse;
    const entities = json.entitys ?? [];
    const rows: TeeTimeRow[] = [];

    for (const item of entities) {
      const teeoff = this.formatTime(String(item.r_TIME ?? ''));
      const course = String(item.ROUND_TYPE_DESC ?? '');
      const rawPrice = String(item.ACT_GREENFEE ?? '');

      if (!teeoff) continue;

      const { price, event } = this.processPrice(rawPrice, '');

      rows.push({
        date: this.dateDash,
        cc_name: ccName,
        teeoff,
        course,
        price,
        event,
      });
    }

    return rows;
  }
}
