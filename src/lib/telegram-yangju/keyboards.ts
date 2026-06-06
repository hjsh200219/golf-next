import { chunk, dateKeyboard, timeRangeKeyboard, DATE_COLUMNS, type InlineKeyboardMarkup } from '@/lib/telegram/keyboards';
import { datesInRange } from '@/lib/telegram/time';
import { toYmd } from './slot-format';
import type { SlotInfo } from './resok-payload';

/** Buttons per row for the open-slot (tee-off) reservation list. */
const SLOT_COLUMNS = 2;

/**
 * Reserve-flow callback_data uses the `r|` namespace (distinct from the existing
 * bot's `w|` watch-flow and `x|` delete). Two steps:
 *   pick:    `r|pick|<date>|<time>|<course>|<pointid>`  (slot tapped in /book list)
 *   confirm: `r|confirm|<attemptId>`                    (tap 2 — CAS on attemptId)
 *
 * The pointid here is the DISPLAY-time pointid; the booking re-fetches the
 * tap-time pointid. The idempotency key (in attempts.ts) deliberately excludes
 * pointid, so carrying it here is only for the resOk payload context.
 */
export interface ReserveCbParts {
  step: 'pick' | 'confirm';
  date?: string;
  time?: string;
  course?: string;
  pointid?: string;
  attemptId?: string;
}

export function encodeReserveCb(p: {
  date: string;
  time: string;
  course: string;
  pointid: string;
}): string {
  return `r|pick|${p.date}|${p.time}|${p.course}|${p.pointid}`;
}

export function decodeReserveCb(s: string): ReserveCbParts {
  const seg = s.split('|');
  const step = seg[1] as 'pick' | 'confirm';
  if (step === 'confirm') {
    return { step: 'confirm', attemptId: seg[2] };
  }
  return { step: 'pick', date: seg[2], time: seg[3], course: seg[4], pointid: seg[5] };
}

/** `HHMM` -> `HH:MM` for display. */
function hhmm(t: string): string {
  return `${t.slice(0, 2)}:${t.slice(2, 4)}`;
}

/** One [예약] button per open slot; tapping a slot is reserve-flow step "pick". */
export function slotListKeyboard(slots: SlotInfo[]): InlineKeyboardMarkup {
  const buttons = slots.map((s) => ({
    text: `⛳️ ${hhmm(s.pointtime)} ${s.pointname} (${s.pointhole})`,
    callback_data: encodeReserveCb({
      date: s.pointdate,
      time: s.pointtime,
      course: s.pointname,
      pointid: s.pointid,
    }),
  }));
  return { inline_keyboard: chunk(buttons, SLOT_COLUMNS) };
}

/** Confirm keyboard — the second tap. Carries only the attemptId (CAS target). */
export function confirmKeyboard(attemptId: number): InlineKeyboardMarkup {
  return {
    inline_keyboard: [[{ text: '✅ 예약 확정', callback_data: `r|confirm|${attemptId}` }]],
  };
}

/** Yangju watch-flow date keyboard (yangju-only — no club-selection step). */
export function yangjuDateKeyboard(now?: number): InlineKeyboardMarkup {
  return dateKeyboard('yangju', now);
}

/** Yangju watch-flow time-range keyboard. */
export function yangjuTimeRangeKeyboard(date: string): InlineKeyboardMarkup {
  return timeRangeKeyboard('yangju', date);
}

/**
 * Book-flow date keyboard (`b|date|<YYYYMMDD>`), distinct from the watch-flow `w|`
 * keyboard. `/book` shows this first; tapping a date triggers login + fetchSlots
 * for that date (truth at tap-time), then slotListKeyboard.
 */
export function bookDateKeyboard(now?: number): InlineKeyboardMarkup {
  const buttons = datesInRange(now).map((dateDash) => ({
    text: dateDash,
    callback_data: `b|date|${toYmd(dateDash)}`,
  }));
  return { inline_keyboard: chunk(buttons, DATE_COLUMNS) };
}

export interface BookCbParts {
  step: 'date';
  date: string; // YYYYMMDD
}

export function decodeBookCb(s: string): BookCbParts {
  const seg = s.split('|');
  return { step: 'date', date: seg[2] };
}
