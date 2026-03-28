import { describe, it, expect } from 'vitest';
import { groupByClub } from '@/lib/utils/group';
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
