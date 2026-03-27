export function formatPrice(price: number | null | undefined): string {
  if (price == null) return '-';
  return `${price.toLocaleString('ko-KR')}원`;
}

export function parsePrice(str: string): number | null {
  const cleaned = str.trim().replace(/[,원\s]/g, '');
  if (!cleaned || !/^\d+$/.test(cleaned)) return null;
  return parseInt(cleaned, 10);
}

export function isPriceInRange(
  price: number | null,
  min?: number,
  max?: number,
): boolean {
  if (price == null) return true;
  if (min != null && price < min) return false;
  if (max != null && price > max) return false;
  return true;
}
