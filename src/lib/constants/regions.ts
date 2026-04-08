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
  cascadia: '경기남부',

  sonofelice: '강원',
  oakvalley: '강원',
  theplayers: '강원',
  laviebell: '강원',
  shinedale: '강원',
  hilldeloci: '강원',
  sungmoon: '강원',

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

export function getRegionForClub(clubId: string): RegionKey | null {
  return CLUB_REGION_MAP[clubId] ?? null;
}

export function warnUnmappedClubs(activeClubIds: string[]): string[] {
  return activeClubIds.filter((id) => !(id in CLUB_REGION_MAP));
}
