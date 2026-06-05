export type RegionKey = '경기북부' | '경기남부' | '강원' | '인천' | '충청' | '호남' | '제주';

export interface RegionInfo {
  label: string;
  cities: string[];
  description: string;
}

export const REGIONS: Record<RegionKey, RegionInfo> = {
  경기북부: { label: '경기 북부', cities: ['포천', '양주', '가평', '남양주', '파주', '양평'], description: '포천, 양주, 가평, 남양주, 파주, 양평' },
  경기남부: { label: '경기 남부', cities: ['용인', '안성', '이천', '여주'], description: '용인, 안성, 이천, 여주' },
  강원: { label: '강원', cities: ['춘천', '홍천', '원주', '고성', '정선'], description: '춘천, 홍천, 원주, 고성, 정선' },
  인천: { label: '인천', cities: ['영종', '강화', '청라'], description: '영종, 강화, 청라' },
  충청: { label: '충청', cities: ['당진', '음성'], description: '당진, 음성' },
  호남: { label: '호남', cities: ['나주', '여수', '순천'], description: '나주, 여수, 순천' },
  제주: { label: '제주', cities: ['제주'], description: '제주' },
};

export const REGION_KEYS = Object.keys(REGIONS) as RegionKey[];

// Static mapping: club_id → RegionKey
// Keys match golf_clubs.id and SCRAPER_MAP keys
export const CLUB_REGION_MAP: Record<string, RegionKey> = {
  purunsol: '경기북부',
  lassagc: '경기북부',
  philosgc: '경기북부',
  lakewood: '경기북부',
  yangju: '경기북부',
  midas: '경기북부',
  seowon: '경기북부',
  owners: '경기북부',
  tpcgolf: '경기북부',

  ga: '경기남부',
  taekwang: '경기남부',
  samsunggolf: '경기남부',
  sunningpoint: '경기남부',
  ehscc: '경기남부',
  edenblue: '경기남부',
  golfzoncounty: '경기남부',
  southspring: '경기남부',
  raycastle: '경기남부',
  thecrosby: '경기남부',
  cc360: '경기남부',
  skyvalley: '경기남부',
  ferrum: '경기남부',

  sonofelice: '강원',
  oakvalley: '강원',
  theplayers: '강원',
  laviebell: '강원',
  shinedale: '강원',
  hilldeloci: '강원',
  cascadia: '강원',
  namchuncheon_new: '강원',

  orangedunesyj: '인천',
  onetheclub: '인천',

  pinestone: '충청',
  rainbowhills: '충청',
};

export function getClubsByRegion(regions: RegionKey[]): string[] {
  if (regions.length === 0) return [];
  const regionSet = new Set(regions);
  return Object.entries(CLUB_REGION_MAP)
    .filter(([, region]) => regionSet.has(region))
    .map(([clubId]) => clubId);
}

/**
 * cc(course) 단위 region을 기준으로 매칭되는 club_id 목록을 반환한다.
 * 클럽 1개가 여러 region에 걸친 경우(예: onetheclub의 인천/강원/호남/제주 cc)
 * 해당 region에 속한 cc가 하나라도 있으면 그 클럽 전체가 포함된다.
 *
 * cc-level region 정보가 없는 클럽은 정적 CLUB_REGION_MAP으로 fallback.
 *
 * 주의: club_id 단위 결과만 반환하므로, cc 부분집합 정보가 필요하면
 * `getCoursesByRegionFromCourses`를 사용한다.
 */
export function getClubsByRegionFromCourses(
  regions: RegionKey[],
  clubs: Array<{
    id: string;
    courses?: Array<{ region: string | null; is_active: boolean }>;
  }>,
): string[] {
  if (regions.length === 0) return [];
  const regionSet = new Set<string>(regions);
  const matched = new Set<string>();

  for (const club of clubs) {
    const courses = club.courses ?? [];
    let hit = false;
    for (const c of courses) {
      if (!c.is_active) continue;
      if (c.region && regionSet.has(c.region)) {
        hit = true;
        break;
      }
    }
    if (hit) {
      matched.add(club.id);
      continue;
    }
    // Fallback: cc-level region이 없으면 정적 매핑 사용
    const fallback = CLUB_REGION_MAP[club.id];
    if (fallback && regionSet.has(fallback)) {
      matched.add(club.id);
    }
  }

  return Array.from(matched);
}

export interface RegionMatch {
  /** region에 매칭된 club_id 목록 (서버 쿼리용) */
  clubIds: string[];
  /**
   * club_id 별 매칭된 cc_name 목록 (클라이언트 cc-level 필터링용).
   * 어떤 클럽이 cc-level region 정보 없이 fallback 매칭되면 그 클럽은
   * 이 맵에 포함되지 않아 "전체 cc 매칭" 의미가 된다.
   */
  ccByClub: Record<string, string[]>;
}

/**
 * cc 단위 region 매칭을 수행하고 정확한 cc 부분집합도 반환한다.
 * - cc-level region 정보로 매칭된 클럽 → ccByClub에 매칭된 cc_name만 포함
 * - 정적 CLUB_REGION_MAP fallback으로 매칭된 클럽 → ccByClub에 미포함 (=전체 cc)
 *
 * 호출자는 ccByClub을 사용해 tee_times를 추가 필터링한다.
 */
export function getCoursesByRegionFromCourses(
  regions: RegionKey[],
  clubs: Array<{
    id: string;
    courses?: Array<{
      region: string | null;
      cc_name: string | null;
      is_active: boolean;
    }>;
  }>,
): RegionMatch {
  if (regions.length === 0) return { clubIds: [], ccByClub: {} };
  const regionSet = new Set<string>(regions);
  const ccByClub: Record<string, string[]> = {};
  const clubIdSet = new Set<string>();

  for (const club of clubs) {
    const courses = club.courses ?? [];
    const matchedCcs: string[] = [];

    for (const c of courses) {
      if (!c.is_active) continue;
      if (c.region && regionSet.has(c.region) && c.cc_name) {
        matchedCcs.push(c.cc_name);
      }
    }

    if (matchedCcs.length > 0) {
      ccByClub[club.id] = matchedCcs;
      clubIdSet.add(club.id);
      continue;
    }

    // cc-level region이 없는 클럽은 정적 매핑으로 fallback (전체 cc 매칭)
    const fallback = CLUB_REGION_MAP[club.id];
    if (fallback && regionSet.has(fallback)) {
      clubIdSet.add(club.id);
      // ccByClub에 키를 두지 않아 "제한 없음" 의미
    }
  }

  return { clubIds: Array.from(clubIdSet), ccByClub };
}

export function getRegionForClub(clubId: string): RegionKey | null {
  return CLUB_REGION_MAP[clubId] ?? null;
}

export function warnUnmappedClubs(activeClubIds: string[]): string[] {
  return activeClubIds.filter((id) => !(id in CLUB_REGION_MAP));
}
