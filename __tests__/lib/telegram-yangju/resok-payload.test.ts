import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { jsEscape, buildResOkBody } from '@/lib/telegram-yangju/resok-payload';

describe('jsEscape', () => {
  it('encodes a Korean char as %uXXXX (UTF-16 code unit)', () => {
    expect(jsEscape('서')).toBe('%uC11C');
    expect(jsEscape('동')).toBe('%uB3D9');
  });

  it('encodes multi-char Korean strings code-unit by code-unit', () => {
    expect(jsEscape('서동')).toBe('%uC11C%uB3D9');
  });

  it('leaves ASCII alphanumerics unescaped (escape() semantics)', () => {
    expect(jsEscape('abc123')).toBe('abc123');
  });

  it('escapes space as %20 but not the @*_+-./ set', () => {
    expect(jsEscape('a b')).toBe('a%20b');
    expect(jsEscape('@*_+-./')).toBe('@*_+-./');
  });
});

describe('buildResOkBody', () => {
  it('matches the captured browser request byte-for-byte', () => {
    const capture = readFileSync(
      `${process.cwd()}/__tests__/lib/telegram-yangju/__fixtures__/resok-capture.txt`,
      'utf8',
    );
    // Slot/booker that reconstruct the captured request (동 course, 2026-06-30, 06:12).
    const body = buildResOkBody(
      { pointdate: '20260630', pointid: '1', pointtime: '0612', pointname: '동', pointhole: '18홀' },
      { hand_tel1: '010', hand_tel2: '8002', hand_tel3: '8080' },
    );
    expect(body).toBe(capture);
  });

  it('double-encodes pointname (escape() then form-encode): 동 -> %25uB3D9', () => {
    const body = buildResOkBody(
      { pointdate: '20260630', pointid: '2', pointtime: '0612', pointname: '서', pointhole: '18홀' },
      { hand_tel1: '010', hand_tel2: '8002', hand_tel3: '8080' },
    );
    expect(body).toContain('pointname=%25uC11C'); // escape(서)=%uC11C -> form-encoded %25uC11C
  });

  it('sends golfuser_name empty (verbatim per capture, never filled)', () => {
    const body = buildResOkBody(
      { pointdate: '20260630', pointid: '1', pointtime: '0612', pointname: '동', pointhole: '18홀' },
      { hand_tel1: '010', hand_tel2: '8002', hand_tel3: '8080' },
    );
    expect(body).toContain('golfuser_name=&');
  });

  it('encodes pointhole as UTF-8 (18홀 -> 18%ED%99%80), not euc-kr', () => {
    const body = buildResOkBody(
      { pointdate: '20260630', pointid: '1', pointtime: '0612', pointname: '동', pointhole: '18홀' },
      { hand_tel1: '010', hand_tel2: '8002', hand_tel3: '8080' },
    );
    expect(body).toContain('pointhole=18%ED%99%80');
  });
});
