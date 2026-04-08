import { describe, it, expect } from 'vitest';
import {
  REGIONS,
  CLUB_REGION_MAP,
  getClubsByRegion,
  getClubsByRegionFromCourses,
  getCoursesByRegionFromCourses,
  getRegionForClub,
  warnUnmappedClubs,
} from '@/lib/constants/regions';

describe('REGIONS', () => {
  it('has 7 regions', () => {
    expect(Object.keys(REGIONS)).toHaveLength(7);
  });

  it('includes all expected regions', () => {
    expect(REGIONS).toHaveProperty('경기북부');
    expect(REGIONS).toHaveProperty('경기남부');
    expect(REGIONS).toHaveProperty('강원');
    expect(REGIONS).toHaveProperty('인천');
    expect(REGIONS).toHaveProperty('충청');
    expect(REGIONS).toHaveProperty('호남');
    expect(REGIONS).toHaveProperty('제주');
  });

  it('each region has label and description', () => {
    for (const region of Object.values(REGIONS)) {
      expect(region.label).toBeTruthy();
      expect(region.description).toBeTruthy();
    }
  });
});

describe('CLUB_REGION_MAP', () => {
  it('maps all active clubs', () => {
    expect(Object.keys(CLUB_REGION_MAP).length).toBeGreaterThanOrEqual(30);
  });

  it('every value is a valid RegionKey', () => {
    const validKeys = Object.keys(REGIONS);
    for (const region of Object.values(CLUB_REGION_MAP)) {
      expect(validKeys).toContain(region);
    }
  });

  it('maps specific clubs correctly', () => {
    expect(CLUB_REGION_MAP['purunsol']).toBe('경기북부');
    expect(CLUB_REGION_MAP['sonofelice']).toBe('강원');
    expect(CLUB_REGION_MAP['orangedunesyj']).toBe('인천');
    expect(CLUB_REGION_MAP['pinestone']).toBe('충청');
    expect(CLUB_REGION_MAP['edenblue']).toBe('경기남부');
    // 좌표 보정으로 강원으로 재분류 (홍천군 북방면)
    expect(CLUB_REGION_MAP['cascadia']).toBe('강원');
  });
});

describe('getClubsByRegionFromCourses', () => {
  const sampleClubs = [
    {
      id: 'onetheclub',
      courses: [
        { region: '인천', is_active: true },
        { region: '강원', is_active: true },
        { region: '호남', is_active: true },
        { region: '제주', is_active: true },
      ],
    },
    {
      id: 'pinestone',
      courses: [{ region: '충청', is_active: true }],
    },
    {
      id: 'inactive_club',
      courses: [{ region: '강원', is_active: false }],
    },
    {
      id: 'no_courses_club', // Falls back to CLUB_REGION_MAP
      courses: [],
    },
  ];

  it('matches a club whose any cc has the queried region', () => {
    const result = getClubsByRegionFromCourses(['호남'], sampleClubs);
    expect(result).toContain('onetheclub');
    expect(result).not.toContain('pinestone');
  });

  it('handles multi-region clubs across all their cc regions', () => {
    expect(getClubsByRegionFromCourses(['인천'], sampleClubs)).toContain('onetheclub');
    expect(getClubsByRegionFromCourses(['강원'], sampleClubs)).toContain('onetheclub');
    expect(getClubsByRegionFromCourses(['제주'], sampleClubs)).toContain('onetheclub');
  });

  it('returns union for multiple regions without duplicates', () => {
    const result = getClubsByRegionFromCourses(['호남', '제주'], sampleClubs);
    expect(new Set(result).size).toBe(result.length);
    expect(result).toContain('onetheclub');
  });

  it('skips inactive courses', () => {
    const result = getClubsByRegionFromCourses(['강원'], [
      { id: 'inactive_club', courses: [{ region: '강원', is_active: false }] },
    ]);
    expect(result).not.toContain('inactive_club');
  });

  it('falls back to CLUB_REGION_MAP when courses have no region info', () => {
    // pinestone is in CLUB_REGION_MAP as '충청'
    const result = getClubsByRegionFromCourses(['충청'], [
      { id: 'pinestone', courses: [] },
    ]);
    expect(result).toContain('pinestone');
  });

  it('returns empty for empty regions input', () => {
    expect(getClubsByRegionFromCourses([], sampleClubs)).toEqual([]);
  });
});

describe('getCoursesByRegionFromCourses', () => {
  const onetheclub = {
    id: 'onetheclub',
    courses: [
      { region: '인천', cc_name: '듄스', is_active: true },
      { region: '인천', cc_name: '클럽72CC 바다 레이크', is_active: true },
      { region: '강원', cc_name: '[제휴]하이원CC', is_active: true },
      { region: '호남', cc_name: '[제휴]해피니스CC', is_active: true },
      { region: '호남', cc_name: '[제휴]파인힐스', is_active: true },
      { region: '제주', cc_name: '[제휴]제주아덴힐', is_active: true },
    ],
  };

  it('returns matching cc_names per club for a single region', () => {
    const { clubIds, ccByClub } = getCoursesByRegionFromCourses(['호남'], [onetheclub]);
    expect(clubIds).toEqual(['onetheclub']);
    expect(ccByClub['onetheclub']).toEqual(
      expect.arrayContaining(['[제휴]해피니스CC', '[제휴]파인힐스']),
    );
    expect(ccByClub['onetheclub']).toHaveLength(2);
    // 인천/강원 cc는 호남 매치에 포함되지 않아야 함
    expect(ccByClub['onetheclub']).not.toContain('듄스');
  });

  it('handles multi-region union (호남 + 제주)', () => {
    const { ccByClub } = getCoursesByRegionFromCourses(['호남', '제주'], [onetheclub]);
    expect(ccByClub['onetheclub']).toHaveLength(3);
    expect(ccByClub['onetheclub']).toEqual(
      expect.arrayContaining(['[제휴]해피니스CC', '[제휴]파인힐스', '[제휴]제주아덴힐']),
    );
  });

  it('omits inactive courses', () => {
    const club = {
      id: 'mixed',
      courses: [
        { region: '강원', cc_name: 'A', is_active: true },
        { region: '강원', cc_name: 'B', is_active: false },
      ],
    };
    const { ccByClub } = getCoursesByRegionFromCourses(['강원'], [club]);
    expect(ccByClub['mixed']).toEqual(['A']);
  });

  it('falls back to CLUB_REGION_MAP without cc restriction', () => {
    // pinestone는 CLUB_REGION_MAP에 충청으로 등록, courses 비어있음
    const { clubIds, ccByClub } = getCoursesByRegionFromCourses(['충청'], [
      { id: 'pinestone', courses: [] },
    ]);
    expect(clubIds).toContain('pinestone');
    // fallback 매칭은 ccByClub에 키를 두지 않아 "전체 cc" 의미
    expect(ccByClub['pinestone']).toBeUndefined();
  });

  it('returns empty match for empty regions', () => {
    const result = getCoursesByRegionFromCourses([], [onetheclub]);
    expect(result.clubIds).toEqual([]);
    expect(result.ccByClub).toEqual({});
  });
});

describe('getClubsByRegion', () => {
  it('returns club IDs for a single region', () => {
    const clubs = getClubsByRegion(['강원']);
    expect(clubs.length).toBeGreaterThan(0);
    clubs.forEach((id) => {
      expect(CLUB_REGION_MAP[id]).toBe('강원');
    });
  });

  it('returns union for multiple regions', () => {
    const clubs = getClubsByRegion(['강원', '인천']);
    clubs.forEach((id) => {
      expect(['강원', '인천']).toContain(CLUB_REGION_MAP[id]);
    });
  });

  it('returns empty array for empty input', () => {
    expect(getClubsByRegion([])).toEqual([]);
  });

  it('returns no duplicates', () => {
    const clubs = getClubsByRegion(['경기북부', '경기남부']);
    expect(new Set(clubs).size).toBe(clubs.length);
  });
});

describe('getRegionForClub', () => {
  it('returns region for known club', () => {
    expect(getRegionForClub('sonofelice')).toBe('강원');
  });

  it('returns null for unknown club', () => {
    expect(getRegionForClub('nonexistent')).toBeNull();
  });
});

describe('warnUnmappedClubs', () => {
  it('returns empty for fully mapped clubs', () => {
    const mappedIds = Object.keys(CLUB_REGION_MAP);
    expect(warnUnmappedClubs(mappedIds)).toEqual([]);
  });

  it('returns unmapped club IDs', () => {
    const ids = [...Object.keys(CLUB_REGION_MAP), 'newclub123'];
    expect(warnUnmappedClubs(ids)).toEqual(['newclub123']);
  });
});
