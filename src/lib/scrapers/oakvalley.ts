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

/** "290천원" → 290000, "9만5천" → 95000, "100,000" → 100000. */
function parseAmount(raw: string): number | null {
  const s = raw.replace(/[,\s원]/g, '');
  const unit = s.match(/^(?:(\d+)만)?(?:(\d+)천)?$/);
  if (unit && (unit[1] || unit[2])) {
    return Number(unit[1] ?? 0) * 10000 + Number(unit[2] ?? 0) * 1000;
  }
  return /^\d+$/.test(s) ? Number(s) : null;
}

const AMOUNT = '([\\d,]+\\s*(?:천원|천|만(?:\\s*\\d+\\s*천)?)?)';

/**
 * ACT_GREENFEE is a sentence, not a number. Shapes seen live (2026-10-17):
 *   성문안  "3~4인 시 290천원 / 2인 시 340천원"
 *   월송리  "2~4인 시 100,000" | "3~4인 시 120,000 / 2인 시 140,000"
 *   오크힐스 "18홀/월~목/선셋/17:00~17:59/9만5천"
 * The 3~4인 (or 2~4인) figure is the headline price; the 2인 surcharge goes to event.
 */
export function parseOakValleyFee(raw: string): { price: number | null; event: string } {
  const text = raw.trim();
  if (!text) return { price: null, event: '' };

  const party = text.match(new RegExp(`\\d\\s*~\\s*4인\\s*시\\s*${AMOUNT}`));
  if (party) {
    const price = parseAmount(party[1]);
    const pair = text.match(new RegExp(`(?:^|/)\\s*2인\\s*시\\s*${AMOUNT}`));
    const pairPrice = pair ? parseAmount(pair[1]) : null;
    return {
      price,
      event: pairPrice != null ? `2인 시 ${pairPrice.toLocaleString('ko-KR')}원` : '',
    };
  }

  const segments = text.split('/').map((p) => p.trim());
  const price = parseAmount(segments[segments.length - 1]);
  return { price, event: price != null && segments.includes('선셋') ? '선셋' : '' };
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

      const fee = parseOakValleyFee(rawPrice);
      const price = fee.price ?? '';
      const event = fee.event;

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
