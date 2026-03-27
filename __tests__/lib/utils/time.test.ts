import { describe, it, expect } from 'vitest';
import { isTimeInRange, formatTime, TIME_RANGES } from '@/lib/utils/time';

describe('isTimeInRange', () => {
  it('returns true when time is in range', () => {
    expect(isTimeInRange('09:30', '06:00', '12:00')).toBe(true);
  });

  it('returns true when no bounds', () => {
    expect(isTimeInRange('15:00')).toBe(true);
  });

  it('returns false when before range', () => {
    expect(isTimeInRange('05:00', '06:00', '12:00')).toBe(false);
  });

  it('returns false when after range', () => {
    expect(isTimeInRange('13:00', '06:00', '12:00')).toBe(false);
  });

  it('handles boundary values', () => {
    expect(isTimeInRange('06:00', '06:00', '12:00')).toBe(true);
    expect(isTimeInRange('12:00', '06:00', '12:00')).toBe(true);
  });
});

describe('formatTime', () => {
  it('formats HH:MM:SS to HH:MM', () => {
    expect(formatTime('09:30:00')).toBe('09:30');
  });

  it('keeps HH:MM as-is', () => {
    expect(formatTime('09:30')).toBe('09:30');
  });
});

describe('TIME_RANGES', () => {
  it('has predefined ranges', () => {
    expect(TIME_RANGES).toHaveProperty('early');
    expect(TIME_RANGES).toHaveProperty('morning');
    expect(TIME_RANGES).toHaveProperty('afternoon');
  });

  it('early range is 05:00-07:00', () => {
    expect(TIME_RANGES.early).toEqual({ from: '05:00', to: '07:00', label: '새벽' });
  });
});
