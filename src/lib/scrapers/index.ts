import type { BaseScraper, LoginCredentials } from './base';

import GaKoreaScraper from './ga-korea';
import HilldelociScraper from './hilldeloci';
import SkyvalleyScraper from './skyvalley';
import Cc360Scraper from './cc360';
import EdenBlueScraper from './edenblue';
import SouthspringScraper from './southspring';
import FerrumScraper from './ferrum';
import EhsccScraper from './ehscc';
import SunningpointScraper from './sunningpoint';
import LavieBellScraper from './laviebell';
import TpcGolfScraper from './tpcgolf';
import PineStoneScraper from './pinestone';
import LassaGcScraper from './lassagc';
import OrangeDunesYjScraper from './orangedunesyj';
import ThePlayersScraper from './theplayers';
import SonoFeliceScraper from './sonofelice';
import LakewoodScraper from './lakewood';
import RainbowHillsScraper from './rainbowhills';
import MidasScraper from './midas';
import YangjuScraper from './yangju';
import GolfzonCountyScraper from './golfzoncounty';
import OneTheClubScraper from './onetheclub';
import TheCrosbyScraper from './thecrosby';
import SamsungGolfScraper from './samsunggolf';
import PurunsolScraper from './purunsol';
import PhilosgcScraper from './philosgc';
import CascadiaScraper from './cascadia';
import OakValleyScraper from './oakvalley';
import OwnersScraper from './owners';
import RayCastleScraper from './raycastle';
import SeowonScraper from './seowon';
import ShineDaleScraper from './shinedale';
import TaekwangScraper from './taekwang';
import NamchuncheonScraper from './namchuncheon';

type ScraperConstructor = new (date: string, credentials: LoginCredentials) => BaseScraper;

export const SCRAPER_MAP: Record<string, ScraperConstructor> = {
  ga: GaKoreaScraper,
  hilldeloci: HilldelociScraper,
  skyvalley: SkyvalleyScraper,
  cc360: Cc360Scraper,
  edenblue: EdenBlueScraper,
  southspring: SouthspringScraper,
  ferrum: FerrumScraper,
  ehscc: EhsccScraper,
  sunningpoint: SunningpointScraper,
  laviebell: LavieBellScraper,
  tpcgolf: TpcGolfScraper,
  pinestone: PineStoneScraper,
  lassagc: LassaGcScraper,
  orangedunesyj: OrangeDunesYjScraper,
  theplayers: ThePlayersScraper,
  sonofelice: SonoFeliceScraper,
  lakewood: LakewoodScraper,
  rainbowhills: RainbowHillsScraper,
  midas: MidasScraper,
  yangju: YangjuScraper,
  golfzoncounty: GolfzonCountyScraper,
  onetheclub: OneTheClubScraper,
  thecrosby: TheCrosbyScraper,
  samsunggolf: SamsungGolfScraper,
  purunsol: PurunsolScraper,
  philosgc: PhilosgcScraper,
  cascadia: CascadiaScraper,
  oakvalley: OakValleyScraper,
  owners: OwnersScraper,
  raycastle: RayCastleScraper,
  seowon: SeowonScraper,
  shinedale: ShineDaleScraper,
  taekwang: TaekwangScraper,
  namchuncheon_new: NamchuncheonScraper,
};

export function createScraper(
  clubId: string,
  date: string,
  credentials: LoginCredentials,
): BaseScraper | null {
  const Ctor = SCRAPER_MAP[clubId];
  if (!Ctor) return null;
  return new Ctor(date, credentials);
}

export function getActiveScraperIds(): string[] {
  return Object.keys(SCRAPER_MAP);
}
