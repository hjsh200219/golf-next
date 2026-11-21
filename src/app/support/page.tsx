import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '지원 | GolfShin',
  description: '골프신(GolfShin) 문의 및 지원 안내',
  alternates: { canonical: '/support' },
};

const EMAIL = 'ho.shin@shconsulting.ai';

export default function SupportPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">지원</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">
          골프신(GolfShin)은 여러 골프장의 티타임과 가격을 한곳에서 조회하는 서비스입니다. 웹(golfshin.vercel.app)과 iOS 앱에서
          이용할 수 있습니다.
        </p>
      </header>
      <section aria-labelledby="contact">
        <h2 id="contact" className="text-lg font-bold text-gray-900">문의</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          오류 제보, 골프장 추가 요청, 데이터 삭제 요청은 이메일로 보내 주세요:{' '}
          <a href={`mailto:${EMAIL}`} className="text-golf-primary underline">{EMAIL}</a>
        </p>
        <p className="mt-2 text-sm text-gray-500">티타임은 각 골프장 사이트의 공개 정보를 주기적으로 수집한 것이라 실제 예약 가능 여부와 다를 수 있습니다. 예약은 골프장 홈페이지에서 확인해 주세요.</p>
      </section>
      <p className="text-sm">
        <Link href="/privacy" className="text-golf-primary underline">개인정보처리방침</Link>
      </p>
    </article>
  );
}
