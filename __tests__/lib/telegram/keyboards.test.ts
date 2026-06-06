import { describe, it, expect } from 'vitest';
import {
  encodeCb,
  decodeCb,
  clubKeyboard,
  dateKeyboard,
  timeRangeKeyboard,
} from '@/lib/telegram/keyboards';

const NOW = Date.parse('2026-05-31T15:30:00.000Z'); // KST 2026-06-01

describe('encodeCb / decodeCb', () => {
  it('round-trips the date step (club only)', () => {
    const parts = { step: 'date', club: 'golfzoncounty' };
    expect(decodeCb(encodeCb(parts))).toEqual(parts);
  });

  it('round-trips the range step (club + date)', () => {
    const parts = { step: 'range', club: 'golfzoncounty', date: '20260602' };
    expect(decodeCb(encodeCb(parts))).toEqual(parts);
  });

  it('round-trips the done step (club + date + range)', () => {
    const parts = { step: 'done', club: 'golfzoncounty', date: '20260602', range: '0600-0800' };
    expect(decodeCb(encodeCb(parts))).toEqual(parts);
  });

  it('round-trips step with no optional parts', () => {
    const parts = { step: 'start' };
    expect(decodeCb(encodeCb(parts))).toEqual(parts);
  });

  it('keeps every done-step callback_data <= 64 bytes for the longest club id', () => {
    for (const range of [
      '0600-0800',
      '0800-1000',
      '1000-1200',
      '1200-1400',
      '1400-1600',
      '1600-1800',
    ]) {
      const cb = encodeCb({ step: 'done', club: 'golfzoncounty', date: '20260615', range });
      expect(Buffer.byteLength(cb, 'utf8')).toBeLessThanOrEqual(64);
    }
  });
});

describe('clubKeyboard', () => {
  it('strips the [제휴] prefix from button text', () => {
    const kb = clubKeyboard([{ id: 'thecrosby', name: '[제휴] 더크로스비', display_name: null }]);
    expect(kb.inline_keyboard[0][0].text).toBe('더크로스비');
    expect(kb.inline_keyboard[0][0].callback_data).toBe(encodeCb({ step: 'date', club: 'thecrosby' }));
  });

  it('prefers display_name over name', () => {
    const kb = clubKeyboard([{ id: 'yangju', name: '양주CC', display_name: '양주 컨트리클럽' }]);
    expect(kb.inline_keyboard[0][0].text).toBe('양주 컨트리클럽');
  });

  it('appends a (전체) marker for onetheclub', () => {
    const kb = clubKeyboard([{ id: 'onetheclub', name: '원더클럽', display_name: null }]);
    expect(kb.inline_keyboard[0][0].text).toContain('(전체)');
  });

  it('lays out clubs 2 per row', () => {
    const clubs = Array.from({ length: 5 }, (_, i) => ({
      id: `c${i}`,
      name: `club${i}`,
      display_name: null,
    }));
    const kb = clubKeyboard(clubs);
    expect(kb.inline_keyboard.flat()).toHaveLength(5);
    expect(kb.inline_keyboard.every((row) => row.length <= 2)).toBe(true);
    // 5 clubs / 2 per row = 3 rows (2, 2, 1)
    expect(kb.inline_keyboard).toHaveLength(3);
  });
});

describe('dateKeyboard', () => {
  it('yields 30 buttons with range-step callback_data', () => {
    const kb = dateKeyboard('golfzoncounty', NOW);
    const buttons = kb.inline_keyboard.flat();
    expect(buttons).toHaveLength(30);
    expect(decodeCb(buttons[0].callback_data)).toEqual({
      step: 'range',
      club: 'golfzoncounty',
      date: '20260602',
    });
  });

  it('lays out dates 3 per row to keep the list short', () => {
    const kb = dateKeyboard('golfzoncounty', NOW);
    expect(kb.inline_keyboard.every((row) => row.length <= 3)).toBe(true);
    // 30 dates / 3 per row = 10 rows
    expect(kb.inline_keyboard).toHaveLength(10);
  });
});

describe('timeRangeKeyboard', () => {
  it('yields done-step buttons for each fixed bucket', () => {
    const kb = timeRangeKeyboard('golfzoncounty', '20260602');
    const buttons = kb.inline_keyboard.flat();
    expect(buttons).toHaveLength(6);
    expect(decodeCb(buttons[0].callback_data)).toEqual({
      step: 'done',
      club: 'golfzoncounty',
      date: '20260602',
      range: '0600-0800',
    });
  });

  it('lays out ranges 2 per row', () => {
    const kb = timeRangeKeyboard('golfzoncounty', '20260602');
    expect(kb.inline_keyboard.every((row) => row.length <= 2)).toBe(true);
    // 6 buckets / 2 per row = 3 rows
    expect(kb.inline_keyboard).toHaveLength(3);
  });
});
