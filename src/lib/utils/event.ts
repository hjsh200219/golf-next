// Patterns to filter out
const RAW_CODE_PATTERN = /^[A-Z]\d{4}/; // P0015, P0027 등 내부 코드
const GARBAGE_PATTERNS = [/^,+$/, /^[,A-Z]+$/];
const BARE_NUMBER_PATTERN = /^\d{1,3}(,\d{3})*$/; // 125,000 같은 단위 없는 숫자

export function cleanEventText(event: string | null): string | null {
  if (!event) return null;
  const trimmed = event.trim();
  if (!trimmed) return null;

  // 내부 코드 (P0015,,B, / P0029,200000,S,)
  if (RAW_CODE_PATTERN.test(trimmed)) return null;

  // 쓰레기 패턴
  for (const pattern of GARBAGE_PATTERNS) {
    if (pattern.test(trimmed)) return null;
  }

  // 단위 없는 숫자만 (125,000 → price 중복)
  if (BARE_NUMBER_PATTERN.test(trimmed)) return null;

  const cleaned = trimmed.replace(/^,+|,+$/g, '').replace(/,,+/g, ', ').trim();
  if (!cleaned || cleaned === ',') return null;
  return cleaned;
}

export interface EventDisplay {
  type: 'discount' | 'info';
  label: string;
}

/**
 * 이벤트 텍스트를 분석하여 의미 있는 표시 정보를 반환.
 * - price와 동일한 숫자 → null (중복)
 * - 금액 + "원" 포함 & price보다 낮음 → discount (할인가)
 * - 한글 텍스트 → info (프로모션/비고)
 * - 쓰레기 데이터 → null
 */
export function formatEventDisplay(event: string | null, price: number | null): EventDisplay | null {
  const cleaned = cleanEventText(event);
  if (!cleaned) return null;

  // "90,000원" 같은 가격+원 패턴
  const priceMatch = cleaned.match(/^([\d,]+)\s*원$/);
  if (priceMatch) {
    const eventPrice = parseInt(priceMatch[1].replace(/,/g, ''), 10);
    if (price !== null && eventPrice < price) {
      return { type: 'discount', label: cleaned };
    }
    // 같거나 높으면 의미 없음
    return null;
  }

  // 한글이나 의미 있는 텍스트
  return { type: 'info', label: cleaned };
}
