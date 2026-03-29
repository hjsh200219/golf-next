export const TIME_RANGES = {
  early: { from: '05:00', to: '07:00', label: '새벽' },
  morning: { from: '07:00', to: '12:00', label: '오전' },
  afternoon: { from: '12:00', to: '17:00', label: '오후' },
  evening: { from: '17:00', to: '21:00', label: '저녁' },
} as const;

export function isTimeInRange(
  time: string,
  from?: string,
  to?: string,
): boolean {
  const t = time.slice(0, 5);
  if (from && t < from) return false;
  if (to && t > to) return false;
  return true;
}

export function formatTime(time: string): string {
  return time.slice(0, 5);
}

export type TimeBandKey = 'early' | 'morning' | 'afternoon';

export const TIME_BANDS: { key: TimeBandKey; label: string; from: string; to: string }[] = [
  { key: 'early', label: '새벽', from: '00:00', to: '06:59' },
  { key: 'morning', label: '오전', from: '07:00', to: '11:59' },
  { key: 'afternoon', label: '오후', from: '12:00', to: '23:59' },
];

export function getTimeBand(teeoff: string): TimeBandKey {
  const t = teeoff.slice(0, 5);
  if (t < '07:00') return 'early';
  if (t < '12:00') return 'morning';
  return 'afternoon';
}
