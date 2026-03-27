export type RegionKey = '경기북부' | '경기남부' | '강원' | '인천' | '충청';

export const REGIONS: Record<RegionKey, { label: string; description: string }> = {
  경기북부: { label: '경기 북부', description: '포천, 양주, 가평, 파주' },
  경기남부: { label: '경기 남부', description: '용인, 안성, 이천, 여주' },
  강원: { label: '강원', description: '춘천, 홍천, 원주, 고성' },
  인천: { label: '인천', description: '영종, 강화, 청라' },
  충청: { label: '충청', description: '당진, 음성' },
};

export const REGION_KEYS = Object.keys(REGIONS) as RegionKey[];

// Static mapping: club_id → RegionKey
// Keys match golf_clubs.id and SCRAPER_MAP keys
export const CLUB_REGION_MAP: Record<string, RegionKey> = {
  // 경기 북부 (포천, 양주, 가평, 남양주, 파주, 양평)
  bearcreek: '경기북부',
  purunsol: '경기북부',
  lassagc: '경기북부',
  philosgc: '경기북부',
  lakewood: '경기북부',
  yangju: '경기북부',
  midas: '경기북부',
  seowon: '경기북부',
  tpcgolf: '경기북부',

  // 경기 남부 (용인, 안성, 이천, 여주)
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

  // 강원 (춘천, 홍천, 원주, 고성)
  sonofelice: '강원',
  oakvalley: '강원',
  theplayers: '강원',
  laviebell: '강원',
  shinedale: '강원',
  hilldeloci: '강원',

  // 인천 (영종, 강화, 청라)
  orangedunesyj: '인천',
  bearsbest: '인천',
  onetheclub: '인천', // 본사 인천, 코스는 전국 분포이나 대표 지역 인천

  // 충청 (충남, 충북)
  pinestone: '충청',
  rainbowhills: '충청',

  // 기타 (DB에 있으나 비활성이 아닌 클럽)
  jungbu: '충청',
  cascadia: '경기남부',
};

export function getClubsByRegion(regions: RegionKey[]): string[] {
  if (regions.length === 0) return [];
  const regionSet = new Set(regions);
  return Object.entries(CLUB_REGION_MAP)
    .filter(([, region]) => regionSet.has(region))
    .map(([clubId]) => clubId);
}

export function getRegionForClub(clubId: string): RegionKey | null {
  return CLUB_REGION_MAP[clubId] ?? null;
}

export function warnUnmappedClubs(activeClubIds: string[]): string[] {
  return activeClubIds.filter((id) => !(id in CLUB_REGION_MAP));
}
