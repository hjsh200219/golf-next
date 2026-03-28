const SITE_NAME = '골프 예약 조회 | GolfShin';
const SITE_URL = 'https://golfshin.com';
const SITE_DESCRIPTION =
  '실시간 골프장 티타임 예약 조회 — 30개+ 골프장, 매시간 업데이트';

export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
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
    description: SITE_DESCRIPTION,
    applicationCategory: 'SportsApplication',
    operatingSystem: 'Web',
    inLanguage: 'ko',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    featureList:
      '실시간 티타임 조회 (매시간 업데이트), 날짜·시간대·가격 필터링, 경기북부·경기남부·강원·인천·충청 5개 권역, 골프장별 48시간 날씨 예보, 즐겨찾기 기능',
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
          text: 'GolfShin(골프신)은 한국 수도권 및 강원·충청 지역 30개 이상 골프장의 티타임 예약 가능 현황을 실시간으로 조회할 수 있는 무료 웹 서비스입니다. 매시간 데이터를 업데이트합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '어떤 골프장을 조회할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '경기 북부(포천, 양주, 가평 등), 경기 남부(용인, 안성, 이천 등), 강원(춘천, 홍천, 원주 등), 인천(영종, 강화), 충청(당진, 음성) 지역의 30개 이상 골프장을 지원합니다.',
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
