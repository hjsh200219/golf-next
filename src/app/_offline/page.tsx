import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '오프라인 | GolfShin',
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-6 text-6xl">⛳</div>
      <h1 className="mb-3 text-2xl font-bold text-gray-900">오프라인 상태입니다</h1>
      <p className="mb-6 text-gray-600">
        인터넷 연결을 확인하고 다시 시도해주세요.
      </p>
      <a
        href="/"
        className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700"
      >
        홈으로 돌아가기
      </a>
    </div>
  );
}
