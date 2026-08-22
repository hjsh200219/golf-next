import { describe, it, expect } from 'vitest';
import { latestSuccessByClub, filterLiveTeeTimes } from '@/lib/utils/liveness';

const S = '2026-08-22T18:00:16.869+00:00';

describe('latestSuccessByClub', () => {
  it('returns empty map when there are no results', () => {
    expect(latestSuccessByClub([])).toEqual(new Map());
  });

  it('ignores null scraped_at', () => {
    expect(
      latestSuccessByClub([{ club_id: 'laviebell', scraped_at: null }]),
    ).toEqual(new Map());
  });

  it('keeps the latest scraped_at per club', () => {
    const map = latestSuccessByClub([
      { club_id: 'laviebell', scraped_at: '2026-08-22T17:00:00.000+00:00' },
      { club_id: 'yangju', scraped_at: '2026-08-22T18:00:00.000+00:00' },
      { club_id: 'laviebell', scraped_at: S },
    ]);
    expect(map.get('laviebell')).toBe(S);
    expect(map.get('yangju')).toBe('2026-08-22T18:00:00.000+00:00');
  });
});

describe('filterLiveTeeTimes', () => {
  it('keeps only rows restamped at the latest successful scrape (laviebell 올드 12 vs 2)', () => {
    const sByClub = new Map([['laviebell', S]]);
    const rows = [
      { club_id: 'laviebell', teeoff: '06:30', scraped_at: S },
      { club_id: 'laviebell', teeoff: '06:37', scraped_at: '2026-08-19T02:00:20.174+00:00' },
      { club_id: 'laviebell', teeoff: '06:44', scraped_at: '2026-08-18T00:01:14.501+00:00' },
      { club_id: 'laviebell', teeoff: '07:26', scraped_at: '2026-08-21T06:00:16.522+00:00' },
      { club_id: 'laviebell', teeoff: '07:40', scraped_at: '2026-08-19T06:00:18.118+00:00' },
      { club_id: 'laviebell', teeoff: '07:47', scraped_at: '2026-08-20T02:00:18.108+00:00' },
      { club_id: 'laviebell', teeoff: '08:01', scraped_at: '2026-08-21T04:00:15.753+00:00' },
      { club_id: 'laviebell', teeoff: '11:43', scraped_at: '2026-08-17T08:00:21.967+00:00' },
      { club_id: 'laviebell', teeoff: '11:50', scraped_at: '2026-08-18T04:00:21.540+00:00' },
      { club_id: 'laviebell', teeoff: '12:18', scraped_at: '2026-08-20T02:00:18.108+00:00' },
      { club_id: 'laviebell', teeoff: '12:32', scraped_at: '2026-08-20T22:01:21.695+00:00' },
      { club_id: 'laviebell', teeoff: '12:39', scraped_at: S },
    ];

    const live = filterLiveTeeTimes(rows, sByClub);
    expect(live.map((r) => r.teeoff)).toEqual(['06:30', '12:39']);
  });

  it('hides a club with no successful scrape (unknown liveness)', () => {
    const rows = [{ club_id: 'laviebell', teeoff: '06:30', scraped_at: S }];
    expect(filterLiveTeeTimes(rows, new Map())).toEqual([]);
  });

  it('hides frozen rows after a later empty successful scrape', () => {
    const later = '2026-08-22T19:00:00.000+00:00';
    const sByClub = new Map([['laviebell', later]]);
    const rows = [{ club_id: 'laviebell', teeoff: '06:30', scraped_at: S }];
    expect(filterLiveTeeTimes(rows, sByClub)).toEqual([]);
  });

  it('does not drop a different club whose scrape is current', () => {
    const sByClub = new Map([
      ['laviebell', S],
      ['yangju', S],
    ]);
    const rows = [
      { club_id: 'laviebell', teeoff: '06:30', scraped_at: S },
      { club_id: 'yangju', teeoff: '07:00', scraped_at: S },
      { club_id: 'laviebell', teeoff: '06:37', scraped_at: '2026-08-19T02:00:20.174+00:00' },
    ];
    expect(filterLiveTeeTimes(rows, sByClub).map((r) => r.club_id)).toEqual([
      'laviebell',
      'yangju',
    ]);
  });
});
