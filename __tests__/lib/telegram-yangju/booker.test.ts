import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getBooker, getYangjuCreds } from '@/lib/telegram-yangju/booker';

const ENV_KEYS = ['YANGJU_BOOKER_TEL', 'YANGJU_ID', 'YANGJU_PW'] as const;

const saved: Record<string, string | undefined> = {};
beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('getBooker', () => {
  it('splits an 11-digit tel into 010 / 4 / 4 (no name — golfuser_name sent empty)', () => {
    process.env.YANGJU_BOOKER_TEL = '01012345678';
    const b = getBooker();
    expect(b).toEqual({ hand_tel1: '010', hand_tel2: '1234', hand_tel3: '5678' });
  });

  it('strips non-digits (hyphens) from the tel before splitting', () => {
    process.env.YANGJU_BOOKER_TEL = '010-8002-8080';
    const b = getBooker();
    expect(b.hand_tel1).toBe('010');
    expect(b.hand_tel2).toBe('8002');
    expect(b.hand_tel3).toBe('8080');
  });

  it('throws when tel is missing', () => {
    delete process.env.YANGJU_BOOKER_TEL;
    expect(() => getBooker()).toThrow();
  });

  it('throws when tel is not 11 digits', () => {
    process.env.YANGJU_BOOKER_TEL = '0101234';
    expect(() => getBooker()).toThrow();
  });
});

describe('getYangjuCreds', () => {
  it('reads YANGJU_ID / YANGJU_PW', () => {
    process.env.YANGJU_ID = 'abc123';
    process.env.YANGJU_PW = 'pw456';
    expect(getYangjuCreds()).toEqual({ id: 'abc123', pw: 'pw456' });
  });

  it('throws when id missing (pw present)', () => {
    delete process.env.YANGJU_ID;
    process.env.YANGJU_PW = 'pw456';
    expect(() => getYangjuCreds()).toThrow(/YANGJU_ID/);
  });

  it('throws when pw missing (id present)', () => {
    process.env.YANGJU_ID = 'abc123';
    delete process.env.YANGJU_PW;
    expect(() => getYangjuCreds()).toThrow(/YANGJU_PW/);
  });
});
