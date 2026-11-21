/**
 * filterByCcRestrictions — 지역 필터가 만든 cc 제한을 티타임에 적용한다.
 * 코스 행(cc_name)과 티타임 cc_name 표기가 달라도(「클럽72CC 바다 레이크」↔「클럽72CC 레이크」,
 * 「[제휴]크리스밸리」↔「크리스밸리」, 「골프존카운티」↔「골프존카운티 송도」) 같은 곳이면 남긴다.
 * 어느 코스 행에도 맞지 않는 cc 는 클럽 단위 지역으로 고른 것이므로 남긴다.
 */
import { describe, it, expect } from 'vitest';
import { filterByCcRestrictions } from '@/lib/utils/ccFilter';
import type { TeeTime } from '@/lib/types/tee-time';

let id = 0;
const tt = (club_id: string, cc_name: string): TeeTime => ({
  id: ++id, club_id, cc_name, date: '2026-11-22', teeoff: '07:00', course: null, price: 100000, event: null,
  scraped_at: '2026-11-21T09:00:00Z',
});
const course = (cc_name: string, region: string) => ({ cc_name, display_name: cc_name, course_name: null, region, is_active: true });

const CLUBS = [
  {
    id: 'onetheclub',
    courses: [
      course('클럽72CC 바다 레이크', '인천'),
      course('클럽72CC 바다 클래식', '인천'),
      course('[제휴]크리스밸리', '경기남부'),
      course('신라CC', '경기남부'),
      course('파주CC', '경기북부'),
    ],
  },
  { id: 'golfzoncounty', courses: [course('골프존카운티', '경기남부')] },
];

const names = (rows: TeeTime[]) => rows.map((t) => `${t.club_id}:${t.cc_name}`);

describe('filterByCcRestrictions', () => {
  it('returns everything when there are no restrictions', () => {
    const rows = [tt('onetheclub', '파주CC')];
    expect(filterByCcRestrictions(rows, {}, CLUBS)).toBe(rows);
  });

  it('matches cc names spelled differently from the course row', () => {
    const rows = [tt('onetheclub', '클럽72CC 레이크'), tt('onetheclub', '클럽72CC 클래식'), tt('onetheclub', '파주CC')];
    const out = filterByCcRestrictions(rows, { onetheclub: ['클럽72CC 바다 레이크', '클럽72CC 바다 클래식'] }, CLUBS);
    expect(names(out)).toEqual(['onetheclub:클럽72CC 레이크', 'onetheclub:클럽72CC 클래식']);
  });

  it('strips the [제휴] prefix when matching', () => {
    const rows = [tt('onetheclub', '크리스밸리'), tt('onetheclub', '파주CC')];
    const out = filterByCcRestrictions(rows, { onetheclub: ['[제휴]크리스밸리', '신라CC'] }, CLUBS);
    expect(names(out)).toEqual(['onetheclub:크리스밸리']);
  });

  it('keeps venues of a club that has a single generic course row', () => {
    const rows = [tt('golfzoncounty', '골프존카운티 송도'), tt('golfzoncounty', '이글몬트')];
    const out = filterByCcRestrictions(rows, { golfzoncounty: ['골프존카운티'] }, CLUBS);
    expect(names(out)).toEqual(['golfzoncounty:골프존카운티 송도', 'golfzoncounty:이글몬트']);
  });

  it('clubs without a restriction pass untouched', () => {
    const rows = [tt('shinedale', '샤인데일')];
    expect(names(filterByCcRestrictions(rows, { onetheclub: ['신라CC'] }, CLUBS))).toEqual(['shinedale:샤인데일']);
  });
});
