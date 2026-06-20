import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '텔레그램 알림봇 | GolfShin',
  description:
    '원하는 골프장·날짜·시간대를 등록하면 빈자리가 나는 즉시 텔레그램으로 알려드려요. @golfshinbot에서 무료로 이용할 수 있어요.',
};

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

const COMMANDS = [
  { cmd: '/watch', desc: '빈자리 알림 등록' },
  { cmd: '/list', desc: '등록한 알림 보기' },
  { cmd: '/stop', desc: '알림 삭제' },
  { cmd: '/cancel', desc: '진행 중 설정 취소' },
  { cmd: '/help', desc: '도움말' },
];

const STEPS = [
  '위 버튼으로 @golfshinbot 을 열고 시작을 눌러요.',
  '/watch 입력 후 골프장 → 날짜 → 시간대를 차례로 선택해요.',
  '등록 끝. 매시간 빈자리를 확인해 자리가 나면 바로 알려드려요.',
];

export default function ChatbotPage() {
  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">텔레그램 빈자리 알림봇</h1>
        <p className="mt-1 text-sm text-gray-500">
          원하는 골프장·날짜·시간대를 등록하면 빈자리가 나는 즉시 텔레그램으로 알려드려요.
          누구나 무료로 사용할 수 있어요.
        </p>
      </div>

      {/* CTA */}
      <a
        href="https://t.me/golfshinbot"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white spring-hover shadow-btn hover:shadow-btn-hover hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#229ED9]"
        style={{ background: 'linear-gradient(135deg, #229ED9 0%, #1a8bc2 100%)' }}
      >
        <TelegramIcon className="h-5 w-5 shrink-0" />
        텔레그램에서 봇 열기
      </a>

      {/* Steps */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">이렇게 사용하세요</h2>
        <ol className="space-y-3 pl-0 list-none">
          {STEPS.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: '#15803d' }}
              >
                {i + 1}
              </span>
              <span className="text-sm text-gray-600 leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Commands */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">명령어</h2>
        <dl className="space-y-2">
          {COMMANDS.map(({ cmd, desc }) => (
            <div key={cmd} className="flex items-center gap-3">
              <dt>
                <code className="inline-block rounded-lg bg-golf-surface-hover px-2.5 py-1 text-xs font-mono font-semibold text-golf-primary border border-golf-muted/30">
                  {cmd}
                </code>
              </dt>
              <dd className="text-sm text-gray-600">{desc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
