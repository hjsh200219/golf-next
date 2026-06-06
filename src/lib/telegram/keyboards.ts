import { datesInRange } from '@/lib/telegram/time';

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface CbParts {
  step: string;
  club?: string;
  date?: string;
  range?: string;
}

interface ClubLike {
  id: string;
  display_name?: string | null;
  name: string;
}

const TIME_BUCKETS = [
  '0600-0800',
  '0800-1000',
  '1000-1200',
  '1200-1400',
  '1400-1600',
  '1600-1800',
] as const;

const AFFILIATE_PREFIX = /^\[제휴\]\s*/;

/** Buttons per row for date keyboards (keeps the date list short to scroll). */
const DATE_COLUMNS = 3;
/** Buttons per row for club and time-range keyboards. */
const CLUB_COLUMNS = 2;
const RANGE_COLUMNS = 2;

/** Split a flat array into rows of at most `size` items. */
export function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

/**
 * Encode callback_data: `w|s=<step>|<club>|<date>|<range>` with trailing empty
 * segments dropped. Round-trip safe with `decodeCb`.
 */
export function encodeCb(parts: CbParts): string {
  const segments = ['w', `s=${parts.step}`, parts.club ?? '', parts.date ?? '', parts.range ?? ''];
  while (segments.length > 2 && !segments[segments.length - 1]) {
    segments.pop();
  }
  return segments.join('|');
}

/** Decode a callback_data string produced by `encodeCb`. */
export function decodeCb(s: string): CbParts {
  const segments = s.split('|');
  const result: CbParts = { step: (segments[1] ?? '').replace(/^s=/, '') };
  if (segments[2]) result.club = segments[2];
  if (segments[3]) result.date = segments[3];
  if (segments[4]) result.range = segments[4];
  return result;
}

/** Build a club-selection keyboard. Picking a club advances to the date step. */
export function clubKeyboard(clubs: ClubLike[]): InlineKeyboardMarkup {
  const buttons = clubs.map((club) => {
    let text = (club.display_name || club.name).replace(AFFILIATE_PREFIX, '');
    if (club.id === 'onetheclub') {
      text += ' (전체)';
    }
    return { text, callback_data: encodeCb({ step: 'date', club: club.id }) };
  });
  return { inline_keyboard: chunk(buttons, CLUB_COLUMNS) };
}

/** Build a date keyboard (D+1..D+14). Picking a date advances to the range step. */
export function dateKeyboard(club: string, now?: number): InlineKeyboardMarkup {
  const buttons = datesInRange(now).map((date) => ({
    text: date,
    callback_data: encodeCb({ step: 'range', club, date: date.replace(/-/g, '') }),
  }));
  return { inline_keyboard: chunk(buttons, DATE_COLUMNS) };
}

/** Build a time-range keyboard. Picking a range completes the watch (done step). */
export function timeRangeKeyboard(club: string, date: string): InlineKeyboardMarkup {
  const buttons = TIME_BUCKETS.map((range) => ({
    text: range,
    callback_data: encodeCb({ step: 'done', club, date, range }),
  }));
  return { inline_keyboard: chunk(buttons, RANGE_COLUMNS) };
}
