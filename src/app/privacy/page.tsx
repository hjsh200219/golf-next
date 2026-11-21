import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침 | GolfShin',
  description: '골프신(GolfShin) 웹 서비스와 iOS 앱의 개인정보 처리 방침',
  alternates: { canonical: '/privacy' },
};

const EMAIL = 'ho.shin@shconsulting.ai';

function Mail() {
  return (
    <a href={`mailto:${EMAIL}`} className="text-golf-primary underline">
      {EMAIL}
    </a>
  );
}

const H2 = 'text-lg font-bold text-gray-900';
const UL = 'mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700';

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">개인정보처리방침</h1>
        <p className="mt-1 text-sm text-gray-500">시행일: 2026-11-21 · 운영: SH Consulting</p>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">
          골프신(GolfShin)은 골프장 티타임을 한곳에서 조회하는 서비스입니다. 이 방침은 웹 서비스(golfshin.vercel.app)와
          iOS 앱이 어떤 정보를 다루는지 설명합니다.
        </p>
      </header>

      <section aria-labelledby="web">
        <h2 id="web" className={H2}>1. 웹 서비스</h2>

        <h3 className="mt-4 text-sm font-semibold text-gray-900">저장하는 정보</h3>
        <ul className={UL}>
          <li>
            로그인 사용자: Supabase 인증 계정(Google 로그인 또는 이메일 인증 링크로 만든 계정의 이메일·계정 식별자)과 즐겨찾기
            골프장 목록(user_favorites 테이블).
          </li>
          <li>
            비로그인 사용자: 브라우저에 만든 임의의 기기 식별 UUID(localStorage, golf_device_id)와 이 UUID에 연결된 즐겨찾기
            골프장 목록(device_favorites 테이블). 이름·연락처와 연결되지 않으며 브라우저 데이터를 지우면 새 UUID가 만들어집니다.
          </li>
          <li>
            텔레그램 빈자리 알림: 알림을 등록한 경우에 한해 텔레그램 채팅 ID와 알림 조건(골프장·날짜·시간대·상태)을 저장합니다.
            알림을 삭제하면 활성 조건이 중지됩니다.
          </li>
          <li>
            날씨 캐시: 골프장 좌표를 격자 코드(geohash)로 묶어 날씨 응답을 일정 시간 보관합니다. 개인 정보가 아닙니다.
          </li>
          <li>티타임 정보: 각 골프장 사이트에 공개된 티타임·가격을 수집한 공개 데이터이며 개인정보가 아닙니다.</li>
        </ul>

        <h3 className="mt-4 text-sm font-semibold text-gray-900">분석 도구</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          방문 통계를 위해 Google Analytics 4(측정 ID G-XGF7QPQ338)를 사용합니다. Google이 쿠키와 접속 정보(IP, 기기·브라우저
          정보, 이용 페이지)를 처리합니다. 브라우저의 쿠키 차단 또는 Google의 차단 확장으로 거부할 수 있습니다.
        </p>

        <h3 className="mt-4 text-sm font-semibold text-gray-900">정보를 받는 외부 서비스</h3>
        <ul className={UL}>
          <li>Supabase: 계정·즐겨찾기·알림 조건·티타임 데이터 저장(데이터베이스·인증).</li>
          <li>Vercel: 웹 서비스 호스팅과 서버 실행. 접속 로그(IP 등)가 처리될 수 있습니다.</li>
          <li>Google Maps: 지도 표시. 지도를 열면 브라우저가 Google에 직접 접속합니다.</li>
          <li>OpenWeatherMap: 날씨 조회. 서버가 골프장 좌표만 보내며 사용자 정보는 보내지 않습니다.</li>
          <li>Telegram: 알림을 쓰는 경우 알림 메시지 전달.</li>
          <li>Google Analytics: 위 분석 도구.</li>
        </ul>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          개인정보를 판매하거나 광고 목적으로 제3자에게 제공하지 않습니다.
        </p>

        <h3 className="mt-4 text-sm font-semibold text-gray-900">보관과 삭제</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          계정·즐겨찾기·알림 정보는 삭제를 요청할 때까지 보관합니다. 즐겨찾기는 설정 화면에서 직접 지울 수 있고, 계정·기기 UUID·
          텔레그램 알림 정보의 삭제는 아래 이메일로 요청하면 확인 후 지체 없이 삭제합니다.
        </p>
      </section>

      <section aria-labelledby="ios">
        <h2 id="ios" className={H2}>2. 골프신(GolfShin) iOS 앱</h2>
        <ul className={UL}>
          <li>앱에는 계정·로그인이 없습니다.</li>
          <li>이름·이메일·위치·연락처 등 개인정보를 수집하지 않으며 기기에서 서버로 보내지 않습니다.</li>
          <li>사용자를 추적하지 않으며 광고 식별자나 분석·광고 SDK를 쓰지 않습니다.</li>
          <li>앱은 공개된 티타임 정보를 얻기 위해 golfshin.vercel.app의 API만 호출합니다.</li>
          <li>골프장 홈페이지 바로가기는 기기의 브라우저에서 열립니다. 이동한 사이트의 정보 처리는 해당 사이트의 방침을 따릅니다.</li>
          <li>지도는 Apple 지도를 사용합니다.</li>
        </ul>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          서버는 일반적인 호스팅 접속 로그(IP, 요청 시각)를 Vercel에서 처리할 수 있으나 앱 사용자를 식별하는 용도로 쓰지 않습니다.
        </p>
      </section>

      <section aria-labelledby="rights">
        <h2 id="rights" className={H2}>3. 문의와 권리 행사</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          열람·정정·삭제 요청과 개인정보 관련 문의는 <Mail />로 보내 주세요. 방침이 바뀌면 이 페이지에 시행일과 함께 게시합니다.
        </p>
      </section>
    </article>
  );
}
