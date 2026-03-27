const KOREAN_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function getKoreanDayOfWeek(date: Date): string {
  return KOREAN_DAYS[date.getDay()];
}

export function formatDateKorean(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = getKoreanDayOfWeek(d);
  return `${month}월 ${day}일 (${dow})`;
}

export function toDateString(input: string | Date): string {
  if (input instanceof Date) {
    const y = input.getFullYear();
    const m = String(input.getMonth() + 1).padStart(2, '0');
    const d = String(input.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (/^\d{8}$/.test(input)) {
    return `${input.slice(0, 4)}-${input.slice(4, 6)}-${input.slice(6, 8)}`;
  }
  return input;
}

export function getNextNDays(n: number, from: Date = new Date()): string[] {
  const days: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    days.push(toDateString(d));
  }
  return days;
}
