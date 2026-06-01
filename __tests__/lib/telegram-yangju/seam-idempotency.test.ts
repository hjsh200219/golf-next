/**
 * SEAM SAFETY PROOF (Phase 5): the same logical yangju slot reached via the ALERT
 * path and via the /book path must produce the SAME idempotency key — otherwise the
 * deterministic-key + CAS + unique-index double-book guard is defeated at the seam
 * between the two entry paths.
 *
 * Alert source: tee_times row → date `YYYY-MM-DD`, teeoff `HH:MM`, course Hangul.
 * /book source:  fetchSlots   → pointdate `YYYYMMDD`, pointtime `HHMM`, pointname Hangul.
 *
 * Both flow into the webhook pick handler as r| callback_data, then into
 * claimAttempt({ date: fmtDate(cbDate), teeTime: cbTime, course }). This test
 * reproduces both producers' callback_data, decodes them, and asserts the resulting
 * idempotency key is byte-identical.
 */
import { describe, it, expect } from 'vitest';
import { encodeReserveCb, decodeReserveCb } from '@/lib/telegram-yangju/keyboards';
import { idempotencyKey } from '@/lib/telegram-yangju/attempts';
// Import the SHIPPED normalizers — the proof must exercise production code, not
// re-implementations, or editing the route could break the seam with a green test.
import { toYmd, toHhmm, fmtDate } from '@/lib/telegram-yangju/slot-format';

function keyFromCb(cbData: string, chatId: number): string {
  const p = decodeReserveCb(cbData);
  return idempotencyKey({ chatId, date: fmtDate(p.date!), teeTime: p.time!, course: p.course! });
}

describe('alert↔/book idempotency-key seam', () => {
  it('same logical slot via both paths → identical idempotency key', () => {
    const chatId = 555;

    // /book path: fetchSlots gives YYYYMMDD + HHMM already
    const bookCb = encodeReserveCb({ date: '20260630', time: '0612', course: '동', pointid: '1' });

    // alert path: tee_times gives YYYY-MM-DD + HH:MM, normalized by the check route
    const alertCb = encodeReserveCb({
      date: toYmd('2026-06-30'),
      time: toHhmm('06:12'),
      course: '동',
      pointid: '',
    });

    expect(keyFromCb(bookCb, chatId)).toBe(keyFromCb(alertCb, chatId));
    expect(keyFromCb(alertCb, chatId)).toBe('555|2026-06-30|0612|동');
  });

  it('also stable when teeoff carries seconds (HH:MM:SS)', () => {
    const alertCb = encodeReserveCb({
      date: toYmd('2026-06-30'),
      time: toHhmm('06:12:00'),
      course: '서',
      pointid: '',
    });
    expect(keyFromCb(alertCb, 1)).toBe('1|2026-06-30|0612|서');
  });
});
