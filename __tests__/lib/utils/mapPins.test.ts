import { describe, it, expect } from 'vitest';
import { buildClubSpots, formatPinPrice } from '@/lib/utils/mapPins';
import type { TeeTime } from '@/lib/types/tee-time';
import type { ClubWithCourses } from '@/hooks/useClubs';

let id = 0;
const tt = (club_id: string, cc_name: string, teeoff: string, price: number | null): TeeTime => ({
  id: ++id, club_id, cc_name, date: '2026-11-22', teeoff, course: null, price, event: null,
  scraped_at: '2026-11-21T09:00:00Z',
});

type Course = ClubWithCourses['courses'][number];
const course = (club_id: string, cc_name: string, display_name: string, lat: number, lon: number, region = '경기남부'): Course => ({
  id: ++id, club_id, course_name: cc_name, cc_name, display_name, lat, lon, is_active: true, region,
} as unknown as Course);

const club = (id: string, name: string, lat: number | null, lon: number | null, courses: Course[] = []): ClubWithCourses => ({
  id, name, display_name: name, lat, lon, address: null, courses, is_active: true,
} as unknown as ClubWithCourses);

const CLUBS: ClubWithCourses[] = [
  club('shinedale', '샤인데일', 37.7, 127.6, [course('shinedale', '샤인데일', '샤인데일', 37.71, 127.61, '강원')]),
  club('onetheclub', '원더클럽', 37.0, 127.0, [
    course('onetheclub', '클럽72CC 바다 레이크', '클럽72CC 바다 레이크', 37.44, 126.46, '인천'),
    course('onetheclub', '[제휴]크리스밸리', '크리스밸리CC', 37.08, 127.48),
    course('onetheclub', '신라CC', '신라CC', 37.36, 127.70),
  ]),
  club('golfzoncounty', '골프존카운티', 37.1, 127.3, [course('golfzoncounty', '골프존카운티', '골프존카운티', 37.1, 127.3)]),
  club('cc360', '360CC', 37.2, 127.5),
];

describe('buildClubSpots', () => {
  it('one spot per (club, cc) with count, lowest price and the course coordinates', () => {
    const spots = buildClubSpots([
      tt('shinedale', '샤인데일', '06:15', 130000),
      tt('shinedale', '샤인데일', '07:11', 140000),
      tt('shinedale', '샤인데일', '08:40', null),
    ], CLUBS);
    expect(spots).toHaveLength(1);
    expect(spots[0]).toMatchObject({
      clubId: 'shinedale', label: '샤인데일', count: 3, lowestPrice: 130000, lat: 37.71, lon: 127.61, region: '강원',
    });
    expect(spots[0].teeTimes.map((t) => t.teeoff)).toEqual(['06:15', '07:11', '08:40']);
  });

  it('matches onetheclub cc names that differ only in spelling ([제휴], CC, extra tokens)', () => {
    const spots = buildClubSpots([
      tt('onetheclub', '클럽72CC 레이크', '07:00', 150000),
      tt('onetheclub', '크리스밸리', '08:00', 120000),
      tt('onetheclub', '신라CC', '09:00', 160000),
    ], CLUBS);
    const byLabel = Object.fromEntries(spots.map((s) => [s.label, s]));
    expect(byLabel['클럽72CC 레이크']).toMatchObject({ lat: 37.44, lon: 126.46, region: '인천' });
    expect(byLabel['크리스밸리']).toMatchObject({ lat: 37.08, lon: 127.48 });
    expect(byLabel['신라CC']).toMatchObject({ lat: 37.36, lon: 127.70 });
  });

  it('leaves coordinates null when a multi-venue club has no matching course (no wrong pin at the HQ)', () => {
    const spots = buildClubSpots([tt('golfzoncounty', '골프존카운티 송도', '06:10', 109000)], CLUBS);
    expect(spots[0]).toMatchObject({ label: '골프존카운티 송도', lat: null, lon: null });
  });

  it('falls back to club coordinates for a single-venue club without course rows', () => {
    const spots = buildClubSpots([tt('cc360', '360CC', '06:15', 250000)], CLUBS);
    expect(spots[0]).toMatchObject({ lat: 37.2, lon: 127.5 });
  });

  it('sorts by lowest price ascending, unknown prices last', () => {
    const spots = buildClubSpots([
      tt('cc360', '360CC', '06:15', 250000),
      tt('shinedale', '샤인데일', '06:15', 130000),
      tt('onetheclub', '신라CC', '07:00', null),
    ], CLUBS);
    expect(spots.map((s) => s.label)).toEqual(['샤인데일', '360CC', '신라CC']);
  });
});

describe('formatPinPrice', () => {
  it.each([
    [109000, '10.9만'],
    [250000, '25만'],
    [227000, '22.7만'],
    [95000, '9.5만'],
  ])('%i → %s', (price, out) => expect(formatPinPrice(price)).toBe(out));

  it('returns null for unknown price', () => expect(formatPinPrice(null)).toBeNull());
});
