import { describe, it, expect } from 'vitest';
import { groupByClub, getEmptyClubs } from '@/lib/utils/group';
import type { TeeTime } from '@/lib/types/tee-time';

function makeTeeTime(overrides: Partial<TeeTime> = {}): TeeTime {
  return {
    id: 1,
    club_id: 'test',
    cc_name: 'Test CC',
    date: '2026-03-28',
    teeoff: '08:00',
    course: null,
    price: 100000,
    event: null,
    scraped_at: '2026-03-28T00:00:00Z',
    ...overrides,
  };
}

describe('groupByClub', () => {
  it('returns empty Map for empty array', () => {
    const result = groupByClub([]);
    expect(result.size).toBe(0);
  });

  it('groups items by cc_name', () => {
    const items: TeeTime[] = [
      makeTeeTime({ id: 1, cc_name: 'A골프장', club_id: 'a', teeoff: '09:00' }),
      makeTeeTime({ id: 2, cc_name: 'B골프장', club_id: 'b', teeoff: '08:00' }),
      makeTeeTime({ id: 3, cc_name: 'A골프장', club_id: 'a', teeoff: '07:00' }),
    ];
    const result = groupByClub(items);
    expect(result.size).toBe(2);
    expect(result.get('A골프장')?.length).toBe(2);
    expect(result.get('B골프장')?.length).toBe(1);
  });

  it('sorts items within each group by teeoff ascending', () => {
    const items: TeeTime[] = [
      makeTeeTime({ id: 1, cc_name: 'A골프장', teeoff: '14:00' }),
      makeTeeTime({ id: 2, cc_name: 'A골프장', teeoff: '07:30' }),
      makeTeeTime({ id: 3, cc_name: 'A골프장', teeoff: '10:00' }),
    ];
    const result = groupByClub(items);
    const group = result.get('A골프장')!;
    expect(group[0].teeoff).toBe('07:30');
    expect(group[1].teeoff).toBe('10:00');
    expect(group[2].teeoff).toBe('14:00');
  });

  it('returns groups sorted alphabetically by club name', () => {
    const items: TeeTime[] = [
      makeTeeTime({ id: 1, cc_name: '파인스톤', teeoff: '08:00' }),
      makeTeeTime({ id: 2, cc_name: '가평CC', teeoff: '09:00' }),
      makeTeeTime({ id: 3, cc_name: '레이크우드', teeoff: '10:00' }),
    ];
    const result = groupByClub(items);
    const keys = [...result.keys()];
    expect(keys).toEqual(['가평CC', '레이크우드', '파인스톤']);
  });

  it('handles single club', () => {
    const items: TeeTime[] = [
      makeTeeTime({ id: 1, cc_name: 'Solo CC', teeoff: '08:00' }),
    ];
    const result = groupByClub(items);
    expect(result.size).toBe(1);
    expect(result.get('Solo CC')?.length).toBe(1);
  });
});

describe('getEmptyClubs', () => {
  const NAMES: Record<string, string> = {
    a: 'A골프장',
    b: 'B골프장',
    yangju: '양주CC',
    pinestone: '파인스톤',
  };

  it('returns clubs in the expected set that have no tee-times', () => {
    const teeTimes: TeeTime[] = [
      makeTeeTime({ id: 1, club_id: 'a', cc_name: 'A골프장' }),
    ];
    const result = getEmptyClubs(teeTimes, ['a', 'b', 'yangju'], NAMES);
    expect(result.map((c) => c.clubId)).toEqual(['b', 'yangju']);
  });

  it('returns empty array when every expected club has tee-times', () => {
    const teeTimes: TeeTime[] = [
      makeTeeTime({ id: 1, club_id: 'a', cc_name: 'A골프장' }),
      makeTeeTime({ id: 2, club_id: 'b', cc_name: 'B골프장' }),
    ];
    expect(getEmptyClubs(teeTimes, ['a', 'b'], NAMES)).toEqual([]);
  });

  it('returns all expected clubs when there are no tee-times at all', () => {
    const result = getEmptyClubs([], ['yangju', 'a'], NAMES);
    expect(result.map((c) => c.clubId).sort()).toEqual(['a', 'yangju']);
  });

  it('resolves clubName from the name map', () => {
    const result = getEmptyClubs([], ['yangju'], NAMES);
    expect(result[0]).toEqual({ clubId: 'yangju', clubName: '양주CC' });
  });

  it('falls back to clubId when name is unknown', () => {
    const result = getEmptyClubs([], ['mystery'], NAMES);
    expect(result[0]).toEqual({ clubId: 'mystery', clubName: 'mystery' });
  });

  it('sorts empty clubs by clubName', () => {
    const result = getEmptyClubs([], ['pinestone', 'a', 'yangju'], NAMES);
    expect(result.map((c) => c.clubName)).toEqual(['A골프장', '양주CC', '파인스톤']);
  });

  it('counts a club as present if it has at least one tee-time', () => {
    const teeTimes: TeeTime[] = [
      makeTeeTime({ id: 1, club_id: 'yangju', cc_name: '양주CC' }),
    ];
    expect(getEmptyClubs(teeTimes, ['yangju'], NAMES)).toEqual([]);
  });

  it('does not list a club outside the expected set even if it has no times', () => {
    const result = getEmptyClubs([], ['a'], NAMES);
    expect(result.find((c) => c.clubId === 'b')).toBeUndefined();
  });
});
