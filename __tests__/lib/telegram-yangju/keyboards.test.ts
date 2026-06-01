import { describe, it, expect } from 'vitest';
import {
  encodeReserveCb,
  decodeReserveCb,
  slotListKeyboard,
  confirmKeyboard,
  yangjuDateKeyboard,
  yangjuTimeRangeKeyboard,
} from '@/lib/telegram-yangju/keyboards';

describe('reserve callback_data (r| namespace)', () => {
  it('round-trips date/time/course/pointid', () => {
    const cb = encodeReserveCb({ date: '20260630', time: '0612', course: '서', pointid: '2' });
    expect(decodeReserveCb(cb)).toEqual({ step: 'pick', date: '20260630', time: '0612', course: '서', pointid: '2' });
  });

  it('uses the r| namespace (distinct from w| / x|)', () => {
    const cb = encodeReserveCb({ date: '20260630', time: '0612', course: '서', pointid: '2' });
    expect(cb.startsWith('r|')).toBe(true);
  });

  it('stays under Telegram 64-byte callback_data limit', () => {
    const cb = encodeReserveCb({ date: '20260630', time: '0612', course: '서', pointid: '2' });
    expect(Buffer.byteLength(cb, 'utf8')).toBeLessThan(64);
  });

  it('confirm callback carries only step + attemptId (tap-2 = CAS on attemptId)', () => {
    const k = confirmKeyboard(42);
    const cb = k.inline_keyboard[0][0].callback_data;
    expect(decodeReserveCb(cb)).toMatchObject({ step: 'confirm', attemptId: '42' });
  });
});

describe('slotListKeyboard', () => {
  it('renders one [예약] button per slot with r| pick callback', () => {
    const slots = [
      { pointdate: '20260630', pointid: '2', pointtime: '0612', pointname: '서', pointhole: '18홀' },
      { pointdate: '20260630', pointid: '1', pointtime: '0619', pointname: '동', pointhole: '18홀' },
    ];
    const k = slotListKeyboard(slots);
    expect(k.inline_keyboard).toHaveLength(2);
    expect(k.inline_keyboard[0][0].text).toContain('06:12');
    expect(k.inline_keyboard[0][0].text).toContain('서');
    expect(decodeReserveCb(k.inline_keyboard[0][0].callback_data)).toMatchObject({
      step: 'pick',
      time: '0612',
      course: '서',
      pointid: '2',
    });
  });
});

describe('yangju watch-flow keyboards (no club step)', () => {
  it('dateKeyboard offers D+1..D+14 with date callbacks', () => {
    const k = yangjuDateKeyboard();
    expect(k.inline_keyboard.length).toBe(14);
  });

  it('timeRangeKeyboard offers the standard time buckets', () => {
    const k = yangjuTimeRangeKeyboard('20260630');
    expect(k.inline_keyboard.length).toBeGreaterThan(0);
    expect(k.inline_keyboard[0][0].text).toMatch(/\d{4}-\d{4}/);
  });
});
