import { getActiveScraperIds } from '@/lib/scrapers';
import { REGIONS, REGION_KEYS } from '@/lib/constants/regions';

const SITE_NAME = '골프 예약 조회 | GolfShin';
const SITE_URL = 'https://golfshin.com';

function getScraperCount(): number {
  return getActiveScraperIds().length;
}

function getSiteDescription(): string {
  return `실시간 골프장 티타임 예약 조회 — ${getScraperCount()}개+ 골프장, 매시간 업데이트`;
}

function getRegionCitySummary(): string {
  return REGION_KEYS
    .map((key) => `${REGIONS[key].label}(${REGIONS[key].description})`)
    .join(', ');
}

export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: getSiteDescription(),
    inLanguage: 'ko',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function getWebApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${SITE_URL}/#app`,
    name: SITE_NAME,
    url: SITE_URL,
    description: getSiteDescription(),
    applicationCategory: 'SportsApplication',
    operatingSystem: 'Web',
    inLanguage: 'ko',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    featureList: `실시간 티타임 조회 (매시간 업데이트), 날짜·시간대·가격 필터링, ${REGION_KEYS.join('·')} ${REGION_KEYS.length}개 권역, 골프장별 48시간 날씨 예보, 즐겨찾기 기능`,
  };
}

export function getFAQPageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/#faq`,
    mainEntity: [
      {
        '@type': 'Question',
        name: 'GolfShin은 어떤 서비스인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `GolfShin(골프신)은 한국 수도권 및 강원·충청 지역 ${getScraperCount()}개 이상 골프장의 티타임 예약 가능 현황을 실시간으로 조회할 수 있는 무료 웹 서비스입니다. 매시간 데이터를 업데이트합니다.`,
        },
      },
      {
        '@type': 'Question',
        name: '어떤 골프장을 조회할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${getRegionCitySummary()} 지역의 ${getScraperCount()}개 이상 골프장을 지원합니다.`,
        },
      },
      {
        '@type': 'Question',
        name: '이용 요금이 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'GolfShin은 완전 무료 서비스입니다. 회원가입 없이도 티타임 조회가 가능하며, 즐겨찾기 기능을 사용하려면 로그인이 필요합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '티타임 정보는 얼마나 자주 업데이트되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '각 골프장의 예약 시스템에서 매시간 데이터를 자동 수집하여, 거의 실시간에 가까운 티타임 정보를 제공합니다.',
        },
      },
    ],
  };
}

export function getAllSchemas() {
  return [getWebSiteSchema(), getWebApplicationSchema(), getFAQPageSchema()];
}
